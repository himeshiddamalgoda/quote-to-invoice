import type { RequestHandler } from 'express';
import { authService } from './auth.service.js';
import type { LoginInput } from './auth.schema.js';
export const login: RequestHandler = async (_req, res) => {
  const input: { body: LoginInput } = res.locals.input;
  res.json({ data: await authService.login(input.body) });
};
export const me: RequestHandler = (req, res) => {
  res.json({ data: req.user });
};
