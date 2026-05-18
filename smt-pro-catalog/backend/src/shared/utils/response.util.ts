import { Response } from 'express';

export const success = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200,
): Response =>
  res.status(statusCode).json({ status: 'success', message, data });

export const error = (
  res: Response,
  message = 'Something went wrong',
  statusCode = 500,
): Response =>
  res.status(statusCode).json({ status: 'error', message });
