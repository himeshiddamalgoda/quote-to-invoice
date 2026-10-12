import { describe, expect, it } from 'vitest';
import { databaseConfig } from '../src/config/database-url.js';

describe('database configuration', () => {
  it('uses the Compose password and port for both local databases', () => {
    const config = databaseConfig({ MYSQL_PASSWORD: 'p@ss:/#word', MYSQL_PORT: '3307' });
    const app = new URL(config.url!);
    const shadow = new URL(config.shadowDatabaseUrl!);
    expect(decodeURIComponent(app.password)).toBe('p@ss:/#word');
    expect(app.port).toBe('3307');
    expect(app.pathname).toBe('/quote_flow');
    expect(shadow.pathname).toBe('/quote_flow_shadow');
    expect(shadow.password).toBe(app.password);
  });
  it('respects an external database without choosing a local shadow database', () => {
    const url = 'mysql://user:password@db.example.test/business';
    expect(databaseConfig({ DATABASE_URL: url, MYSQL_PASSWORD: 'local' })).toEqual({
      url,
      shadowDatabaseUrl: undefined,
    });
    expect(
      databaseConfig({
        DATABASE_URL: url,
        SHADOW_DATABASE_URL: 'mysql://user:password@db.example.test/shadow',
      }).shadowDatabaseUrl,
    ).toContain('/shadow');
  });
  it('allows client generation without database credentials', () => {
    expect(databaseConfig({})).toEqual({ url: undefined, shadowDatabaseUrl: undefined });
  });
});
