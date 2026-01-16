// src/lib/config.ts

/**
 * Base URL for the PayPath backend API.
 * @type {string}
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

/**
 * Optional statement to be included in the sign-in message.
 * @type {string | undefined}
 */
export const AUTH_STATEMENT = import.meta.env.VITE_AUTH_STATEMENT;
export const ZKLOGIN_ENABLED = import.meta.env.VITE_ZKLOGIN_ENABLED === 'true';
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

