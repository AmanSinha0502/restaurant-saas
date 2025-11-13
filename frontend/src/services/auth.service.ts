// src/services/auth.service.ts
import client from './api/client';


export const platformLogin = (payload: { email: string; password: string }) =>
  client.post('/api/platform/login', payload);

export const ownerLogin = (payload: { email: string; password: string }) =>
  client.post('/api/owner/login', payload);

export const customerLogin = (payload: { email: string; password: string }) =>
  client.post('/api/customer/login', payload);
export const me = (role?: string) => {
  if (role === 'superadmin') return client.get('api/platform/me');
  return client.get('/api/auth/me');
};
export const logout = () => client.post('/api/auth/logout');
