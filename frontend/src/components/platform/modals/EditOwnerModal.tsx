// src/components/platform/modals/EditOwnerModal.tsx
import React, { useEffect } from 'react';
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

export default function EditOwnerModal({ open, onClose, owner, onUpdate }: { open:boolean; onClose:()=>void; owner:Owner | null; onUpdate:(id:string,payload:any)=>Promise<void> }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { businessName:'', email:'', phone:'', country:'', address:'' }
  });

  useEffect(() => {
    if (owner) {
      reset({
        businessName: owner.businessName ?? '',
        email: owner.email ?? '',
        phone: owner.phone ?? '',
        country: owner.country ?? '',
        address: owner.address ?? ''
      });
    }
  }, [owner, reset]);

  if (!open || !owner) return null;

  const submit = async (data: FormValues) => {
    try {
      await onUpdate(owner._id, data);
      toast.success('Owner updated');
    } catch (err:any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to update owner');
    }
  };

  return (
    <MotionBackdrop onClick={onClose}>
      <MotionCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Edit Owner</h3>
          <button onClick={onClose} className="tiny muted">✕</button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="grid grid-cols-1 gap-3">
          <input {...register('businessName')} placeholder="Business Name" />
          {errors.businessName && <div className="tiny destructive">{errors.businessName.message}</div>}

          <input {...register('email')} placeholder="Email" />
          {errors.email && <div className="tiny destructive">{errors.email.message}</div>}

          <input {...register('phone')} placeholder="Phone (optional)" />
          {errors.phone && <div className="tiny destructive">{errors.phone.message}</div>}

          <input {...register('country')} placeholder="Country" />
          {errors.country && <div className="tiny destructive">{errors.country.message}</div>}

          <textarea {...register('address')} placeholder="Address" />
          {errors.address && <div className="tiny destructive">{errors.address.message}</div>}

          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="px-3 py-1 border rounded" onClick={() => { reset(); onClose(); }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </MotionCard>
    </MotionBackdrop>
  );
}
