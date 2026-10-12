import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID, randomInt } from 'node:crypto';
import argon2 from 'argon2';
import request from 'supertest';
import { database } from '../src/config/database.js';
import { withTransaction } from '../src/utils/transaction.js';
import type { RowDataPacket } from 'mysql2/promise';
import { userRepository } from '../src/modules/users/user.repository.js';
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
  const userId = randomUUID();
  beforeAll(async () => {
    await database.execute(
      'INSERT INTO `User` (id, email, name, role, passwordHash) VALUES (?, ?, ?, ?, ?)',
      [userId, email, 'Integration user', 'MANAGER', await argon2.hash(password)],
    );
  });
  afterAll(async () => {
    await database.execute('DELETE FROM `User` WHERE id = ?', [userId]);
    await database.execute('DELETE FROM DocumentSequence WHERE year = ?', [year]);
    await database.end();
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
  it('treats SQL-like input as a literal email', async () => {
    expect(await userRepository.findByEmail("' OR 1=1 --")).toBeNull();
  });
  it('retains exact decimal values as strings', async () => {
    const [rows] = await database.execute<RowDataPacket[]>(
      'SELECT CAST(0.10 AS DECIMAL(19,2)) AS amount',
    );
    expect(rows[0]?.amount).toBe('0.10');
  });
  it('rejects wrong credentials', async () => {
    expect(
      (await request(app).post('/api/v1/auth/login').send({ email, password: 'incorrect' })).status,
    ).toBe(401);
  });
  it('checks active status and current roles after issuing a token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ email, password });
    const token = login.body.data.accessToken;
    await database.execute('UPDATE `User` SET role = ? WHERE id = ?', ['VIEWER', userId]);
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.role).toBe('VIEWER');
    await database.execute('UPDATE `User` SET isActive = false WHERE id = ?', [userId]);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`)).status,
    ).toBe(401);
  });
  it('allocates distinct sequential numbers under concurrent first-use requests', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 8 }, () =>
        withTransaction(database, (tx) => nextDocumentNumber(tx, 'QT', year)),
      ),
    );
    expect(new Set(numbers).size).toBe(8);
    expect(numbers.sort()).toEqual(
      Array.from({ length: 8 }, (_, index) => `QT-${year}-${String(index + 1).padStart(4, '0')}`),
    );
  });
  it('rolls back document numbering with the enclosing transaction', async () => {
    await expect(
      withTransaction(database, async (tx) => {
        await nextDocumentNumber(tx, 'PI', year);
        throw new Error('abort');
      }),
    ).rejects.toThrow('abort');
    const [rows] = await database.execute<RowDataPacket[]>(
      'SELECT value FROM DocumentSequence WHERE kind = ? AND year = ?',
      ['PI', year],
    );
    expect(rows).toHaveLength(0);
    expect(await withTransaction(database, (tx) => nextDocumentNumber(tx, 'PI', year))).toBe(
      `PI-${year}-0001`,
    );
  });
});
