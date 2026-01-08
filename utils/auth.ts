import AsyncStorage from '@react-native-async-storage/async-storage';

// Read auth token saved after login
export async function getAuthToken(): Promise<string | null> {
  try {
    // Try common keys to be resilient to differing login implementations
    const keys = ['auth_token', 'token', 'access_token'];
    for (const k of keys) {
      const v = await AsyncStorage.getItem(k);
      if (v) {
        if (__DEV__) console.log('[Auth] using token from storage key:', k);
        return v;
      }
    }
    // Env fallback for local testing
    const envToken = process.env.EXPO_PUBLIC_ADMIN_TOKEN as string | undefined;
    if (envToken) {
      if (__DEV__) console.log('[Auth] using token from EXPO_PUBLIC_ADMIN_TOKEN');
      return envToken;
    }
    return null;
  } catch (e) {
    return null;
  }
}


// Helper to set token consistently
export async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('auth_token', token);
  } catch { }
}

export async function setUserRole(role: 'customer' | 'staff' | 'admin'): Promise<void> {
  try {
    await AsyncStorage.setItem('user_role', role);
  } catch { }
}

export async function getUserRole(): Promise<'customer' | 'staff' | 'admin' | null> {
  try {
    const role = await AsyncStorage.getItem('user_role');
    return role as 'customer' | 'staff' | 'admin' | null;
  } catch {
    return null;
  }
}

import auth from '@react-native-firebase/auth';

export async function clearAuth(): Promise<void> {
  try {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_role');
    await auth().signOut();
  } catch { }
}
