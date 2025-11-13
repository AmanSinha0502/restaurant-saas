import React, { createContext, useContext, useEffect, useState } from 'react';
import * as authAPI from '../services/auth.service';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export interface User {
  id: string;
  fullName?: string;
  email?: string;
  role?: 'superadmin' | 'owner' | 'customer';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (payload: {
    email: string;
    password: string;
    role: 'superadmin' | 'owner' | 'customer';
  }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ load user info
const loadUser = async (role?: 'superadmin' | 'owner' | 'customer') => {
  try {
    const res = await authAPI.me(role);

    // FIX: extract backend user correctly
    const actualUser = res.data?.data?.user;

    console.log("🧠 parsed user:", actualUser);

    setUser(actualUser || null);
  } catch (err: any) {
    console.error('🚫 /me failed:', err.response?.data || err.message);
    setUser(null);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    loadUser();
  }, []);

  // ✅ unified login
  const login = async (payload: { email: string; password: string; role: 'superadmin' | 'owner' | 'customer' }) => {
    try {
      let response;

      if (payload.role === 'superadmin') {
        response = await authAPI.platformLogin(payload);
      } else if (payload.role === 'owner') {
        response = await authAPI.ownerLogin(payload);
      } else {
        response = await authAPI.customerLogin(payload);
      }

      // ✅ store accessToken in localStorage
      const token = response.data?.data?.accessToken || response.data?.accessToken;
      if (token) {
        localStorage.setItem('accessToken', token);
      }

      toast.success('Login successful');

      // ✅ load user after saving token
      await loadUser(payload.role);

      setTimeout(() => {
        if (payload.role === 'superadmin') {
          navigate('/platform');
        } else if (payload.role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/customer/dashboard');
        }
      }, 300);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
      localStorage.removeItem('accessToken'); // ✅ remove token
      setUser(null);
      toast.success('Logged out');
      navigate('/login');
    } catch {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
