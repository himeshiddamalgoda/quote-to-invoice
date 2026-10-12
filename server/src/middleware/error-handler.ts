import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../config/logger.js';
export const notFound: RequestHandler = (_req, _res, next) =>
  next(new AppError(404, 'NOT_FOUND', 'Endpoint not found.'));
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  let mapped = new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
  if (error instanceof AppError) mapped = error;
  else if (error instanceof ZodError)
    mapped = new AppError(
      422,
      'VALIDATION_ERROR',
      'Request validation failed.',
      error.issues.map(({ path, message }) => ({ path: path.join('.'), message })),
    );
  else if (error instanceof SyntaxError && 'status' in error && error.status === 400)
    mapped = new AppError(400, 'INVALID_JSON', 'Invalid JSON body.');
  else if (typeof error === 'object' && error !== null && 'status' in error && error.status === 413)
    mapped = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body is too large.');
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') mapped = new AppError(409, 'CONFLICT', 'Resource already exists.');
    else if (error.code === 'P2025') mapped = new AppError(404, 'NOT_FOUND', 'Resource not found.');
    else if (error.code === 'P2034')
      mapped = new AppError(409, 'CONCURRENT_MODIFICATION', 'The resource changed. Please retry.');
  }
  // Do not log raw error objects: database errors can contain submitted values.
  if (mapped.status >= 500)
    logger.error(
      { requestId: req.requestId, errorType: error instanceof Error ? error.name : 'Unknown' },
      'Request failed',
    );
  res.status(mapped.status).json({
    error: {
      code: mapped.code,
      message: mapped.message,
      ...(mapped.details ? { details: mapped.details } : {}),
    },
    requestId: req.requestId,
  });
};
