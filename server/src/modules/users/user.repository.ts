import { prisma } from '../../config/prisma.js';
export const userRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),
  findById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    }),
};
