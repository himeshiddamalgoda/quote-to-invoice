import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID, randomInt } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { prisma } from '../src/config/prisma.js';
import { createApp } from '../src/app.js';
import { nextDocumentNumber } from '../src/modules/documents/document-number.repository.js';

const databaseUrl = process.env.TEST_DATABASE_URL;
if (databaseUrl && !new URL(databaseUrl).pathname.endsWith('_test')) {
  throw new Error('TEST_DATABASE_URL must point to a dedicated database ending in _test');
}
// Opt in explicitly; normal unit/HTTP runs do not require MySQL.
describe.skipIf(!databaseUrl)('MySQL integration', () => {
  const email = `integration-${randomUUID()}@example.test`;
  const password = 'integration-only-password';
  const year = randomInt(100_000, 2_000_000_000);
  const app = createApp();
  let userId: string;
  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email,
        name: 'Integration user',
        role: 'MANAGER',
        passwordHash: await argon2.hash(password),
      },
    });
    userId = user.id;
  });
  afterAll(async () => {
    if (userId) await prisma.user.delete({ where: { id: userId } });
    await prisma.documentSequence.deleteMany({ where: { year } });
    await prisma.$disconnect();
  });
  it('logs in and authenticates a real stored user', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('MANAGER');
    expect(login.body.data.user.passwordHash).toBeUndefined();
    const me = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.id).toBe(userId);
  });
  it('rejects wrong credentials', async () => {
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: 'incorrect' })).status,
    ).toBe(401);
  });
  it('checks active status and current roles after issuing a token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const token = login.body.data.accessToken;
    await prisma.user.update({ where: { id: userId }, data: { role: 'VIEWER' } });
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.role).toBe('VIEWER');
    await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(401);
  });
  it('allocates distinct sequential numbers under concurrent first-use requests', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 8 }, () =>
        prisma.$transaction((tx) => nextDocumentNumber(tx, 'QT', year)),
      ),
    );
    expect(new Set(numbers).size).toBe(8);
    expect(numbers.sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => `QT-${year}-${String(index + 1).padStart(4, '0')}`),
    );
  });
  it('rolls back document numbering with the enclosing transaction', async () => {
    await expect(
      prisma.$transaction(async (tx) => {
        await nextDocumentNumber(tx, 'PI', year);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    expect(
      await prisma.documentSequence.findUnique({ where: { kind_year: { kind: 'PI', year } } }),
    ).toBeNull();
    expect(await prisma.$transaction((tx) => nextDocumentNumber(tx, 'PI', year))).toBe(
      `PI-${year}-0001`,
    );
  });
});
