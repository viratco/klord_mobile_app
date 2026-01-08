// Centralized API base URL for the mobile app
// Prefer an env-driven URL if provided (Expo: EXPO_PUBLIC_API_BASE_URL)
// Fallback to LAN IP or localhost
export const BASE_URL: string =
  (process.env.EXPO_PUBLIC_API_BASE_URL as string) ||
  'https://api.klordenergy.com';

if (__DEV__) {
  // Helpful console for debugging
  // eslint-disable-next-line no-console
  console.log('[Auth] BASE_URL =', BASE_URL);
}
