/**
 * FytNova — Referral Service
 *
 * Handles:
 * - Generating and persisting a unique referral code per user
 * - Building a shareable deep-link URL
 * - Sharing via the native share sheet
 * - Detecting an incoming referral code on app launch
 * - Tracking referral stats (friends referred, credits earned)
 * - Incrementing the referrer's stats when a new user uses their code
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Share, Platform } from "react-native";
import * as Linking from "expo-linking";

// ─── Storage Keys ────────────────────────────────────────────────────────────
export const REFERRAL_DATA_KEY = "@referral_data";
export const PENDING_REFERRAL_CODE_KEY = "@pending_referral_code";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ReferralData {
  code: string;
  referrals: number;
  creditsEarned: number;
  createdAt: string;
}

// ─── Code Generation ─────────────────────────────────────────────────────────

/**
 * Generate a unique 8-character alphanumeric referral code.
 * Format: first 4 chars from name + 4 random alphanumeric chars.
 * e.g. "JOHN" + "A3K9" → "JOHNA3K9"
 */
export function generateReferralCode(name: string): string {
  const base = name
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, "X");
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${base}${suffix}`;
}

// ─── Load / Create ────────────────────────────────────────────────────────────

/**
 * Load existing referral data from AsyncStorage, or create a new entry.
 */
export async function loadOrCreateReferralData(userName: string): Promise<ReferralData> {
  const raw = await AsyncStorage.getItem(REFERRAL_DATA_KEY);
  if (raw) {
    return JSON.parse(raw) as ReferralData;
  }
  const data: ReferralData = {
    code: generateReferralCode(userName),
    referrals: 0,
    creditsEarned: 0,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(REFERRAL_DATA_KEY, JSON.stringify(data));
  return data;
}

// ─── Share ────────────────────────────────────────────────────────────────────

/**
 * Build the shareable referral URL.
 * Uses a universal HTTPS fallback so it works before the app is installed.
 */
export function buildReferralUrl(code: string): string {
  // HTTPS link — works in browsers and can be intercepted by the app via universal links
  return `https://peakpulse.app/ref/${code}`;
}

/**
 * Open the native share sheet with the referral message.
 */
export async function shareReferralCode(code: string): Promise<void> {
  const url = buildReferralUrl(code);
  const message =
    `🏋️ Join me on FytNova — the AI-powered fitness app that transforms your body!\n\n` +
    `Use my referral code: ${code}\n\n` +
    `✨ You'll get a FREE 14-day Advanced trial (double the normal 7 days)!\n\n` +
    `Download: ${url}`;

  try {
    await Share.share(
      Platform.OS === "ios"
        ? { message, url }
        : { message: `${message}\n${url}` },
      { dialogTitle: "Invite a Friend to FytNova" }
    );
  } catch {
    // User cancelled — silently ignore
  }
}

// ─── Referral Detection ───────────────────────────────────────────────────────

/**
 * Parse a referral code from a deep-link URL.
 * Supports both:
 *   - https://peakpulse.app/ref/CODE
 *   - manus://ref?code=CODE  (custom scheme)
 */
export function extractReferralCodeFromUrl(url: string): string | null {
  try {
    // HTTPS pattern: /ref/CODE
    const httpsMatch = url.match(/\/ref\/([A-Z0-9]{6,12})/i);
    if (httpsMatch) return httpsMatch[1].toUpperCase();

    // Custom scheme pattern: ?code=CODE
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code;
    if (typeof code === "string" && code.length >= 6) return code.toUpperCase();

    return null;
  } catch {
    return null;
  }
}

/**
 * Store a pending referral code to be applied when the user completes onboarding.
 * Call this from the deep-link handler in _layout.tsx.
 */
export async function storePendingReferralCode(code: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_REFERRAL_CODE_KEY, code.toUpperCase());
}

/**
 * Retrieve and clear the pending referral code.
 * Call this at the end of onboarding to apply the 14-day trial.
 */
export async function consumePendingReferralCode(): Promise<string | null> {
  const code = await AsyncStorage.getItem(PENDING_REFERRAL_CODE_KEY);
  if (code) {
    await AsyncStorage.removeItem(PENDING_REFERRAL_CODE_KEY);
  }
  return code;
}

// ─── Stats Tracking ───────────────────────────────────────────────────────────

/**
 * Increment the referral count and credits for the current user.
 * In a production app this would be a server call; here we update AsyncStorage
 * to simulate the referrer being credited when a friend completes onboarding.
 */
export async function creditReferral(): Promise<void> {
  const raw = await AsyncStorage.getItem(REFERRAL_DATA_KEY);
  if (!raw) return;
  const data: ReferralData = JSON.parse(raw);
  data.referrals += 1;
  data.creditsEarned += 1; // 1 credit = 1 free month
  await AsyncStorage.setItem(REFERRAL_DATA_KEY, JSON.stringify(data));
}
