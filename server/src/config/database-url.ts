// Local Compose and Prisma share MYSQL_PASSWORD from server/.env.
// DATABASE_URL remains available for externally managed MySQL databases.
export function databaseConfig(source: Record<string, string | undefined> = process.env) {
  const localUrl = source.MYSQL_PASSWORD
    ? `mysql://quote_flow:${encodeURIComponent(source.MYSQL_PASSWORD)}@${source.MYSQL_HOST || 'localhost'}:${source.MYSQL_PORT || '3306'}/quote_flow`
    : undefined;
  return {
    url: source.DATABASE_URL || localUrl,
    shadowDatabaseUrl:
      source.SHADOW_DATABASE_URL ||
      (!source.DATABASE_URL && localUrl
        ? localUrl.replace(/\/quote_flow$/, '/quote_flow_shadow')
        : undefined),
  };
}
