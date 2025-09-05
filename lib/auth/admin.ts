import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const ADMIN_CREDENTIALS: AdminCredentials = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

export function validateAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export function setAdminSession() {
  const cookieStore = cookies();
  cookieStore.set('admin-session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export function clearAdminSession() {
  const cookieStore = cookies();
  cookieStore.delete('admin-session');
}

export function isAdminAuthenticated(): boolean {
  const cookieStore = cookies();
  const session = cookieStore.get('admin-session');
  return session?.value === 'authenticated';
}

export function requireAdminAuth() {
  if (!isAdminAuthenticated()) {
    throw new Error('Admin authentication required');
  }
}