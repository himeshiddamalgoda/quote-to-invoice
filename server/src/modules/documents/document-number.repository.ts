import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DocumentKind } from '../../types/domain.js';
interface SequenceRow extends RowDataPacket {
  value: number;
}
// Use only inside withTransaction(), together with document creation and its audit entry.
export async function nextDocumentNumber(
  connection: PoolConnection,
  kind: DocumentKind,
  year: number,
): Promise<string> {
  await connection.execute(
    'INSERT INTO DocumentSequence (kind, year, value) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE value = value + 1',
    [kind, year],
  );
  const [rows] = await connection.execute<SequenceRow[]>(
    'SELECT value FROM DocumentSequence WHERE kind = ? AND year = ?',
    [kind, year],
  );
  const row = rows[0];
  if (!row) throw new Error('Document counter is unavailable');
  return `${kind}-${year}-${String(row.value).padStart(4, '0')}`;
}
