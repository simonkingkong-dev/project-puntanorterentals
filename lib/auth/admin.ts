import 'dotenv/config';

import { cookies } from 'next/headers';

export interface AdminCredentials {
  username: string;
  password: string;
}

export const ADMIN_CREDENTIALS: AdminCredentials = {
  username: process.env.NEXT_PUBLIC_ADMIN_USERNAME || '',
  password: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
};

export function validateAdminCredentials(username: string, password: string): boolean {
  console.log('Credenciales ingresadas:', { username, password });
  console.log('Credenciales esperadas:', { 
    username: ADMIN_CREDENTIALS.username, 
    password: ADMIN_CREDENTIALS.password 
  });
  return username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password;
}

export async function setAdminSession() {
  const cookieStore = await cookies();
  await cookieStore.set('admin-session', 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  await cookieStore.delete('admin-session');
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = await cookieStore.get('admin-session');
  return session?.value === 'authenticated';
}

// **Función corregida**
export async function requireAdminAuth() {
  if (!(await isAdminAuthenticated())) { // Aquí se corrigió
    throw new Error('Admin authentication required');
  }
}