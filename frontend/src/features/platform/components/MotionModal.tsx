// src/components/platform/MotionModal.tsx
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import React from 'react';

const backdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 }
};

const card: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.99 }
};

export const MotionBackdrop: React.FC<{ children: React.ReactNode; onClick?: () => void }> = ({ children, onClick }) => (
  <motion.div
    className="modal-backdrop"
    variants={backdrop}
    initial="hidden"
    animate="visible"
    exit="hidden"
    onClick={onClick}
  >
    {children}
  </motion.div>
);

export const MotionCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <motion.div
    className={`modal-card glass card glass-outline ${className}`}
    variants={card}
    initial="hidden"
    animate="visible"
    exit="exit"
    transition={{ duration: 0.3, ease: 'easeOut' }}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </motion.div>
);
