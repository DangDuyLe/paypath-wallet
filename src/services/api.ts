import axios from 'axios';

const VITE_API_URL = import.meta.env.VITE_API_URL || 'https://sui-payment.onrender.com/api';

const api = axios.create({
  baseURL: VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export type WalletChallengeResponseDto = {
  address: string;
  domain: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
  message: string;
};

export type WalletVerifyRequestDto = {
  address: string;
  domain?: string;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
  statement?: string;
  message: string;
  signature: string;
};

export const getChallenge = (address: string) => api.get<WalletChallengeResponseDto>('/auth/challenge', {
  params: { address },
});

export const postVerify = (dto: WalletVerifyRequestDto) => api.post('/auth/verify', dto);

export const getZkLoginChallenge = () => api.get('/auth/zklogin/challenge');
export const postZkLoginSalt = (dto: { sub: string }) => api.post('/auth/zklogin/salt', dto);
export const postZkLoginRegister = (dto: { nonceBase64Url: string; maxEpoch: number }) =>
  api.post('/auth/zklogin/register', dto);
export const postZkLoginVerify = (dto: unknown) => api.post('/auth/zklogin/verify', dto);

export const getProfile = () => api.get('/users/profile');

export const updateProfile = (dto: { email?: string; firstName?: string; lastName?: string }) =>
  api.patch('/users/profile', dto);

export const changeUsername = (newUsername: string) => api.patch('/users/profile/username', { newUsername });

export const lookupUser = (username: string) => api.get(`/users/lookup?username=${username}`);

export const scanQr = (qrString: string) => api.post('/transfer/scan', { qrString });

export default api;

