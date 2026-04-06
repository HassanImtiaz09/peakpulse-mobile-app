import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, Platform, Keyboard, Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SF } from "@/constants/ui-colors";
import * as Haptics from "expo-haptics";

const { height: SCREEN_H } = Dimensions.get("window");

// ── Command registry ───────────────────────────────────────────────────

export interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  keywords: string[];
  category: "navigate" | "action" | "tool";
}

const COMMANDS: CommandItem[] = [
  // Main tabs
  { id: "home", label: "Home", description: "Go to dashboard", icon: "home", route: "/(tabs)/", keywords: ["home", "dashboard", "main"], category: "navigate" },
  { id: "meals", label: "Meals", description: "Meal logging and plans", icon: "nutrition", route: "/(tabs)/meals", keywords: ["meals", "food", "nutrition", "eat", "diet"], category: "navigate" },
  { id: "plans", label: "Plans", description: "View plans", icon: "clipboard", route: "/(tabs)/plans", keywords: ["plans", "program"], category: "navigate" },
  { id: "scan", label: "Body Scan", description: "AI body composition scan", icon: "body", route: "/(tabs)/scan", keywords: ["scan", "body", "composition", "bf"], category: "navigate" },
  { id: "profile", label: "Profile", description: "Your profile and settings", icon: "person", route: "/(tabs)/profile", keywords: ["profile", "settings", "account"], category: "navigate" },
  // Screens
  { id: "nutrition-hub", label: "Nutrition Hub", description: "All nutrition tools", icon: "grid", route: "/nutrition-hub", keywords: ["nutrition", "hub", "food", "tools"], category: "navigate" },
  { id: "progress", label: "Progress Dashboard", description: "Trends and check-ins", icon: "trending-up", route: "/progress-dashboard", keywords: ["progress", "trends", "dashboard", "weight", "chart"], category: "navigate" },
  { id: "checkin", label: "Progress Check-in", description: "Log a progress photo", icon: "camera", route: "/progress-checkin", keywords: ["checkin", "photo", "progress"], category: "action" },
  { id: "pantry", label: "My Pantry", description: "Track kitchen ingredients", icon: "basket", route: "/pantry", keywords: ["pantry", "kitchen", "ingredients"], category: "navigate" },
  { id: "meal-prep", label: "Meal Prep", description: "Batch prep guides", icon: "restaurant", route: "/meal-prep", keywords: ["meal", "prep", "batch"], category: "navigate" },
  { id: "barcode", label: "Barcode Scanner", description: "Scan food labels", icon: "barcode", route: "/barcode-scanner", keywords: ["barcode", "scan", "label"], category: "tool" },
  { id: "receipt", label: "Scan Receipt", description: "Log from receipt", icon: "receipt", route: "/scan-receipt", keywords: ["receipt", "grocery", "scan"], category: "tool" },
  { id: "timeline", label: "Meal Timeline", description: "Daily intake view", icon: "time", route: "/meal-timeline", keywords: ["timeline", "daily", "intake"], category: "navigate" },
  { id: "charts", label: "Nutrition Charts", description: "Macros and trends", icon: "stats-chart", route: "/nutrition-charts", keywords: ["nutrition", "charts", "macros", "trends"], category: "navigate" },
  { id: "gallery", label: "Meal Gallery", description: "Photo history", icon: "images", route: "/meal-photo-gallery", keywords: ["gallery", "photos", "meals"], category: "navigate" },
  { id: "form-checker", label: "Form Checker", description: "AI form analysis", icon: "videocam", route: "/form-checker", keywords: ["form", "checker", "video", "analysis"], category: "tool" },
  { id: "gym-finder", label: "Gym Finder", description: "Find nearby gyms", icon: "location", route: "/gym-finder", keywords: ["gym", "finder", "nearby", "map"], category: "tool" },
  { id: "daily-checkin", label: "Daily Check-in", description: "Log your day", icon: "checkmark-circle", route: "/daily-checkin", keywords: ["daily", "checkin", "mood", "energy"], category: "action" },
  { id: "challenge", label: "Challenges", description: "Join fitness challenges", icon: "trophy", route: "/challenge", keywords: ["challenge", "competition", "leaderboard"], category: "navigate" },
  { id: "social", label: "Social Feed", description: "Community feed", icon: "people", route: "/social-feed", keywords: ["social", "feed", "community", "friends"], category: "navigate" },
  { id: "subscription", label: "Subscription", description: "Manage your plan", icon: "card", route: "/subscription-plans", keywords: ["subscription", "plan", "upgrade", "billing", "premium"], category: "navigate" },
  { id: "achievements", label: "Achievements", description: "Your badges", icon: "ribbon", route: "/achievements", keywords: ["achievements", "badges", "rewards"], category: "navigate" },
  { id: "health", label: "Health Trends", description: "Health data overview", icon: "heart", route: "/health-trends", keywords: ["health", "trends", "heart", "steps"], category: "navigate" },
  { id: "exercise-lib", label: "Exercises", description: "Browse exercise library", icon: "barbell", route: "/exercise-library", keywords: ["exercise", "library", "browse", "muscles"], category: "navigate" },
  { id: "ai-coach", label: "AI Coach", description: "Chat with your coach", icon: "chatbubble-ellipses", route: "/(tabs)/ai-coach", keywords: ["ai", "coach", "chat", "assistant"], category: "tool" },
  { id: "referral", label: "Referral", description: "Invite friends", icon: "share-social", route: "/referral", keywords: ["referral", "invite", "share", "friends"], category: "action" },
  { id: "notifications", label: "Notifications", description: "Manage alerts", icon: "notifications", route: "/notification-preferences", keywords: ["notifications", "alerts", "reminders"], category: "navigate" },
];

// ── Fuzzy search ────────────────────────────────────────────────────────

function fuzzyMatch(query: string, item: CommandItem): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1; // Show all when empty

  // Exact label match
  if (item.label.toLowerCase() === q) return 100;

  // Label starts with query
  if (item.label.toLowerCase().startsWith(q)) return 80;

  // Label contains query
  if (item.label.toLowerCase().includes(q)) return 60;

  // Description contains query
  if (item.description.toLowerCase().includes(q)) return 40;

  // Keywords match
  for (const kw of item.keywords) {
    if (kw.startsWith(q)) return 50;
    if (kw.includes(q)) return 30;
  }

  // Partial letter matching (fuzzy)
  let qi = 0;
  const target = item.label.toLowerCase() + " " + item.keywords.join(" ");
  for (let i = 0; i < target.length && qi < q.length; i++) {
    if (target[i] === q[qi]) qi++;
  }
  if (qi === q.length) return 20;

  return 0;
}

// ── Category icons & colors ────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  navigate: { label: "Screen", color: "#6366F1" },
  action: { label: "Action", color: "#14B8A6" },
  tool: { label: "Tool", color: "#F59E0B" },
};

// ── Component ──────────────────────────────────────────────────────────

interface CommandPaletteProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandPalette({ visible, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (visible) {
      setQuery("");
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const results = useMemo(() => {
    return COMMANDS.map((cmd) => ({ cmd, score: fuzzyMatch(query, cmd) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.cmd);
  }, [query]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Keyboard.dismiss();
      onClose();
      setTimeout(() => {
        router.push(item.route as any);
      }, 150);
    },
    [router, onClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommandItem }) => {
      const meta = CATEGORY_META[item.category];
      return (
        <TouchableOpacity
          style={styles.resultItem}
          activeOpacity={0.7}
          onPress={() => handleSelect(item)}
        >
          <View style={[styles.iconWrap, { backgroundColor: meta.color + "20" }]}>
            <Ionicons name={item.icon as any} size={20} color={meta.color} />
          </View>
          <View style={styles.resultText}>
            <Text style={styles.resultLabel}>{item.label}</Text>
            <Text style={styles.resultDesc}>{item.description}</Text>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: meta.color + "15" }]}>
            <Text style={[styles.categoryText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleSelect]
  );

  return (
    <Modal accessibilityViewIsModal={true}
        visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close command palette">
        <View style={styles.palette} onStartShouldSetResponder={() => true}>
          {/* Search input */}
          <View style={styles.searchRow}>
            <Ionicons name="search" size={20} color={SF.muted} />
            <TextInput
              accessibilityLabel="Search commands"
          accessibilityRole="search"
          ref={inputRef}
              style={styles.searchInput}
              placeholder="Search screens, tools, actions..."
              placeholderTextColor={SF.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={() => results[0] && handleSelect(results[0])}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                setQuery("");
              }}>
                <Ionicons name="close-circle" size={20} color={SF.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={32} color={SF.muted} />
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />

          {/* Footer hint */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {results.length} result{results.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 80 : 50,
    paddingHorizontal: 16,
  },
  palette: {
    backgroundColor: SF.surface,
    borderRadius: 16,
    maxHeight: SCREEN_H * 0.65,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: SF.fg,
    paddingVertical: 4,
  },
  resultsList: {
    maxHeight: SCREEN_H * 0.45,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  resultText: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 15,
    fontFamily: "DMSans_600SemiBold",
    color: SF.fg,
  },
  resultDesc: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
    marginTop: 1,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  footerText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: SF.muted,
    textAlign: "center",
  },
});
