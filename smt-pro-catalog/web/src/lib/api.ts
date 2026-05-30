import axios, { AxiosRequestConfig, AxiosError } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export const api = axios.create({
  baseURL:        `${BASE}/api`,
  timeout:        30_000,
  headers:        { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('daraliraq_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error messages + auto-logout on token expiry
api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ message?: string }>) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('daraliraq_token');
      localStorage.removeItem('daraliraq_user');
      window.location.href = '/login';
    }
    const message = err.response?.data?.message ?? err.message ?? 'Request failed';
    return Promise.reject(new Error(message));
  },
);

export const fetcher = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  api.get<{ data: T }>(url, config).then((r) => r.data.data);
