// src/components/platform/ModuleCard.tsx
import React from 'react';
import { motion } from 'framer-motion';

export default function ModuleCard({ title, subtitle, icon }: { title:string; subtitle?:string; icon?:React.ReactNode }) {
  return (
    <motion.div
      className="module card p-4 rounded-xl flex items-center gap-4 glass"
      whileHover={{ translateY: -6, boxShadow: '0 12px 40px rgba(0,0,0,0.6)' }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(180deg, rgba(255,215,0,0.12), rgba(255,215,0,0.04))' }}>
        {icon ?? <div className="text-xl">★</div>}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="tiny muted">{subtitle}</div>
      </div>
    </motion.div>
  );
}
