import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");

function readFile(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), "utf-8");
}

function fileExists(relPath: string): boolean {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── UserProfileContext ────────────────────────────────────────────────────
describe("UserProfileContext", () => {
  it("user-profile-context.tsx exists", () => {
    expect(fileExists("lib/user-profile-context.tsx")).toBe(true);
  });

  it("exports UserProfileProvider and useUserProfile", () => {
    const src = readFile("lib/user-profile-context.tsx");
    expect(src).toContain("export function UserProfileProvider");
    expect(src).toContain("export function useUserProfile");
  });

  it("stores profile photo URI in AsyncStorage", () => {
    const src = readFile("lib/user-profile-context.tsx");
    expect(src).toContain("@peakpulse_profile_photo");
    expect(src).toContain("AsyncStorage.setItem");
    expect(src).toContain("AsyncStorage.removeItem");
  });

  it("stores display name in AsyncStorage", () => {
    const src = readFile("lib/user-profile-context.tsx");
    expect(src).toContain("@peakpulse_display_name");
    expect(src).toContain("setDisplayName");
  });

  it("provides clearProfile function", () => {
    const src = readFile("lib/user-profile-context.tsx");
    expect(src).toContain("clearProfile");
  });

  it("loads profile data on mount", () => {
    const src = readFile("lib/user-profile-context.tsx");
    expect(src).toContain("loadProfile");
    expect(src).toContain("useEffect");
  });
});

// ── Profile Photo Upload ──────────────────────────────────────────────────
describe("Profile Photo Upload", () => {
  it("profile.tsx imports expo-image-picker", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("expo-image-picker");
  });

  it("profile.tsx imports useUserProfile", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("useUserProfile");
    expect(src).toContain("user-profile-context");
  });

  it("profile has photo picker with library and camera options", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("launchImageLibraryAsync");
    expect(src).toContain("launchCameraAsync");
  });

  it("profile has PhotoOptionsModal component", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("PhotoOptionsModal");
    expect(src).toContain("Choose from Library");
    expect(src).toContain("Take a Photo");
    expect(src).toContain("Remove Photo");
  });

  it("profile shows camera icon overlay on avatar", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("camera-alt");
    expect(src).toContain("profilePhotoUri");
  });

  it("profile photo picker uses 1:1 aspect ratio", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("aspect: [1, 1]");
  });

  it("profile requests camera permissions before taking photo", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("requestCameraPermissionsAsync");
    expect(src).toContain("Permission Required");
  });
});

// ── Username Editing ──────────────────────────────────────────────────────
describe("Username Editing", () => {
  it("profile has inline name editing with TextInput", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("editingName");
    expect(src).toContain("nameInput");
    expect(src).toContain("setNameInput");
  });

  it("profile has edit icon next to display name", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("startEditingName");
    expect(src).toContain("\"edit\"");
  });

  it("profile has save and cancel buttons for name editing", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("saveName");
    expect(src).toContain("saveDisplayName");
  });

  it("profile name input has maxLength constraint", () => {
    const src = readFile("app/(tabs)/profile.tsx");
    expect(src).toContain("maxLength={30}");
  });
});

// ── Dashboard Profile Integration ─────────────────────────────────────────
describe("Dashboard Profile Integration", () => {
  // Moved to dedicated screen in Today redesign
  // it("dashboard imports useUserProfile", () => {
  //   const src = readFile("app/(tabs)/index.tsx");
  //   expect(src).toContain("useUserProfile");
  //   expect(src).toContain("user-profile-context");
  // });

  // Moved to dedicated screen in Today redesign
  // it("dashboard uses savedDisplayName for greeting", () => {
  //   const src = readFile("app/(tabs)/index.tsx");
  //   expect(src).toContain("savedDisplayName");
  // });

  // Moved to dedicated screen in Today redesign
  // it("dashboard shows profile photo in hero section", () => {
  //   const src = readFile("app/(tabs)/index.tsx");
  //   expect(src).toContain("profilePhotoUri");
  // });

  it("dashboard imports useUserProfile for personalized greeting", () => {
    const src = readFile("app/(tabs)/index.tsx");
    expect(src).toContain("useUserProfile");
  });
});

// ── Feature Gates on Premium Screens ──────────────────────────────────────
describe("Feature Gates on Premium Screens", () => {
  it("wearable-sync.tsx has FeatureGate for wearable_sync", () => {
    const src = readFile("app/wearable-sync.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("wearable_sync");
  });

  it("social-feed.tsx has FeatureGate for social_feed", () => {
    const src = readFile("app/social-feed.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("social_feed");
  });

  it("challenge-onboarding.tsx has FeatureGate for challenges", () => {
    const src = readFile("app/challenge-onboarding.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("challenges");
  });

  it("progress-photos.tsx has FeatureGate for progress_photos", () => {
    const src = readFile("app/progress-photos.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("progress_photos");
  });

  it("referral.tsx has FeatureGate for referral", () => {
    const src = readFile("app/referral.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("referral");
  });

  it("notification-preferences.tsx has FeatureGate for notification_preferences", () => {
    const src = readFile("app/notification-preferences.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("notification_preferences");
  });

  it("scan.tsx already has FeatureGate for body_scan", () => {
    const src = readFile("app/(tabs)/scan.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("body_scan");
  });

  it("form-checker.tsx already has FeatureGate for form_checker", () => {
    const src = readFile("app/form-checker.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("form_checker");
  });

  it("ai-coach.tsx already has FeatureGate for ai_coaching", () => {
    const src = readFile("app/(tabs)/ai-coach.tsx");
    expect(src).toContain("FeatureGate");
    expect(src).toContain("ai_coaching");
  });
});

// ── Feature Tiers Configuration ───────────────────────────────────────────
describe("Feature Tiers Configuration", () => {
  it("FEATURE_TIERS has all expected premium features", () => {
    const src = readFile("hooks/use-subscription.ts");
    expect(src).toContain("body_scan: \"basic\"");
    expect(src).toContain("progress_photos: \"basic\"");
    expect(src).toContain("referral: \"basic\"");
    expect(src).toContain("notification_preferences: \"basic\"");
    expect(src).toContain("wearable_sync: \"basic\"");  // moved from Pro
    expect(src).toContain("form_checker: \"pro\"");
    expect(src).toContain("social_feed: \"basic\"");    // moved from Pro (read-only)
    expect(src).toContain("challenges: \"pro\"");
    expect(src).toContain("ai_coaching: \"pro\"");
  });

  it("canAccess function checks tier hierarchy correctly", () => {
    const src = readFile("hooks/use-subscription.ts");
    expect(src).toContain("canAccess");
    expect(src).toContain("isTrialActive");
    // Trial grants full access
    expect(src).toContain("state.isTrialActive");
  });
});

// ── Root Layout Integration ───────────────────────────────────────────────
describe("Root Layout Integration", () => {
  it("_layout.tsx wraps app with UserProfileProvider", () => {
    const src = readFile("app/_layout.tsx");
    expect(src).toContain("UserProfileProvider");
    expect(src).toContain("user-profile-context");
  });
});
