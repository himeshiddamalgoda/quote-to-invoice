import { z } from 'zod';
export const loginBody = z.strictObject({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(1024),
});
export const loginRequest = z.object({ body: loginBody });
export type LoginInput = z.infer<typeof loginBody>;
