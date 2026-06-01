import { Request } from 'express';

export interface JwtPayload {
  id: number;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user: JwtPayload; // guaranteed non-null after protect middleware
}

export interface PaginationParams {
  page?: number | string;
  limit?: number | string;
}

export interface PaginatedResult<T> {
  total: number;
  page: number;
  limit: number;
}

export interface UploadResult {
  url: string;
  publicId: string;
}

export type UserRole = 'super_admin' | 'admin' | 'employee' | 'customer';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export interface ApiError extends Error {
  status?: number;
}
