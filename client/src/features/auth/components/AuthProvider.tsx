import { useState, type ReactNode } from 'react';
import { setAccessToken } from '../../../api/http';
import { queryClient } from '../../../api/query-client';
import type { Session } from '../api/auth.api';
import { AuthContext } from '../auth-context';
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Session['user'] | null>(null);
  function signIn(session: Session) {
    queryClient.clear();
    setAccessToken(session.accessToken);
    setUser(session.user);
  }
  function signOut() {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }
  return <AuthContext.Provider value={{ user, signIn, signOut }}>{children}</AuthContext.Provider>;
}
