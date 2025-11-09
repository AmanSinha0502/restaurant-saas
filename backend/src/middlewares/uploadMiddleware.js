const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ResponseHelper = require('../utils/responseHelper');
const logger = require('../utils/logger');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Configure storage (local disk storage)
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create subdirectories based on file type
    let subDir = 'others';
    
    if (file.mimetype.startsWith('image/')) {
      subDir = 'images';
    } else if (file.mimetype === 'application/pdf') {
      subDir = 'documents';
    }
    
    const destPath = path.join(uploadDir, subDir);
    
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50);
    
    cb(null, `${basename}-${uniqueSuffix}${ext}`);
  }
});

/**
 * File filter to validate file types
 */
const fileFilter = (allowedTypes = []) => {
  return (req, file, cb) => {
    if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`), false);
    }
  };
};

/**
 * Configure Multer
 */
const createUploader = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
    fieldName = 'file',
    multiple = false,
    maxCount = 10
  } = options;
  
  const upload = multer({
    storage,
    fileFilter: fileFilter(allowedTypes),
    limits: {
      fileSize: maxSize,
      files: maxCount
    }
  });
  
  if (multiple) {
    return upload.array(fieldName, maxCount);
  } else {
    return upload.single(fieldName);
  }
};

/**
 * Image Upload Middleware
 * Accepts single image
 */
const uploadImage = createUploader({
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  fieldName: 'image',
  multiple: false
});

/**
 * Multiple Images Upload Middleware
 * Accepts up to 10 images
 */
const uploadImages = createUploader({
  maxSize: 5 * 1024 * 1024, // 5MB per image
  allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  fieldName: 'images',
  multiple: true,
  maxCount: 10
});

/**
 * Document Upload Middleware
 * Accepts PDF, DOCX, etc.
 */
const uploadDocument = createUploader({
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  fieldName: 'document',
  multiple: false
});

/**
 * Handle Multer Errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return ResponseHelper.error(res, 400, 'File too large. Maximum size is 5MB');
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return ResponseHelper.error(res, 400, 'Too many files. Maximum is 10 files');
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return ResponseHelper.error(res, 400, 'Unexpected file field');
    }
    
    return ResponseHelper.error(res, 400, err.message);
  } else if (err) {
    // Custom errors (from fileFilter)
    return ResponseHelper.error(res, 400, err.message);
  }
  
  next();
};

/**
 * Delete uploaded file(s)
 * Call this in catch blocks to cleanup on error
 */
const deleteUploadedFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted file: ${filePath}`);
    }
  } catch (error) {
    logger.error(`Failed to delete file ${filePath}:`, error);
  }
};

const deleteUploadedFiles = (files) => {
  if (!files) return;
  
  const fileArray = Array.isArray(files) ? files : [files];
  
  fileArray.forEach(file => {
    if (file && file.path) {
      deleteUploadedFile(file.path);
    }
  });
};

/**
 * Cleanup old uploaded files (cron job helper)
 * Delete files older than specified days
 */
const cleanupOldFiles = (directory, daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const files = fs.readdirSync(directory);
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    logger.info(`Cleanup: Deleted ${deletedCount} old files from ${directory}`);
    return deletedCount;
  } catch (error) {
    logger.error(`Cleanup error in ${directory}:`, error);
    return 0;
  }
};

/**
 * Get file URL helper
 * Convert local file path to accessible URL
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  
  // Remove base upload directory from path
  const relativePath = filePath.replace(uploadDir, '').replace(/\\/g, '/');
  
  // Generate URL (assumes files are served from /uploads route)
  return `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads${relativePath}`;
};

/**
 * Validate image dimensions
 * Middleware to check image width/height after upload
 */
const validateImageDimensions = (minWidth = 0, minHeight = 0, maxWidth = 5000, maxHeight = 5000) => {
  return async (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }
    
    const sharp = require('sharp'); // Install: npm install sharp
    
    try {
      const files = req.files || [req.file];
      
      for (let file of files) {
        if (file.mimetype.startsWith('image/')) {
          const metadata = await sharp(file.path).metadata();
          
          if (metadata.width < minWidth || metadata.height < minHeight) {
            deleteUploadedFiles(files);
            return ResponseHelper.error(res, 400, 
              `Image dimensions too small. Minimum: ${minWidth}x${minHeight}px`
            );
          }
          
          if (metadata.width > maxWidth || metadata.height > maxHeight) {
            deleteUploadedFiles(files);
            return ResponseHelper.error(res, 400, 
              `Image dimensions too large. Maximum: ${maxWidth}x${maxHeight}px`
            );
          }
        }
      }
      
      next();
    } catch (error) {
      logger.error('Image validation error:', error);
      deleteUploadedFiles(req.files || req.file);
      return ResponseHelper.error(res, 400, 'Failed to validate image');
    }
  };
};

/**
 * Compress and optimize uploaded images
 */
const optimizeImages = async (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }
  
  const sharp = require('sharp');
  
  try {
    const files = req.files || [req.file];
    
    for (let file of files) {
      if (file.mimetype.startsWith('image/')) {
        const optimizedPath = file.path.replace(/\.[^.]+$/, '-optimized.jpg');
        
        await sharp(file.path)
          .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(optimizedPath);
        
        // Replace original with optimized
        fs.unlinkSync(file.path);
        fs.renameSync(optimizedPath, file.path);
        
        logger.info(`Optimized image: ${file.filename}`);
      }
    }
    
    next();
  } catch (error) {
    logger.error('Image optimization error:', error);
    // Continue even if optimization fails
    next();
  }
};

module.exports = {
  uploadImage,
  uploadImages,
  uploadDocument,
  createUploader,
  handleUploadError,
  deleteUploadedFile,
  deleteUploadedFiles,
  cleanupOldFiles,
  getFileUrl,
  validateImageDimensions,
  optimizeImages
};