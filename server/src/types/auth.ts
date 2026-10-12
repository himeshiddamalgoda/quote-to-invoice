import type { Role } from '../generated/prisma/client.js';
export interface AuthUser {
  id: string;
  role: Role;
}
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    requestId: string;
  }
}
