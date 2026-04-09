/**
 * Milestone Share — Generate styled share card content and trigger native sharing.
 *
 * Creates shareable text cards for:
 *   - Level-up milestones
 *   - Streak badge unlocks
 *   - Custom achievements
 *
 * Uses expo-sharing + expo-file-system to create and share styled cards.
 */
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

// ── Types ────────────────────────────────────────────────────────────────

export type MilestoneType = "level_up" | "streak_badge" | "achievement";

export interface MilestoneShareData {
  type: MilestoneType;
  /** e.g., "Level 10" or "7-Day Streak" */
  title: string;
  /** e.g., "Committed" or "Flame" */
  subtitle: string;
  /** Total XP at time of milestone */
  totalXP: number;
  /** Current streak days */
  streakDays: number;
  /** Badge color (hex) for streak badges */
  badgeColor?: string;
  /** Badge icon name */
  badgeIcon?: string;
}

// ── Share Card Text Generation ──────────────────────────────────────────

/**
 * Generate a styled text card for sharing. Returns a formatted string
 * suitable for sharing via text/social media.
 */
export function generateShareCardText(data: MilestoneShareData): string {
  const divider = "━━━━━━━━━━━━━━━━━━━━";
  const appTag = "#PeakPulse #FitnessJourney";

  switch (data.type) {
    case "level_up":
      return [
        "🏆 LEVEL UP!",
        divider,
        `⚡ Level ${data.title.replace("Level ", "")} — ${data.subtitle}`,
        `📊 Total XP: ${data.totalXP.toLocaleString()}`,
        data.streakDays > 0 ? `🔥 ${data.streakDays}-day streak` : "",
        divider,
        "Crushing my fitness goals with PeakPulse AI!",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    case "streak_badge":
      return [
        `🔥 ${data.title.toUpperCase()} UNLOCKED!`,
        divider,
        `🏅 Badge: ${data.subtitle}`,
        `📅 ${data.streakDays} consecutive days`,
        `⚡ ${data.totalXP.toLocaleString()} XP earned`,
        divider,
        "Consistency is key! Building healthy habits with PeakPulse AI.",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    case "achievement":
      return [
        `✨ ACHIEVEMENT UNLOCKED!`,
        divider,
        `🎯 ${data.title}`,
        `${data.subtitle}`,
        `⚡ ${data.totalXP.toLocaleString()} XP`,
        divider,
        "Making progress every day with PeakPulse AI!",
        appTag,
      ]
        .filter(Boolean)
        .join("\n");

    default:
      return `${data.title} — ${data.subtitle}\n${appTag}`;
  }
}

/**
 * Generate an SVG share card as a string (for rendering or saving).
 * Returns SVG markup that can be saved to a file.
 */
export function generateShareCardSVG(data: MilestoneShareData): string {
  const bgColor = data.type === "level_up" ? "#0A0A0F" : "#0A0A0F";
  const accentColor = data.badgeColor || "#F59E0B";
  const iconEmoji =
    data.type === "level_up"
      ? "🏆"
      : data.type === "streak_badge"
      ? "🔥"
      : "✨";

  const title =
    data.type === "level_up"
      ? `Level ${data.title.replace("Level ", "")}`
      : data.title;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1A1F2E;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${accentColor};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${accentColor};stop-opacity:0.6" />
    </linearGradient>
  </defs>
  <rect width="400" height="500" rx="24" fill="url(#bg)" />
  <rect x="0" y="0" width="400" height="4" fill="url(#accent)" />
  <text x="200" y="120" text-anchor="middle" font-size="64">${iconEmoji}</text>
  <text x="200" y="190" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="28" fill="#F1F5F9">${escapeXml(title)}</text>
  <text x="200" y="230" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="600" font-size="20" fill="${accentColor}">${escapeXml(data.subtitle)}</text>
  <line x1="100" y1="260" x2="300" y2="260" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="1" />
  <text x="200" y="300" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#9BA1A6">${data.totalXP.toLocaleString()} XP earned</text>
  ${data.streakDays > 0 ? `<text x="200" y="330" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" fill="#EF4444">🔥 ${data.streakDays}-day streak</text>` : ""}
  <text x="200" y="440" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="700" font-size="18" fill="${accentColor}">PeakPulse AI</text>
  <text x="200" y="465" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="#64748B">Your AI Fitness Companion</text>
</svg>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Sharing Functions ───────────────────────────────────────────────────

/**
 * Share a milestone via the native share sheet.
 * On native platforms, creates an SVG file and shares it.
 * Falls back to text sharing if file sharing is unavailable.
 */
export async function shareMilestone(data: MilestoneShareData): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      // Fallback: can't share on this platform
      return false;
    }

    if (Platform.OS === "web") {
      // Web: share text only
      const text = generateShareCardText(data);
      await Sharing.shareAsync(text);
      return true;
    }

    // Native: create SVG file and share
    const svg = generateShareCardSVG(data);
    const fileUri = `${FileSystem.cacheDirectory}peakpulse-milestone.svg`;
    await FileSystem.writeAsStringAsync(fileUri, svg, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: "image/svg+xml",
      dialogTitle: "Share your milestone!",
    });

    return true;
  } catch {
    // Sharing cancelled or failed
    return false;
  }
}

/**
 * Share milestone as plain text (fallback for all platforms).
 */
export async function shareMilestoneAsText(data: MilestoneShareData): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) return false;

    const text = generateShareCardText(data);
    const fileUri = `${FileSystem.cacheDirectory}peakpulse-milestone.txt`;
    await FileSystem.writeAsStringAsync(fileUri, text, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/plain",
      dialogTitle: "Share your milestone!",
    });

    return true;
  } catch {
    return false;
  }
}

// ── Helper: Build share data from XP events ─────────────────────────────

export function buildLevelUpShareData(
  newLevel: number,
  levelTitle: string,
  totalXP: number,
  streakDays: number,
): MilestoneShareData {
  return {
    type: "level_up",
    title: `Level ${newLevel}`,
    subtitle: levelTitle,
    totalXP,
    streakDays,
  };
}

export function buildBadgeShareData(
  badgeDays: number,
  badgeName: string,
  badgeColor: string,
  badgeIcon: string,
  totalXP: number,
  streakDays: number,
): MilestoneShareData {
  return {
    type: "streak_badge",
    title: `${badgeDays}-Day Streak`,
    subtitle: badgeName,
    totalXP,
    streakDays,
    badgeColor,
    badgeIcon,
  };
}
