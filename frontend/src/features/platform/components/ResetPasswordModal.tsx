// src/components/platform/modals/ResetPasswordModal.tsx
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotionBackdrop, MotionCard } from './MotionModal';
import { toast } from 'react-hot-toast';
import type { Owner } from '../../../types';

const schema = z.object({
  password: z.string().min(8, 'Password must be 8+ chars').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  confirm: z.string()
}).refine((data) => data.password === data.confirm, { message: "Passwords don't match", path: ['confirm'] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordModal({ open, onClose, owner, onReset }: { open:boolean; onClose:()=>void; owner:Owner | null; onReset:(id:string,payload:any)=>Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password:'', confirm:'' }
  });

  if (!open || !owner) return null;

  const submit = async (data: FormValues) => {
    try {
      await onReset(owner._id, { password: data.password });
      toast.success('Password reset successfully');
      reset();
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to reset password');
    }
  };

  return (
    <MotionBackdrop onClick={onClose}>
      <MotionCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Reset Owner Password</h3>
          <button onClick={onClose} className="tiny muted">✕</button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="grid gap-3">
          <input {...register('password')} type="password" placeholder="New password (8+ chars, 1 uppercase, 1 number)" />
          {errors.password && <div className="tiny destructive">{errors.password.message}</div>}

          <input {...register('confirm')} type="password" placeholder="Confirm password" />
          {errors.confirm && <div className="tiny destructive">{errors.confirm.message}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="px-3 py-1 border rounded" onClick={() => { reset(); onClose(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Resetting...' : 'Reset'}</button>
          </div>
        </form>
      </MotionCard>
    </MotionBackdrop>
  );
}
