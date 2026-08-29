import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'tracely_token';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// expo-secure-store no implementa todos sus métodos en web; ahí usamos localStorage.
export async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.setItem(TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error ?? `Error ${res.status}`);
  }
  return data as T;
}
