import { API_BASE_URL } from '@/lib/config';

interface ChallengeResponse {
  nonce: string;
  expiresAt: string;
  domain: string;
}

export interface VerifyResponse {
  accessToken: string;
  tokenType: string;
}

export async function getChallenge(address: string): Promise<ChallengeResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/challenge?address=${address}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to get authentication challenge');
  }

  return response.json();
}

export async function verifySignature(payload: {
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
  message: string;
  signature: string;
}): Promise<VerifyResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to verify signature');
  }

  return response.json();
}

export function buildAuthMessage({
  domain,
  address,
  nonce,
  issuedAt,
  expirationTime,
  statement,
}: {
  domain: string;
  address: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
}): string {
  const lines = [
    `domain: ${domain}`,
    `address: ${address}`,
    `nonce: ${nonce}`,
    `issuedAt: ${issuedAt}`,
    `expirationTime: ${expirationTime}`,
  ];

  if (statement?.trim()) {
    lines.push(`statement: ${statement}`);
  }

  return lines.join('\n');
}
