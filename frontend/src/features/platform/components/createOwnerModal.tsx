// src/components/platform/modals/CreateOwnerModal.tsx
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotionBackdrop, MotionCard } from './MotionModal';
import { toast } from 'react-hot-toast';

const schema = z.object({
  fullName: z.string().min(2, 'Owner name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Phone too short').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number')
});

type FormValues = z.infer<typeof schema>;

export default function CreateOwnerModal({ open, onClose, onCreate }: { open:boolean; onClose:()=>void; onCreate:(payload:any)=>Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName:'', email:'', phone:'', password:'' }
  });

  if (!open) return null;

  const submit = async (data: FormValues) => {
    try {
      await onCreate(data);
      toast.success('Owner created successfully');
      reset();
      onClose();
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to create owner');
    }
  };

 return (
  <MotionBackdrop onClick={onClose}>
    <MotionCard
      className="relative w-full max-w-lg rounded-2xl p-8 shadow-[0_0_50px_rgba(255,215,0,0.15)] 
                 bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10"
    >
      <div onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-semibold text-white tracking-wide">
          Create Restaurant Owner
        </h3>

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl transition-all"
        >
          ✕
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-5">

        {/* Owner Name */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Owner Full Name</label>
          <input
            {...register('fullName')}
            placeholder="Enter owner full name"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.fullName && (
            <p className="tiny text-red-400 mt-1">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Email</label>
          <input
            {...register('email')}
            placeholder="Enter owner email"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.email && (
            <p className="tiny text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Phone (optional)</label>
          <input
            {...register('phone')}
            placeholder="Phone Number"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.phone && (
            <p className="tiny text-red-400 mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Password</label>
          <input
            {...register('password')}
            type="password"
            placeholder="Minimum 8 characters, 1 uppercase, 1 number"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.password && (
            <p className="tiny text-red-400 mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="px-4 py-2 rounded-lg text-gray-300 border border-white/10 
                       hover:bg-white/10 transition-all"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-yellow-300 
                       text-black font-semibold shadow-[0_0_20px_rgba(255,215,0,0.35)] 
                       hover:shadow-[0_0_30px_rgba(255,215,0,0.55)] transition-all"
          >
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
        </div>

      </form>
      </div>
    </MotionCard>
  </MotionBackdrop>
);

}
