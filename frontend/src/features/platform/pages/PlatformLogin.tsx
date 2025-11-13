import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../../contexts/ThemeContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; // ✅ added for redirect

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function PlatformLogin() {
  const { dark, toggle } = useTheme();
  const { login, user } = useAuth(); // ✅ include user
  const navigate = useNavigate(); // ✅ for redirect

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: any) => {
    try {
      await login({ ...data, role: 'superadmin' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  // ✅ redirect when user role becomes superadmin
useEffect(() => {
  console.log("👀 user inside useEffect:", user);
  if (user?.role === 'superadmin') {
    console.log("🚀 Redirecting to /platform now...");
    navigate('/platform', { replace: true });
  }
}, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card glass p-8 w-full max-w-md rounded-xl shadow-lg relative"
      >
        <button
          onClick={toggle}
          className="absolute top-4 right-4 px-2 py-1 text-xs border rounded"
        >
          {dark ? 'Light' : 'Dark'}
        </button>

        <h1 className="text-2xl font-bold mb-2 text-center">Super Admin Login</h1>
        <p className="tiny muted mb-6 text-center">
          Access Platform Management Panel
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              {...register('email')}
              placeholder="Email"
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
            {errors.email && (
              <p className="tiny destructive mt-1">{errors.email.message}</p>
            )}
          </div>
          <div>
            <input
              {...register('password')}
              type="password"
              placeholder="Password"
              className="w-full border rounded px-3 py-2 bg-transparent"
            />
            {errors.password && (
              <p className="tiny destructive mt-1">{errors.password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full mt-4 py-2 font-semibold"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
