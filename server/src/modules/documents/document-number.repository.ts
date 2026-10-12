import type { Prisma, DocumentKind } from '../../generated/prisma/client.js';
// Must run inside the SAME transaction as the document insert and audit write.
export async function nextDocumentNumber(
  tx: Prisma.TransactionClient,
  kind: DocumentKind,
  year: number,
): Promise<string> {
  // InnoDB's upsert takes a row lock held until commit, including concurrent first use.
  await tx.$executeRaw`
    INSERT INTO DocumentSequence (kind, year, value) VALUES (${kind}, ${year}, 1)
    ON DUPLICATE KEY UPDATE value = value + 1
  `;
  // The transaction still holds the lock, so another allocator cannot change this value.
  const row = await tx.documentSequence.findUniqueOrThrow({ where: { kind_year: { kind, year } } });
  return `${kind}-${year}-${String(row.value).padStart(4, '0')}`;
}
