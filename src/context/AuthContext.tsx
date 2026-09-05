import React, { useEffect, useRef, useState } from 'react';
import { clearSessionStorage, isAuthUser, resolveStoredSession } from '../services/authSession';
import { AuthContext } from './auth-context';
import type { User } from './auth-context';



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSessionState] = useState<{ token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const initialGeneration = generation.current;
    const clear = () => {
      generation.current += 1;
      setSessionState(null);
      setUser(null);
      setLoading(false);
    };
    void resolveStoredSession(controller.signal).then(restored => {
      if (controller.signal.aborted || generation.current !== initialGeneration) return;
      window.dispatchEvent(new Event('aura:session-changed'));
      setSessionState(restored ? { token: restored.token } : null);
      setUser(restored?.user ?? null);
      setLoading(false);
    });
    window.addEventListener('aura:data-cleared', clear);
    return () => { controller.abort(); window.removeEventListener('aura:data-cleared', clear); };
  }, []);

  const setSession = (token: string, nextUser: User) => {
    if (!token || !isAuthUser(nextUser) || (token === 'dev-token' && !import.meta.env?.DEV)) throw new Error('Sesión no válida.');
    localStorage.setItem('cached_user', JSON.stringify(nextUser));
    localStorage.setItem('token', token);
    window.dispatchEvent(new Event('aura:session-changed'));
    generation.current += 1;
    setSessionState({ token });
    setUser(nextUser);
    setLoading(false);
  };

  const signOut = async () => {
    clearSessionStorage();
    window.dispatchEvent(new Event('aura:session-changed'));
    generation.current += 1;
    setSessionState(null);
    setUser(null);
    setLoading(false);
  };

  return <AuthContext.Provider value={{ user, session, loading, setSession, signOut }}>{children}</AuthContext.Provider>;
};
