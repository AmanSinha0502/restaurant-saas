// src/services/platform.service.ts
import client from './api/client';
import type { Owner } from '../types';

export interface PlatformStats {
  totalOwners: number;
  totalRevenue: number;
  newOwners30d: number;
}

export const getPlatformStats = async () => {
  const res = await client.get<{ data: PlatformStats }>('/api/platform/stats');
  return res.data.data; // return cleanly typed data
};

export const getAllOwners = async () => {
  const res = await client.get<{ owners: Owner[] }>('/api/platform/owners');
  return res.data; // returns { owners: [...] }
};

export const createOwner = async (payload: any) => {
  const res = await client.post('/api/platform/owners', payload);
  return res.data;
};

export const updateOwner = async (id: string, payload: any) => {
  const res = await client.put(`/api/platform/owners/${id}`, payload);
  return res.data;
};

export const toggleOwnerStatus = async (id: string, status: { active: boolean }) => {
  const res = await client.patch(`/api/platform/owners/${id}/status`, status);
  return res.data;
};

export const resetOwnerPassword = async (id: string, payload: any) => {
  const res = await client.post(`/api/platform/owners/${id}/reset-password`, payload);
  return res.data;
};

export const deleteOwner = async (id: string) => {
  const res = await client.delete(`/api/platform/owners/${id}`);
  return res.data;
};
