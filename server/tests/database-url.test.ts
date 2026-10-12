import { describe, expect, it } from 'vitest';
import { databaseConfig } from '../src/config/database-url.js';
describe('database configuration', () => {
  it('supports encoded passwords and a custom Docker port', () => {
    const url = new URL(databaseConfig({ MYSQL_PASSWORD: 'p@ss:/#word', MYSQL_PORT: '3307' }).url!);
    expect(decodeURIComponent(url.password)).toBe('p@ss:/#word');
    expect(url.port).toBe('3307');
    expect(url.pathname).toBe('/quote_flow');
  });
  it('respects an external database', () => {
    const url = 'mysql://user:password@db.example.test/business';
    expect(databaseConfig({ DATABASE_URL: url, MYSQL_PASSWORD: 'local' }).url).toBe(url);
  });
  it('requires database credentials', () => {
    expect(databaseConfig({}).url).toBeUndefined();
  });
});
