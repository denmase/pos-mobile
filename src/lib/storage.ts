import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredSession = {
  token: string;
  baseUrl: string;
};

const SESSION_KEY = 'pos-mobile-session';

export async function saveStoredSession(session: StoredSession) {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function getStoredSession(): Promise<StoredSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}
