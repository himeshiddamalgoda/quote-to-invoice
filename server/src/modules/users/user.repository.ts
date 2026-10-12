import type { RowDataPacket } from 'mysql2/promise';
import { database } from '../../config/database.js';
import type { Role } from '../../types/domain.js';
interface UserRow extends RowDataPacket {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: number;
}
interface LoginRow extends UserRow {
  passwordHash: string;
}
export const userRepository = {
  async findByEmail(email: string) {
    const [rows] = await database.execute<LoginRow[]>(
      'SELECT id, email, name, role, isActive, passwordHash FROM `User` WHERE email = ? LIMIT 1',
      [email],
    );
    const row = rows[0];
    return row ? { ...row, isActive: Boolean(row.isActive) } : null;
  },
  async findById(id: string) {
    const [rows] = await database.execute<UserRow[]>(
      'SELECT id, email, name, role, isActive FROM `User` WHERE id = ? LIMIT 1',
      [id],
    );
    const row = rows[0];
    return row ? { ...row, isActive: Boolean(row.isActive) } : null;
  },
};
