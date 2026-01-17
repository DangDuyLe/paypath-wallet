import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { getChallenge, getProfile, postVerify, WalletChallengeResponseDto } from '@/services/api';

type AuthUser = unknown;

type AuthContextValue = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  loginWithWallet: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'jwt_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }

    const res = await getProfile();
    setUser(res.data);
  }, [token]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loginWithWallet = useCallback(async () => {
    if (!account?.address) {
      throw new Error('No wallet connected');
    }

    setIsAuthLoading(true);
    try {
      const challengeRes = await getChallenge(account.address);
      const challenge: WalletChallengeResponseDto = challengeRes.data;

      const messageBytes = new TextEncoder().encode(challenge.message);
      const sigRes = await signPersonalMessage({ message: messageBytes });

      const verifyRes = await postVerify({
        address: challenge.address,
        domain: challenge.domain,
        nonce: challenge.nonce,
        issuedAt: challenge.issuedAt,
        expirationTime: challenge.expirationTime,
        statement: challenge.statement,
        message: challenge.message,
        signature: sigRes.signature,
      });

      const accessToken = (verifyRes.data as any)?.accessToken || (verifyRes.data as any)?.token;
      if (!accessToken || typeof accessToken !== 'string') {
        throw new Error('Auth succeeded but no token returned from backend');
      }

      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);

      await refreshProfile();
    } finally {
      setIsAuthLoading(false);
    }
  }, [account?.address, refreshProfile, signPersonalMessage]);

  const value: AuthContextValue = useMemo(
    () => ({
      isAuthenticated,
      isAuthLoading,
      user,
      token,
      loginWithWallet,
      logout,
      refreshProfile,
    }),
    [isAuthenticated, isAuthLoading, loginWithWallet, logout, refreshProfile, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

