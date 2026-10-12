import type { RequestHandler } from 'express';
import type { Role } from '../types/domain.js';
import { AppError } from '../utils/app-error.js';
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
    if (req.user.role !== 'ADMIN' && !roles.includes(req.user.role))
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions.');
    next();
  };
}
