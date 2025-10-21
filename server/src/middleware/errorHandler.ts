import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { config } from '../config.js';

/**
 * Error handling middleware
 * Converts errors to JSON responses
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err.message);

  // Handle Multer errors
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: `File size exceeds limit of ${config.upload.maxFileMB}MB`,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: 'Too many files uploaded',
      });
      return;
    }
    res.status(400).json({
      error: `Upload error: ${err.message}`,
    });
    return;
  }

  // Handle file validation errors (from fileFilter)
  if (err.message.includes('Invalid')) {
    res.status(415).json({
      error: err.message,
    });
    return;
  }

  // Generic error
  res.status(500).json({
    error: err.message || 'Internal server error',
  });
}

