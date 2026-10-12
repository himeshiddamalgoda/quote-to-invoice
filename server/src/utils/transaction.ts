import type { Pool, PoolConnection } from 'mysql2/promise';
// Repositories receive this connection so all writes share the transaction.
export async function withTransaction<T>(
  pool: Pool,
  work: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      connection.destroy();
    }
    throw error;
  } finally {
    connection.release();
  }
}
