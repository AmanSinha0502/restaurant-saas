// src/services/api/client.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const client = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // keep this if backend uses cookies too
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token from localStorage on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token && config && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
