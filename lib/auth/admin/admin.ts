import { cookies } from 'next/headers';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const ADMIN_CREDENTIALS: AdminCredentials = {
  username: process.env.ADMIN_USERNAME || '',
  password: process.env.ADMIN_PASSWORD || '',
};

const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 1000; // 24 hours

async function signSessionPayload(payload: string): Promise<string> {
  const secret = process.env.ADMIN_PASSWORD || '';
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verifySessionCookie(value: string): Promise<boolean> {
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, sig] = parts;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Date.now() - ts > SESSION_MAX_AGE_MS) return false;
  const expected = await signSessionPayload(timestamp);
  if (expected === '' || sig.length !== expected.length) return false;
  let match = 0;
  for (let i = 0; i < sig.length; i++) match |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return match === 0;
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export async function setAdminSession() {
  const timestamp = String(Date.now());
  const sig = await signSessionPayload(timestamp);
  const value = `${timestamp}.${sig}`;
  const cookieStore = await cookies();
  await cookieStore.set('admin-session', value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  await cookieStore.delete('admin-session');
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = await cookieStore.get('admin-session');
  const value = session?.value;
  if (!value || !value.includes('.')) return false;
  return verifySessionCookie(value);
}

export async function requireAdminAuth() {
  if (!(await isAdminAuthenticated())) { 
    throw new Error('Admin authentication required');
  }
}