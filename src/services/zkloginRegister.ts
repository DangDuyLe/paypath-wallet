import { API_BASE_URL } from '@/lib/config';

export async function registerZkLoginNonce(payload: {
  nonce: string;
}): Promise<{ expirationTime: string }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/zklogin/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to register zkLogin nonce');
  }

  return res.json();
}

