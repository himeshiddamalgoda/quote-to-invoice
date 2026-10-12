// Docker and the API share MYSQL_PASSWORD from server/.env.
export function databaseConfig(source: Record<string, string | undefined> = process.env) {
  return {
    url:
      source.DATABASE_URL ||
      (source.MYSQL_PASSWORD
        ? `mysql://quote_flow:${encodeURIComponent(source.MYSQL_PASSWORD)}@${source.MYSQL_HOST || 'localhost'}:${source.MYSQL_PORT || '3306'}/quote_flow`
        : undefined),
  };
}
