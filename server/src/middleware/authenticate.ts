import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { userRepository } from '../modules/users/user.repository.js';
import { AppError } from '../utils/app-error.js';
const claims = z.object({ sub: z.uuid() });
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');
  let userId: string;
  try {
    userId = claims.parse(
      jwt.verify(token, env.JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
      }),
    ).sub;
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Access token is invalid or expired.');
  }
  const user = await userRepository.findById(userId);
  if (!user?.isActive) throw new AppError(401, 'UNAUTHENTICATED', 'Account is unavailable.');
  req.user = { id: user.id, role: user.role };
  next();
};
