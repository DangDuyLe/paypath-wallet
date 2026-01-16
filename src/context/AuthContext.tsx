import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { AUTH_STATEMENT } from '@/lib/config';
import { buildAuthMessage, getChallenge, verifySignature } from '@/services/auth';
import { getZkLoginChallenge } from '@/services/zklogin';

interface AuthState {
  accessToken: string | null;
  tokenType: string | null;
  address: string | null;
  isAuthenticating: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  loginWithWallet: () => Promise<void>;
  loginWithZkLogin: () => Promise<void>;
  completeZkLoginWithIdToken: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'paypath.accessToken';
const STORAGE_TOKEN_TYPE_KEY = 'paypath.tokenType';
const STORAGE_ADDRESS_KEY = 'paypath.address';

export function AuthProvider({ children }: { children: ReactNode }) {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signPersonalMessageAsync } = useSignPersonalMessage();


  const [accessToken, setAccessToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY)
  );
  const [tokenType, setTokenType] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_TOKEN_TYPE_KEY)
  );
  const [address, setAddress] = useState<string | null>(() => localStorage.getItem(STORAGE_ADDRESS_KEY));
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setToken = useCallback(
    (res: { accessToken: string; tokenType: string; address?: string | null }) => {
      setAccessToken(res.accessToken);
      setTokenType(res.tokenType);
      localStorage.setItem(STORAGE_KEY, res.accessToken);
      localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, res.tokenType);

      if (typeof res.address === 'string') {
        setAddress(res.address);
        localStorage.setItem(STORAGE_ADDRESS_KEY, res.address);
      }
    },
    []
  );


  const completeZkLoginWithIdToken = useCallback(
    async (idToken: string) => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const raw = sessionStorage.getItem('paypath.zklogin.challenge');
        if (!raw) {
          throw new Error('Missing zkLogin challenge');
        }

        const challenge = JSON.parse(raw) as { nonce?: unknown; maxEpoch?: unknown; domain?: unknown };
        console.log('[zklogin] loaded challenge', challenge);
        const nonce = challenge.nonce;
        const maxEpochRaw = challenge.maxEpoch;
        const domain = challenge.domain;

        const maxEpoch =
          typeof maxEpochRaw === 'number'
            ? maxEpochRaw
            : typeof maxEpochRaw === 'string'
              ? Number(maxEpochRaw)
              : NaN;

        if (typeof nonce !== 'string' || typeof domain !== 'string' || !Number.isFinite(maxEpoch)) {
          throw new Error('Invalid zkLogin challenge');
        }

        const {
          getZkLoginSalt,
          requestZkLoginProof,
          restoreEphemeralZkLoginState,
          verifyZkLogin,
        } = await import('@/services/zklogin');

        const stateRaw = sessionStorage.getItem('paypath.zklogin.state');
        if (!stateRaw) {
          throw new Error('Missing zkLogin state');
        }

        const state = JSON.parse(stateRaw) as { jwtRandomness?: unknown; ephemeralSecretKey?: unknown };
        const jwtRandomnessRaw = state.jwtRandomness;
        const ephemeralSecretKeyRaw = state.ephemeralSecretKey;

        if (typeof jwtRandomnessRaw !== 'string' || typeof ephemeralSecretKeyRaw !== 'string') {
          throw new Error('Invalid zkLogin state');
        }

        const { userSalt, address } = await getZkLoginSalt(idToken);

        const { jwtRandomness, ephemeralPublicKey, extendedEphemeralPublicKey } = restoreEphemeralZkLoginState({
          maxEpoch,
          jwtRandomness: jwtRandomnessRaw,
          ephemeralSecretKey: ephemeralSecretKeyRaw,
        });

        const { proof } = await requestZkLoginProof({
          idToken,
          maxEpoch,
          jwtRandomness,
          extendedEphemeralPublicKey,
          userSalt,
          keyClaimName: 'sub',
        });

        

        const verifyRes = await verifyZkLogin({
          idToken,
          nonce,
          maxEpoch,
          domain,
          jwtRandomness,
          ephemeralPublicKey,
          extendedEphemeralPublicKey,
          userSalt,
          proof,
        });

        sessionStorage.removeItem('paypath.zklogin.challenge');
        sessionStorage.removeItem('paypath.zklogin.state');

        setToken({ accessToken: verifyRes.accessToken, tokenType: verifyRes.tokenType, address });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'zkLogin failed';
        setError(msg);
        throw e;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [setToken]
  );
  const logout = useCallback(() => {
    setAccessToken(null);
    setTokenType(null);
    setAddress(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TOKEN_TYPE_KEY);
    localStorage.removeItem(STORAGE_ADDRESS_KEY);
  }, []);

  const loginWithWallet = useCallback(async () => {
    if (!currentAccount?.address) {
      throw new Error('Wallet not connected');
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const { nonce, domain } = await getChallenge(currentAccount.address);

      const issuedAt = new Date().toISOString();
      const expirationTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const message = buildAuthMessage({
        domain,
        address: currentAccount.address,
        nonce,
        issuedAt,
        expirationTime,
        statement: AUTH_STATEMENT,
      });

      const bytes = new TextEncoder().encode(message);
      const signed = await signPersonalMessageAsync({ message: bytes });

      const signature = (signed as { signature?: unknown })?.signature;
      if (typeof signature !== 'string') {
        throw new Error('Wallet returned invalid signature format');
      }

      const verifyRes = await verifySignature({
        address: currentAccount.address,
        nonce,
        issuedAt,
        expirationTime,
        statement: AUTH_STATEMENT,
        message,
        signature,
      });

      setAccessToken(verifyRes.accessToken);
      setTokenType(verifyRes.tokenType);
      localStorage.setItem(STORAGE_KEY, verifyRes.accessToken);
      localStorage.setItem(STORAGE_TOKEN_TYPE_KEY, verifyRes.tokenType);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Authentication failed';
      setError(msg);
      throw e;
    } finally {
      setIsAuthenticating(false);
    }
  }, [currentAccount?.address, signPersonalMessageAsync]);
const loginWithZkLogin = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      const challenge = await getZkLoginChallenge();

      const { generateEphemeralZkLoginState, startGoogleIdTokenRedirect } = await import(
        '@/services/zklogin'
      );
      const { registerZkLoginNonce } = await import('@/services/zkloginRegister');

      const state = generateEphemeralZkLoginState({ maxEpoch: challenge.maxEpoch });

      await registerZkLoginNonce({ nonce: state.computedNonce });

      sessionStorage.setItem(
        'paypath.zklogin.challenge',
        JSON.stringify({
          ...challenge,
          nonce: state.computedNonce, // Overwrite with computed nonce
        })
      );
      sessionStorage.setItem(
        'paypath.zklogin.state',
        JSON.stringify({
          jwtRandomness: state.jwtRandomness,
          ephemeralSecretKey: state.ephemeralSecretKey,
        })
      );

      startGoogleIdTokenRedirect({ nonce: state.computedNonce });

      await new Promise(() => {
        // redirect
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'zkLogin failed';
      setError(msg);
      throw e;
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      accessToken,
      tokenType,
      address,
      isAuthenticating,
      error,
      loginWithWallet,
      loginWithZkLogin,
      completeZkLoginWithIdToken,
      logout,
    }),
    [
      accessToken,
      tokenType,
      address,
      isAuthenticating,
      error,
      loginWithWallet,
      loginWithZkLogin,
      completeZkLoginWithIdToken,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function getAuthHeader(): string | null {
  const token = localStorage.getItem(STORAGE_KEY);
  const type = localStorage.getItem(STORAGE_TOKEN_TYPE_KEY) || 'Bearer';
  if (!token) return null;
  return `${type} ${token}`;
}



