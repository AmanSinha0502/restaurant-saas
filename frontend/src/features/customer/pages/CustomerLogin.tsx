import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useTheme } from '../../../contexts/ThemeContext';
import * as authAPI from '../../../services/auth.service';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function CustomerLogin() {
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await authAPI.customerLogin(data);
      toast.success('Customer login successful');
      navigate('/customer/dashboard');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card glass p-8 w-full max-w-md rounded-xl shadow-lg relative"
      >
        <button onClick={toggle} className="absolute top-4 right-4 px-2 py-1 text-xs border rounded">
          {dark ? 'Light' : 'Dark'}
        </button>
        <h1 className="text-2xl font-bold mb-2 text-center">Customer Login</h1>
        <p className="tiny muted mb-6 text-center">Sign in to order food & manage your profile</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input {...register('email')} placeholder="Email" className="w-full border rounded px-3 py-2 bg-transparent" />
            {errors.email && <p className="tiny destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <input {...register('password')} type="password" placeholder="Password" className="w-full border rounded px-3 py-2 bg-transparent" />
            {errors.password && <p className="tiny destructive mt-1">{errors.password.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-4 py-2 font-semibold">
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
