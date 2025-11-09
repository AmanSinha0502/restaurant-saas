/**
 * Standardized API Response Helper
 * Ensures consistent response format across all endpoints
 */

class ResponseHelper {
  /**
   * Success Response
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {String} message - Success message
   * @param {Object} data - Response data
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    const response = {
      success: true,
      message,
      ...(data && { data })
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Error Response
   * @param {Object} res - Express response object
   * @param {Number} statusCode - HTTP status code
   * @param {String} message - Error message
   * @param {Object} errors - Detailed error object
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const response = {
      success: false,
      message,
      ...(errors && { errors })
    };
    
    return res.status(statusCode).json(response);
  }

  /**
   * Validation Error Response
   * @param {Object} res - Express response object
   * @param {Object} errors - Validation errors
   */
  static validationError(res, errors) {
    return this.error(res, 400, 'Validation Error', errors);
  }

  /**
   * Unauthorized Response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, 401, message);
  }

  /**
   * Forbidden Response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, 403, message);
  }

  /**
   * Not Found Response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static notFound(res, message = 'Resource not found') {
    return this.error(res, 404, message);
  }

  /**
   * Created Response
   * @param {Object} res - Express response object
   * @param {String} message - Success message
   * @param {Object} data - Created resource data
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return this.success(res, 201, message, data);
  }

  /**
   * Paginated Response
   * @param {Object} res - Express response object
   * @param {Array} data - Array of data
   * @param {Number} page - Current page
   * @param {Number} limit - Items per page
   * @param {Number} total - Total items
   */
  static paginated(res, data, page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    
    const response = {
      success: true,
      data,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };
    
    return res.status(200).json(response);
  }
}

module.exports = ResponseHelper;