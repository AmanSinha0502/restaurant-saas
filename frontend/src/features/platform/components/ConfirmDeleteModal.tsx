// src/components/platform/modals/ConfirmDeleteModal.tsx
import React from 'react';
import { MotionBackdrop, MotionCard } from './MotionModal';
import { toast } from 'react-hot-toast';
import type { Owner } from '../../../types';

export default function ConfirmDeleteModal({ open, onClose, owner, onConfirm }: { open:boolean; onClose:()=>void; owner:Owner | null; onConfirm:(id:string)=>Promise<void> }) {
  if (!open || !owner) return null;

  const confirm = async () => {
    try {
      await onConfirm(owner._id);
      toast.success('Owner deleted');
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to delete');
    }
  };

  return (
    <MotionBackdrop onClick={onClose}>
      <MotionCard>
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Delete Owner</h3>
          <div className="tiny muted">This will soft-delete the owner. This action can be reversed by support.</div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-1 border rounded" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={async ()=>{ await confirm(); onClose(); }}>Delete</button>
        </div>
      </MotionCard>
    </MotionBackdrop>
  );
}
