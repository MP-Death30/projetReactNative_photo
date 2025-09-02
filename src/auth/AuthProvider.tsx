import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type User = { username: string };

type AuthCtx = {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (username: string, password: string) => Promise<boolean>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};

const USER_KEY = 'APP_USER';
const CREDS_KEY = 'APP_CREDS';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(USER_KEY);
      if (raw) setUser(JSON.parse(raw));
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const raw = await AsyncStorage.getItem(CREDS_KEY);
    if (!raw) return false;
    const creds = JSON.parse(raw) as { username: string; password: string };
    if (creds.username === username && creds.password === password) {
      const u = { username };
      setUser(u);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
      return true;
    }
    return false;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(USER_KEY);
  };

  const register = async (username: string, password: string) => {
    const creds = { username, password };
    await AsyncStorage.setItem(CREDS_KEY, JSON.stringify(creds));
    const u = { username };
    setUser(u);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}
