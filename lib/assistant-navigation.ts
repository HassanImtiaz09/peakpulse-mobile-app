/**
 * Assistant Navigation Intent Classifier
 *
 * Keyword-based intent detection to route users to the correct screen
 * from the floating assistant chat. Zero AI cost.
 */

export interface NavigationIntent {
  route: string;
  label: string;
  confidence: number;
}

interface IntentRule {
  keywords: string[];
  route: string;
  label: string;
  /** Higher priority wins when multiple rules match */
  priority: number;
}

const INTENT_RULES: IntentRule[] = [
  // Meals & Nutrition
  { keywords: ["meal", "meals", "food", "eat", "eating", "nutrition", "diet", "breakfast", "lunch", "dinner", "snack", "calorie", "calories", "macro", "macros", "protein", "carb", "fat", "log meal", "meal log", "my meals"], route: "/(tabs)/meals", label: "Meals & Nutrition", priority: 10 },
  { keywords: ["barcode", "scan food", "scan barcode", "food scanner"], route: "/barcode-scanner", label: "Barcode Scanner", priority: 15 },
  { keywords: ["meal plan", "meal plans", "generate meal", "ai meal", "weekly meal"], route: "/(tabs)/meals", label: "Meal Plans", priority: 12 },
  { keywords: ["saved food", "saved foods", "favourite food", "favorite food", "my foods"], route: "/(tabs)/meals", label: "Saved Foods", priority: 12 },

  // Workouts
  { keywords: ["workout", "workouts", "exercise", "exercises", "training", "train", "gym", "my workout", "workout plan", "my plan", "my workouts"], route: "/(tabs)/plans", label: "Workout Plans", priority: 10 },
  { keywords: ["start workout", "begin workout", "let's train", "lets train", "active workout"], route: "/(tabs)/plans", label: "Workout Plans", priority: 12 },
  { keywords: ["workout history", "workout calendar", "calendar", "history", "past workouts", "completed workouts"], route: "/workout-calendar", label: "Workout Calendar", priority: 15 },
  { keywords: ["streak", "my streak", "streak count", "day streak"], route: "/workout-calendar", label: "Workout Streaks", priority: 12 },
  { keywords: ["rest timer", "rest interval", "rest time", "rest setting"], route: "/rest-timer-settings", label: "Rest Timer Settings", priority: 15 },

  // Body Scan
  { keywords: ["body scan", "scan", "body", "transformation", "body photo", "body image", "future body", "predict body"], route: "/(tabs)/scan", label: "Body Scan", priority: 10 },
  { keywords: ["compare", "comparison", "before after", "progress photo", "progress comparison", "body compare"], route: "/body-scan-compare", label: "Body Scan Comparison", priority: 15 },
  { keywords: ["progress", "progress photo", "photos", "my progress"], route: "/progress-photos", label: "Progress Photos", priority: 12 },

  // Form Check
  { keywords: ["form", "form check", "check my form", "exercise form", "form analysis", "posture", "technique"], route: "/form-checker", label: "Form Checker", priority: 15 },

  // AI Coach
  { keywords: ["coach", "ai coach", "coaching", "advice", "deep insight", "deep insights", "detailed advice", "personal coach"], route: "/ai-coach", label: "AI Coach", priority: 12 },

  // Profile & Settings
  { keywords: ["profile", "my profile", "account", "my account", "settings"], route: "/(tabs)/profile", label: "Profile", priority: 10 },
  { keywords: ["subscription", "upgrade", "plan", "pricing", "subscribe", "premium", "pro", "basic", "advanced"], route: "/subscription", label: "Subscription Plans", priority: 12 },
  { keywords: ["notification", "notifications", "reminder", "reminders", "alert", "alerts"], route: "/notification-preferences", label: "Notification Preferences", priority: 15 },
  { keywords: ["theme", "dark mode", "light mode", "appearance", "dark", "light"], route: "/(tabs)/profile", label: "Theme Settings", priority: 12 },
  { keywords: ["referral", "refer", "invite", "share app", "invite friend"], route: "/referral", label: "Referral Program", priority: 15 },

  // Social
  { keywords: ["social", "feed", "community", "challenge", "challenges"], route: "/social-feed", label: "Social Feed", priority: 10 },
  { keywords: ["share", "share workout", "share streak", "instagram", "tiktok"], route: "/share-workout", label: "Share Workout", priority: 12 },

  // Dashboard
  { keywords: ["home", "dashboard", "main", "overview", "summary"], route: "/(tabs)", label: "Dashboard", priority: 8 },

  // Tips
  { keywords: ["tips", "tip", "tricks", "advice", "suggestion"], route: "/tips-tricks", label: "Tips & Tricks", priority: 10 },
];

/**
 * Classify user input into a navigation intent.
 * Returns the best matching intent, or null if no match found.
 */
export function classifyIntent(input: string): NavigationIntent | null {
  const lower = input.toLowerCase().trim();

  // Exact phrase matches get highest priority
  let bestMatch: IntentRule | null = null;
  let bestScore = 0;

  for (const rule of INTENT_RULES) {
    let score = 0;

    for (const keyword of rule.keywords) {
      if (lower === keyword) {
        // Exact match — very high score
        score = Math.max(score, rule.priority * 3);
      } else if (lower.includes(keyword)) {
        // Substring match — score based on keyword length and rule priority
        const lengthBonus = keyword.split(" ").length; // multi-word keywords score higher
        score = Math.max(score, rule.priority * lengthBonus);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = rule;
    }
  }

  // Only return if we have a meaningful match (threshold)
  if (bestMatch && bestScore >= 8) {
    return {
      route: bestMatch.route,
      label: bestMatch.label,
      confidence: Math.min(bestScore / 45, 1),
    };
  }

  // Check for question patterns that should go to AI chat instead of navigation
  const questionWords = ["how", "what", "why", "when", "should", "can", "will", "is", "are", "do", "does", "help"];
  const startsWithQuestion = questionWords.some(w => lower.startsWith(w));
  if (startsWithQuestion) return null;

  return null;
}

/**
 * Get a list of all available navigation destinations for the assistant.
 * Used for displaying help or suggestions.
 */
export function getAvailableDestinations(): { label: string; route: string }[] {
  const seen = new Set<string>();
  const destinations: { label: string; route: string }[] = [];
  for (const rule of INTENT_RULES) {
    if (!seen.has(rule.route)) {
      seen.add(rule.route);
      destinations.push({ label: rule.label, route: rule.route });
    }
  }
  return destinations;
}
