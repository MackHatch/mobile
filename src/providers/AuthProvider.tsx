import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

const TOKEN_KEY = "habit_mood_token";
const USER_KEY = "habit_mood_user";

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface MeResponse {
  user: User;
  linkedProviders: string[];
  hasPassword: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  linkedProviders: string[];
  hasPassword: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signInWithOAuth: (provider: "google" | "apple", idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [hasPassword, setHasPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const me = await apiFetch<MeResponse>("/api/auth/me", { token });
      setUser(me.user);
      setLinkedProviders(me.linkedProviders ?? []);
      setHasPassword(me.hasPassword ?? false);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(me.user));
    } catch {
      // ignore - token may be invalid
    }
  }, [token]);

  useEffect(() => {
    (async () => {
      let storedToken: string | null = null;
      let storedUser: string | null = null;
      try {
        [storedToken, storedUser] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as User);
          const me = await apiFetch<MeResponse>("/api/auth/me", { token: storedToken });
          setUser(me.user);
          setLinkedProviders(me.linkedProviders ?? []);
          setHasPassword(me.hasPassword ?? false);
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(me.user));
        }
      } catch {
        if (storedToken && storedUser) {
          setUser(JSON.parse(storedUser) as User);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, res.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const res = await apiFetch<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password, name },
    });
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, res.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signInWithOAuth = useCallback(async (provider: "google" | "apple", idToken: string) => {
    const res = await apiFetch<{ user: User; token: string }>("/api/auth/oauth/exchange", {
      method: "POST",
      body: { provider, idToken },
    });
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, res.token),
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(res.user)),
    ]);
    setToken(res.token);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(USER_KEY)]);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      linkedProviders,
      hasPassword,
      isLoading,
      signIn,
      signUp,
      signInWithOAuth,
      signOut,
      refreshUser,
    }),
    [token, user, linkedProviders, hasPassword, isLoading, signIn, signUp, signInWithOAuth, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
