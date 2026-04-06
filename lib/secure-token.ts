/**
 * Secure token storage using expo-secure-store with AsyncStorage fallback.
 *
 * On native (iOS/Android), tokens are stored in the device keychain / keystore
 * via expo-secure-store, which encrypts data at rest.
 *
 * On web, falls back to AsyncStorage (localStorage) since secure-store
 * is not available — acceptable for dev/preview but NOT for production web.
 */

import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "pp_auth_token";
const REFRESH_TOKEN_KEY = "pp_refresh_token";
const GUEST_ID_KEY = "pp_guest_id";

const isNative = Platform.OS === "ios" || Platform.OS === "android";

// ── Low-level helpers ──

async function secureSet(key: string, value: string): Promise<void> {
  if (isNative) {
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await AsyncStorage.setItem(key, value);
  }
}

async function secureGet(key: string): Promise<string | null> {
  if (isNative) {
    return SecureStore.getItemAsync(key);
  }
  return AsyncStorage.getItem(key);
}

async function secureDelete(key: string): Promise<void> {
  if (isNative) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await AsyncStorage.removeItem(key);
  }
}

// ── Public API ──

/** Store the primary auth token securely */
export async function saveAuthToken(token: string): Promise<void> {
  await secureSet(TOKEN_KEY, token);
}

/** Retrieve the primary auth token */
export async function getAuthToken(): Promise<string | null> {
  return secureGet(TOKEN_KEY);
}

/** Store a refresh token securely */
export async function saveRefreshToken(token: string): Promise<void> {
  await secureSet(REFRESH_TOKEN_KEY, token);
}

/** Retrieve the refresh token */
export async function getRefreshToken(): Promise<string | null> {
  return secureGet(REFRESH_TOKEN_KEY);
}

/** Store the guest session ID securely */
export async function saveGuestId(guestId: string): Promise<void> {
  await secureSet(GUEST_ID_KEY, guestId);
}

/** Retrieve the guest session ID */
export async function getGuestId(): Promise<string | null> {
  return secureGet(GUEST_ID_KEY);
}

/** Clear all auth-related tokens (used on logout / account deletion) */
export async function clearAllTokens(): Promise<void> {
  await Promise.all([
    secureDelete(TOKEN_KEY),
    secureDelete(REFRESH_TOKEN_KEY),
    secureDelete(GUEST_ID_KEY),
  ]);
}

/**
 * Migrate tokens from AsyncStorage to SecureStore (one-time).
 * Call this on app startup to move any legacy tokens.
 */
export async function migrateTokensToSecureStore(): Promise<void> {
  if (!isNative) return; // Only migrate on native

  const legacyKeys = [
    { legacy: "auth_token", secure: TOKEN_KEY },
    { legacy: "refresh_token", secure: REFRESH_TOKEN_KEY },
    { legacy: "guest_id", secure: GUEST_ID_KEY },
  ];

  for (const { legacy, secure } of legacyKeys) {
    try {
      const existing = await AsyncStorage.getItem(legacy);
      if (existing) {
        // Check if already migrated
        const inSecure = await SecureStore.getItemAsync(secure);
        if (!inSecure) {
          await SecureStore.setItemAsync(secure, existing, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
          });
        }
        // Remove from AsyncStorage after successful migration
        await AsyncStorage.removeItem(legacy);
      }
    } catch {
      // Silent fail — next launch will retry
    }
  }
}
