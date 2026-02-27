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
  if (!secret) {
    throw new Error('ADMIN_PASSWORD is not set; cannot sign admin session.');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const bytes = new Uint8Array(sig);
  let b64: string;
  if (typeof Buffer !== 'undefined' && typeof Buffer.from === 'function') {
    b64 = Buffer.from(bytes).toString('base64');
  } else {
    // Fallback to btoa in browser-like environments
    b64 = btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getAdminSessionCookieHeader(): Promise<string> {
  if (!process.env.ADMIN_PASSWORD?.trim()) {
    throw new Error('ADMIN_PASSWORD is not set; cannot create admin session.');
  }
  const timestamp = String(Date.now());
  let sig: string;
  try {
    // primary, existing signer
    sig = await signSessionPayload(timestamp);
  } catch (err) {
    // fallback: sign using available server-side crypto (robust for Node)
    const secret = process.env.ADMIN_PASSWORD || '';
    // Try to use Web Crypto if available (but avoid btoa usage), otherwise use Node's crypto
    if (typeof globalThis !== 'undefined' && (globalThis as any).crypto && (globalThis as any).crypto.subtle) {
      const subtle = (globalThis as any).crypto.subtle;
      const key = await subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const signature = await subtle.sign('HMAC', key, new TextEncoder().encode(timestamp));
      const b64 = Buffer.from(new Uint8Array(signature)).toString('base64');
      sig = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } else {
      // Node fallback via dynamic import to avoid bundler issues
      try {
        const cryptoModule = await import('crypto');
        const hmac = cryptoModule.createHmac('sha256', secret).update(timestamp).digest('base64');
        sig = hmac.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      } catch (err2) {
        // rethrow original error to preserve original failure semantics
        throw err;
      }
    }
  }
  const value = `${timestamp}.${sig}`;
  const secure = process.env.NODE_ENV === 'production';
  const parts = [
    `admin-session=${encodeURIComponent(value)}`,
    'Path=/',
    'Max-Age=' + 60 * 60 * 24,
    'HttpOnly',
    'SameSite=Strict',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** Returns the Set-Cookie header value to clear the admin session. Use in Route Handlers. */
export function getClearAdminSessionCookieHeader(): string {
  return 'admin-session=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict';
}

async function verifySessionCookie(value: string): Promise<boolean> {
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, sig] = parts;
  const ts = Number(timestamp);
  const now = Date.now();
  if (!Number.isFinite(ts) || ts > now || now - ts > SESSION_MAX_AGE_MS) return false;
  let expected: string;
  try {
    expected = await signSessionPayload(timestamp);
  } catch (e) {
    console.error('[Admin] Session verification failed: ADMIN_PASSWORD not set or signing error.', e);
    return false;
  }
  if (!expected || sig.length !== expected.length) return false;
  let match = 0;
  for (let i = 0; i < sig.length; i++) match |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return match === 0;
}

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

/** @deprecated Use getAdminSessionCookieHeader() and set the header on the response in Route Handlers. */
export async function setAdminSession(): Promise<string> {
  return getAdminSessionCookieHeader();
}

/** Returns the Set-Cookie header to clear the session. Use in Route Handlers instead of calling cookies().delete. */
export async function clearAdminSession(): Promise<string> {
  return getClearAdminSessionCookieHeader();
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