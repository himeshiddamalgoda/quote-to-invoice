import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { databaseErrorCode } from '../utils/database-error.js';
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
  else {
    const code = databaseErrorCode(error);
    if (code === 'ER_DUP_ENTRY') mapped = new AppError(409, 'CONFLICT', 'Resource already exists.');
    else if (code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT')
      mapped = new AppError(409, 'CONCURRENT_MODIFICATION', 'The resource changed. Please retry.');
    else if (code === 'ER_ROW_IS_REFERENCED_2' || code === 'ER_NO_REFERENCED_ROW_2')
      mapped = new AppError(
        409,
        'RELATED_RESOURCE_CONFLICT',
        'Related resource constraints prevent this operation.',
      );
    else if (['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'].includes(code ?? ''))
      mapped = new AppError(503, 'DATABASE_UNAVAILABLE', 'Database is unavailable.');
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
