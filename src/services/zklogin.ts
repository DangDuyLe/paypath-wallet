import { API_BASE_URL, GOOGLE_CLIENT_ID } from '@/lib/config';
import {
  decodeJwt,
  generateNonce,
  generateRandomness,
  getExtendedEphemeralPublicKey,
} from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

interface ZkLoginChallengeResponse {
  nonce: string;
  maxEpoch: number;
  domain: string;
}

export interface ZkLoginFullParams {
  idToken: string;
  nonce: string;
  maxEpoch: number;
  domain: string;
  jwtRandomness: string;
  ephemeralPublicKey: string;
  extendedEphemeralPublicKey: string;
  userSalt: string;
  proof: unknown;
}

export interface ZkLoginVerifyResponse {
  accessToken: string;
  tokenType: string;
}

function requireGoogleClientId(): string {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Missing VITE_GOOGLE_CLIENT_ID');
  }
  return GOOGLE_CLIENT_ID;
}

export async function getZkLoginChallenge(address?: string): Promise<ZkLoginChallengeResponse> {
  const url = new URL(`${API_BASE_URL}/api/auth/zklogin/challenge`);
  if (address) url.searchParams.set('address', address);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to get zkLogin challenge');
  }

  return res.json();
}

export async function getZkLoginSalt(
  idToken: string
): Promise<{ userSalt: string; address?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/zklogin/salt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to get zkLogin salt');
  }

  const data = await res.json();
  return { userSalt: data.salt, address: typeof data.address === 'string' ? data.address : undefined };
}

export async function requestZkLoginProof(payload: {
  idToken: string;
  maxEpoch: number;
  jwtRandomness: string;
  extendedEphemeralPublicKey: string;
  userSalt: string;
  keyClaimName: 'sub';
}): Promise<{ proof: unknown }> {
  if (typeof payload.userSalt !== 'string') {
    throw new Error('Invalid zkLogin salt');
  }
  const res = await fetch(`${API_BASE_URL}/api/prover/zklogin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jwt: payload.idToken,
      extendedEphemeralPublicKey: payload.extendedEphemeralPublicKey,
      maxEpoch: String(payload.maxEpoch),
      jwtRandomness: payload.jwtRandomness,
      salt: payload.userSalt,
      keyClaimName: payload.keyClaimName,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to get zkLogin proof');
  }

  return res.json();
}

export async function verifyZkLogin(params: ZkLoginFullParams): Promise<ZkLoginVerifyResponse> {
  const res = await fetch(`${API_BASE_URL}/api/auth/zklogin/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idToken: params.idToken,
      nonce: params.nonce,
      maxEpoch: String(params.maxEpoch),
      jwtRandomness: params.jwtRandomness,
      extendedEphemeralPublicKey: params.extendedEphemeralPublicKey,
      keyClaimName: 'sub',
      proof:
        params.proof && typeof params.proof === 'object'
          ? (params.proof as object)
          : ({} as object),
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to verify zkLogin');
  }

  return res.json();
}

export function buildGoogleOauthUrl(params: { nonce: string; redirectUri: string }): string {
  const clientId = requireGoogleClientId();

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

export function startGoogleIdTokenRedirect(params: { nonce: string }): void {
  const redirectUri = `${window.location.origin}/login`;
  const url = buildGoogleOauthUrl({ nonce: params.nonce, redirectUri });
  window.location.assign(url);
}

export function generateEphemeralZkLoginState(params: {
  maxEpoch: number;
}): {
  jwtRandomness: string;
  ephemeralSecretKey: string;
  ephemeralPublicKey: string;
  extendedEphemeralPublicKey: string;
  computedNonce: string;
} {
  const jwtRandomness = generateRandomness();
  const keypair = new Ed25519Keypair();

  const ephemeralPublicKey = keypair.getPublicKey().toBase64();
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

  const computedNonce = generateNonce(keypair.getPublicKey(), params.maxEpoch, jwtRandomness);

  return {
    jwtRandomness,
    ephemeralSecretKey: keypair.getSecretKey(),
    ephemeralPublicKey,
    extendedEphemeralPublicKey,
    computedNonce,
  };
}

export function restoreEphemeralZkLoginState(params: {
  maxEpoch: number;
  jwtRandomness: string;
  ephemeralSecretKey: string;
}): {
  jwtRandomness: string;
  ephemeralPublicKey: string;
  extendedEphemeralPublicKey: string;
  computedNonce: string;
} {
  const secretKeyRaw = params.ephemeralSecretKey;

  if (secretKeyRaw.startsWith('suiprivkey')) {
    const keypair = Ed25519Keypair.fromSecretKey(secretKeyRaw);

    const ephemeralPublicKey = keypair.getPublicKey().toBase64();
    const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

    const computedNonce = generateNonce(keypair.getPublicKey(), params.maxEpoch, params.jwtRandomness);

    return {
      jwtRandomness: params.jwtRandomness,
      ephemeralPublicKey,
      extendedEphemeralPublicKey,
      computedNonce,
    };
  }

  const parts = secretKeyRaw.split(',');
  const bytes = new Uint8Array(parts.length);
  for (let i = 0; i < parts.length; i++) {
    const n = Number(parts[i]);
    if (Number.isFinite(n)) {
      if (n < 0 || n > 255) {
        throw new Error('Invalid zkLogin ephemeral secret key');
      }
      bytes[i] = n;
      continue;
    }

    if (parts[i].length !== 1) {
      throw new Error('Invalid zkLogin ephemeral secret key');
    }

    bytes[i] = parts[i].charCodeAt(0);
  }

  const keypair = Ed25519Keypair.fromSecretKey(bytes);

  const ephemeralPublicKey = keypair.getPublicKey().toBase64();
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(keypair.getPublicKey());

  const computedNonce = generateNonce(keypair.getPublicKey(), params.maxEpoch, params.jwtRandomness);

  return {
    jwtRandomness: params.jwtRandomness,
    ephemeralPublicKey,
    extendedEphemeralPublicKey,
    computedNonce,
  };
}

export function getJwtSub(idToken: string): string {
  const decoded = decodeJwt(idToken);
  const sub = (decoded as { sub?: unknown })?.sub;
  if (typeof sub !== 'string') {
    throw new Error('Invalid idToken: missing sub');
  }
  return sub;
}

