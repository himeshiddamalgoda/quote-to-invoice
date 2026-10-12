import { z } from 'zod';
import { http } from '../../../api/http';
import type { LoginInput } from '../schemas/login.schema';
const sessionSchema = z.object({
  data: z.object({
    accessToken: z.string(),
    user: z.object({
      id: z.string(),
      name: z.string(),
      email: z.email(),
      role: z.enum(['ADMIN', 'SALES', 'MANAGER', 'FINANCE', 'VIEWER']),
    }),
  }),
});
export type Session = z.infer<typeof sessionSchema>['data'];
export async function login(input: LoginInput): Promise<Session> {
  const response = await http.post<unknown>('/auth/login', input);
  return sessionSchema.parse(response.data).data;
}
