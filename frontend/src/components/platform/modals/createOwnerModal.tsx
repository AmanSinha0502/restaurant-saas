// src/components/platform/modals/CreateOwnerModal.tsx
import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MotionBackdrop, MotionCard } from '../MotionModal';
import { toast } from 'react-hot-toast';
import type { Owner } from '../../../types';

const schema = z.object({
  businessName: z.string().min(2, 'Business name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(7, 'Phone too short').optional().or(z.literal('')),
  country: z.string().min(2, 'Country required'),
  address: z.string().min(5, 'Address is short')
});

type FormValues = z.infer<typeof schema>;

export default function CreateOwnerModal({ open, onClose, onCreate }: { open:boolean; onClose:()=>void; onCreate:(payload:any)=>Promise<void> }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { businessName:'', email:'', phone:'', country:'', address:'' }
  });

  if (!open) return null;

  const submit = async (data: FormValues) => {
    try {
      await onCreate(data);
      toast.success('Owner created successfully');
      reset();
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

        {/* Business Name */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Business Owner Name</label>
          <input
            {...register('businessName')}
            placeholder="Enter business owner name"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.businessName && (
            <p className="tiny text-red-400 mt-1">{errors.businessName.message}</p>
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

        {/* Country */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Country</label>
          <input
            {...register('country')}
            placeholder="Country"
            className="w-full rounded-lg px-4 py-2 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 focus:ring-0 transition-all"
          />
          {errors.country && (
            <p className="tiny text-red-400 mt-1">{errors.country.message}</p>
          )}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm text-gray-300 mb-1">Address</label>
          <textarea
            {...register('address')}
            placeholder="Complete address"
            className="w-full rounded-lg px-4 py-3 bg-white/10 text-white 
                       border border-white/20 focus:border-yellow-400 h-24 resize-none focus:ring-0 transition-all"
          />
          {errors.address && (
            <p className="tiny text-red-400 mt-1">{errors.address.message}</p>
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
