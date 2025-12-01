// src/services/platform.services.ts
import client from './api/client';
import type { Owner, PlatformStats } from '../types';

export const getPlatformStats = async (): Promise<PlatformStats> => {
  const res = await client.get<{ stats: PlatformStats }>('/api/platform/stats');
  return res.data.stats; // return cleanly typed stats data
};

export interface GetOwnersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetOwnersResponse {
  data: Owner[];
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

export const getAllOwners = async (params?: GetOwnersParams): Promise<Owner[]> => {
  const res = await client.get<{ data: Owner[] }>('/api/platform/owners', { params });
  return res.data.data || res.data as any;
};

export interface CreateOwnerPayload {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

export const createOwner = async (payload: CreateOwnerPayload) => {
  const res = await client.post('/api/platform/owners', payload);
  return res.data;
};

export interface UpdateOwnerPayload {
  fullName?: string;
  email?: string;
  phone?: string;
}

export const updateOwner = async (id: string, payload: UpdateOwnerPayload) => {
  const res = await client.put(`/api/platform/owners/${id}`, payload);
  return res.data;
};

export const toggleOwnerStatus = async (id: string, isActive: boolean) => {
  const res = await client.patch(`/api/platform/owners/${id}/status`, { isActive });
  return res.data;
};

export interface ResetPasswordPayload {
  newPassword: string;
}

export const resetOwnerPassword = async (id: string, newPassword: string) => {
  const res = await client.post(`/api/platform/owners/${id}/reset-password`, { newPassword });
  return res.data;
};

export const deleteOwner = async (id: string) => {
  const res = await client.delete(`/api/platform/owners/${id}`);
  return res.data;
};

export const getOwnerById = async (id: string): Promise<Owner> => {
  const res = await client.get<{ owner: Owner }>(`/api/platform/owners/${id}`);
  return res.data.owner;
};
