import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, me } from './auth.controller.js';
import { loginRequest } from './auth.schema.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
export const authRoutes = Router();
authRoutes.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
authRoutes.post(
  '/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
      error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again later.' },
    },
  }),
  validate(loginRequest),
  login,
);
authRoutes.get('/me', authenticate, me);
