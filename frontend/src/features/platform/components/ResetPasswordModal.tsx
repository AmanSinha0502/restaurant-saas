// src/components/platform/modals/ResetPasswordModal.tsx
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotionBackdrop, MotionCard } from './MotionModal';
import { toast } from 'react-hot-toast';
import type { Owner } from '../../../types';

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be 8+ chars').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  confirm: z.string()
}).refine((data) => data.newPassword === data.confirm, { message: "Passwords don't match", path: ['confirm'] });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordModal({ open, onClose, owner, onReset }: { open:boolean; onClose:()=>void; owner:Owner | null; onReset:(id:string, newPassword:string)=>Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword:'', confirm:'' }
  });

  if (!open || !owner) return null;

  const submit = async (data: FormValues) => {
    try {
      await onReset(owner._id, data.newPassword);
      toast.success('Password reset successfully');
      reset();
      onClose();
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to reset password');
    }
  };

  return (
    <MotionBackdrop onClick={onClose}>
      <MotionCard className="relative w-full max-w-lg rounded-2xl p-8 shadow-[0_0_50px_rgba(255,215,0,0.15)] 
                 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10">
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-white">Reset Owner Password</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">✕</button>
          </div>

          <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-5">
            <div>
              <label className="block text-sm text-gray-300 mb-1">New Password</label>
              <input {...register('newPassword')} type="password" placeholder="Minimum 8 characters, 1 uppercase, 1 number" className="w-full rounded-lg px-4 py-2 bg-white/10 text-white border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all" />
              {errors.newPassword && <p className="tiny text-red-400 mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-1">Confirm Password</label>
              <input {...register('confirm')} type="password" placeholder="Confirm password" className="w-full rounded-lg px-4 py-2 bg-white/10 text-white border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all" />
              {errors.confirm && <p className="tiny text-red-400 mt-1">{errors.confirm.message}</p>}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="px-4 py-2 rounded-lg text-gray-300 border border-white/10 hover:bg-white/10" onClick={() => { reset(); onClose(); }}>Cancel</button>
              <button type="submit" className="px-6 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-300 text-black font-semibold" disabled={isSubmitting}>{isSubmitting ? 'Resetting...' : 'Reset'}</button>
            </div>
          </form>
        </div>
      </MotionCard>
    </MotionBackdrop>
  );
}
