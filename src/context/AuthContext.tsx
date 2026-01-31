import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { useAccount as useWagmiAccount, useSignMessage } from 'wagmi';
import { getChallenge, getKycStatus, getProfile, postVerify, WalletChallengeResponseDto } from '@/services/api';
import { useWallet } from './WalletContext';

type AuthUser = unknown;

type AuthContextValue = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  user: AuthUser | null;
  token: string | null;
  loginWithWallet: () => Promise<{ needsOnboarding: boolean }>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'jwt_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const signPersonalMessage = useSignPersonalMessage();

  // Wagmi hooks for EVM
  const wagmiAccount = useWagmiAccount();
  const { signMessageAsync } = useSignMessage();

  // Get current chain from WalletContext
  const { currentChain } = useWallet();

  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const isLoginInFlightRef = useRef(false);

  const isAuthenticated = useMemo(() => Boolean(token), [token]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setIsAuthLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const t = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!t) {
      setToken(null);
      setUser(null);
      return;
    }

    const res = await getProfile();
    setToken(t);
    setUser(res.data);
  }, []);

  const syncKycStatus = useCallback(async (walletAddress?: string | null) => {
    const t = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!t) return;
    if (!walletAddress) return;

    try {
      // Checksum if EVM
      let formattedAddress = walletAddress;
      if (walletAddress.startsWith('0x') && walletAddress.length === 42) {
        try {
          const { getAddress } = await import('viem');
          formattedAddress = getAddress(walletAddress);
        } catch (err) {
          console.warn('Failed to checksum address, sending as is', err);
        }
      }
      await getKycStatus(formattedAddress);
    } catch {
      // ignore KYC sync errors
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsAuthLoading(true);
      try {
        const t = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!t) {
          if (cancelled) return;
          setToken(null);
          setUser(null);
          return;
        }

        const res = await getProfile();

        const walletAddressForKyc = (() => {
          const u = res.data as { walletAddress?: unknown; address?: unknown } | null;
          const addr =
            typeof u?.walletAddress === 'string' && u.walletAddress.trim()
              ? u.walletAddress.trim()
              : typeof u?.address === 'string' && u.address.trim()
                ? u.address.trim()
                : null;
          return addr;
        })();

        if (walletAddressForKyc) {
          try {
            // Checksum if EVM
            let formattedAddress = walletAddressForKyc;
            if (walletAddressForKyc.startsWith('0x') && walletAddressForKyc.length === 42) {
              try {
                const { getAddress } = await import('viem');
                formattedAddress = getAddress(walletAddressForKyc);
              } catch (err) {
                console.warn('Failed to checksum address, sending as is', err);
              }
            }
            await getKycStatus(formattedAddress);
          } catch {
            // ignore KYC sync errors on refresh
          }
        }
        if (cancelled) return;
        setToken(t);
        setUser(res.data);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setToken(null);
        setUser(null);
      } finally {
        if (cancelled) return;
        setIsAuthLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account?.address, wagmiAccount.address]);

  const loginWithWallet = useCallback(async (): Promise<{ needsOnboarding: boolean }> => {
    // EVM Login Flow
    if (currentChain === 'AVAX') {
      if (!wagmiAccount.address) {
        throw new Error('No EVM wallet connected');
      }

      if (isLoginInFlightRef.current) {
        return { needsOnboarding: false };
      }

      isLoginInFlightRef.current = true;
      setIsAuthLoading(true);

      try {
        // Get challenge from backend first (same as Sui flow)
        const challengeRes = await getChallenge(wagmiAccount.address);
        const challenge = challengeRes.data;

        const issuedAt = new Date().toISOString();
        const expirationTime = challenge.expiresAt;

        // Construct the message using backend's nonce
        const message = `Sign in to ${challenge.domain}\n\nAddress: ${wagmiAccount.address}\nNonce: ${challenge.nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expirationTime}`;

        // Sign with Wagmi
        const signature = await signMessageAsync({
          account: wagmiAccount.address,
          message
        });

        // Send to backend with EVM-specific payload
        const verifyRes = await postVerify({
          chain: 'EVM',
          address: wagmiAccount.address,
          domain: challenge.domain,
          nonce: challenge.nonce,
          issuedAt,
          expirationTime,
          message,
          signature,
        });

        const data = verifyRes.data as unknown as {
          accessToken?: unknown;
          token?: unknown;
          needsOnboarding?: unknown;
        };
        const accessToken =
          typeof data?.accessToken === 'string' ? data.accessToken : typeof data?.token === 'string' ? data.token : null;
        if (!accessToken) {
          throw new Error('Auth succeeded but no token returned from backend');
        }

        const needsOnboarding = Boolean(data?.needsOnboarding);

        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
        setToken(accessToken);

        if (!needsOnboarding) {
          try {
            await refreshProfile();
          } catch {
            logout();
          }
        }

        return { needsOnboarding };
      } finally {
        isLoginInFlightRef.current = false;
        setIsAuthLoading(false);
      }
    }

    // SUI Login Flow (original)
    if (!account?.address) {
      throw new Error('No wallet connected');
    }

    if (isLoginInFlightRef.current) {
      return { needsOnboarding: false };
    }

    isLoginInFlightRef.current = true;
    setIsAuthLoading(true);

    try {
      const challengeRes = await getChallenge(account.address);
      const challenge: WalletChallengeResponseDto = challengeRes.data;

      const issuedAt = new Date().toISOString();
      const expirationTime = challenge.expiresAt;

      const message = `Sign in to ${challenge.domain}\n\nAddress: ${account.address}\nNonce: ${challenge.nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expirationTime}`;

      const messageBytes = new TextEncoder().encode(message);
      const sigRes = await signPersonalMessage.mutateAsync({ message: messageBytes });

      const verifyRes = await postVerify({
        address: account.address,
        domain: challenge.domain,
        nonce: challenge.nonce,
        issuedAt,
        expirationTime,
        message,
        signature: sigRes.signature,
      });

      const data = verifyRes.data as unknown as {
        accessToken?: unknown;
        token?: unknown;
        needsOnboarding?: unknown;
      };
      const accessToken =
        typeof data?.accessToken === 'string' ? data.accessToken : typeof data?.token === 'string' ? data.token : null;
      if (!accessToken) {
        throw new Error('Auth succeeded but no token returned from backend');
      }

      const needsOnboarding = Boolean(data?.needsOnboarding);

      localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      setToken(accessToken);

      if (!needsOnboarding) {
        try {
          await refreshProfile();
        } catch {
          logout();
        }
      }

      return { needsOnboarding };
    } finally {
      isLoginInFlightRef.current = false;
      setIsAuthLoading(false);
    }
  }, [account?.address, currentChain, logout, refreshProfile, signMessageAsync, signPersonalMessage, wagmiAccount.address]);

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
