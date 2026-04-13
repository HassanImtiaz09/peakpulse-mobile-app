import { UI } from "@/constants/ui-colors";
/**
 * Golden-themed HD background URLs for all screens.
 * These are the AI-generated golden coach backgrounds used throughout FytNova.
 */

// Primary golden AI coach image (used for dashboard, plans, meals hero cards)
export const GOLDEN_PRIMARY = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

// Scan / body composition golden background
export const GOLDEN_SCAN = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OdDCyHFnLhvyAyWV.jpg";

// Profile golden background
export const GOLDEN_PROFILE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/hXdqoCBElSGntMHm.jpg";

// Workout / plans golden background
export const GOLDEN_WORKOUT = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/yauqLuTRvanJUzsJ.jpg";

// Meals golden background
export const GOLDEN_MEALS = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/OTOphPKaSpDPZRjp.jpg";

// Social / community golden background
export const GOLDEN_SOCIAL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-social-bg-6XESYMXaHwooBovbKXUgYi.webp";

// Challenge golden background
export const GOLDEN_CHALLENGE = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-challenge-bg-2DXBpSZwN3LCroCHSRyD4K.webp";

// Check-in / daily golden background
export const GOLDEN_CHECKIN = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-checkin-bg-FybvquGurRSx5VEd9qe2iB.webp";

// Pantry / nutrition golden background
export const GOLDEN_PANTRY = "https://d2xsxph8kpxj0f.cloudfront.net/310519663430072618/TCxddYfhYS3he4wae2YPUE/golden-pantry-bg-NX2jKAH9PuCVwSuoatLKxc.webp";

/**
 * Standard overlay style for golden backgrounds.
 * Apply this to a View wrapping content over an ImageBackground.
 */
export const GOLDEN_OVERLAY_STYLE = {
  flex: 1,
  backgroundColor: "rgba(10,14,20,0.85)",
} as const;

/**
 * Lighter overlay for hero sections.
 */
export const GOLDEN_HERO_OVERLAY = {
  flex: 1,
  backgroundColor: "rgba(10,14,20,0.70)",
} as const;

/**
 * Translucent card style for tiles over golden backgrounds.
 */
export const GOLDEN_CARD_STYLE = {
  backgroundColor: "rgba(20,26,34,0.80)",
  borderColor: UI.goldAlpha12,
  borderWidth: 1,
  borderRadius: 20,
} as const;
