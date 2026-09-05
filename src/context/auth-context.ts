import { createContext } from 'react';
import type { AuthUser } from '../services/authSession';

export type User = AuthUser;

export interface AuthContextType {
  user: User | null;
  session: { token: string } | null;
  loading: boolean;
  setSession: (token: string, user: User) => void;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
