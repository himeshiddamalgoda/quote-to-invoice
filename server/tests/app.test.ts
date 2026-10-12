import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../src/config/prisma.js', () => ({
  prisma: { $queryRaw: vi.fn(), user: { findUnique: vi.fn() } },
}));
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { authorize } from '../src/middleware/authorize.js';
import express from 'express';
import { errorHandler } from '../src/middleware/error-handler.js';
const app = createApp();
describe('HTTP infrastructure (mocked persistence)', () => {
  it('returns liveness and security headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { status: 'ok' } });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toBeTruthy();
  });
  it('returns readiness failure without database internals', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('secret'));
    const res = await request(app).get('/api/v1/health/ready');
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
  it('validates login input', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'invalid' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
  it('requires authentication', async () => {
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  });
  it('rejects invalid tokens', async () => {
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer invalid')).status,
    ).toBe(401);
  });
  it('returns a consistent missing endpoint error', async () => {
    expect((await request(app).get('/missing')).body.error.code).toBe('NOT_FOUND');
  });
  it('handles malformed JSON', async () => {
    expect(
      (
        await request(app)
          .post('/api/v1/auth/login')
          .set('Content-Type', 'application/json')
          .send('{')
      ).status,
    ).toBe(400);
  });
  it('enforces backend role guards', async () => {
    const guarded = express();
    guarded.use((req, _res, next) => {
      req.user = { id: 'test', role: 'SALES' };
      next();
    });
    guarded.get('/', authorize('MANAGER'), (_req, res) => res.json({ data: true }));
    guarded.use(errorHandler);
    expect((await request(guarded).get('/')).status).toBe(403);
  });
});
