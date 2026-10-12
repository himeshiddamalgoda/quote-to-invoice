import { createContext } from 'react';
import type { Session } from './api/auth.api';
interface AuthContextValue {
  user: Session['user'] | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);
