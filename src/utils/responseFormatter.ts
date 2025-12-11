import { Response } from 'express';

interface ApiResponse {
  success: boolean;
  message: string;
  data: any | null;
  error: {
    code?: string;
    details?: string | null;
  } | null;
}

export const formatSuccess = (res: Response, message: string, data: any, statusCode: number = 200) => {
  const response: ApiResponse = {
    success: true,
    message,
    data,
    error: null,
  };
  return res.status(statusCode).json(response);
};

export const formatError = (res: Response, message: string, details: string | null = null, statusCode: number = 500, code?: string) => {
  const response: ApiResponse = {
    success: false,
    message,
    data: null,
    error: {
      code,
      details,
    },
  };
  return res.status(statusCode).json(response);
};
