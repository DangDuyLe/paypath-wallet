import { API_BASE_URL } from '@/lib/config';
import { getAuthHeader } from '@/context/AuthContext';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;

  const headers = new Headers(init.headers);

  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }

  const auth = getAuthHeader();
  if (auth) {
    headers.set('Authorization', auth);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  return res;
}

