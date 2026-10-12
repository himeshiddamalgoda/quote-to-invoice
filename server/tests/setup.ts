// Test-only values; never loaded by the application entry point.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'mysql://test:test@localhost:3306/quote_flow_test';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.JWT_SECRET = 'test-only-secret-with-at-least-32-characters';
process.env.LOG_LEVEL = 'silent';
