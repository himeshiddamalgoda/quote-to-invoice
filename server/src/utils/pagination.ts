import { z } from 'zod';
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export function pagination(input: z.infer<typeof paginationSchema>) {
  return { skip: (input.page - 1) * input.pageSize, take: input.pageSize };
}
// Each feature must allowlist its own sorting fields and filters at the boundary.
