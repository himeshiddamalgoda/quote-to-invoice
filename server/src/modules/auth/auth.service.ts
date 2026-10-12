import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { userRepository } from '../users/user.repository.js';
import { AppError } from '../../utils/app-error.js';
import type { LoginInput } from './auth.schema.js';
// A random dummy hash keeps unknown-email attempts on the password verification path.
const dummyHash = argon2.hash('unavailable-account', { type: argon2.argon2id });
export const authService = {
  async login({ email, password }: LoginInput) {
    const user = await userRepository.findByEmail(email);
    const valid = await argon2.verify(user?.passwordHash ?? (await dummyHash), password);
    if (!user?.isActive || !valid)
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    const accessToken = jwt.sign({}, env.JWT_SECRET, {
      subject: user.id,
      algorithm: 'HS256',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      expiresIn: '15m',
    });
    return {
      accessToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  },
};
