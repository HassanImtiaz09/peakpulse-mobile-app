// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

/**
 * SF Symbols to Material Icons mappings for FytNova
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "chart.bar.fill": "bar-chart",
  "camera.fill": "camera-alt",
  "fork.knife": "restaurant",
  "person.fill": "person",
  // General
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "xmark": "close",
  "plus": "add",
  "checkmark": "check",
  "checkmark.circle.fill": "check-circle",
  "trash": "delete",
  "pencil": "edit",
  "gear": "settings",
  "bell.fill": "notifications",
  "magnifyingglass": "search",
  "arrow.clockwise": "refresh",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "star.fill": "star",
  "heart.fill": "favorite",
  "bookmark.fill": "bookmark",
  "share": "share",
  "info.circle": "info",
  "exclamationmark.triangle": "warning",
  // Fitness
  "dumbbell.fill": "fitness-center",
  "figure.run": "directions-run",
  "flame.fill": "local-fire-department",
  "bolt.fill": "bolt",
  "trophy.fill": "emoji-events",
  "medal.fill": "military-tech",
  "timer": "timer",
  "stopwatch.fill": "timer",
  // Health
  "heart.text.square.fill": "monitor-heart",
  "waveform.path.ecg": "monitor-heart",
  "moon.fill": "bedtime",
  "drop.fill": "water-drop",
  "figure.walk": "directions-walk",
  // Food
  "leaf.fill": "eco",
  "cart.fill": "shopping-cart",
  "list.bullet": "list",
  // Camera/Media
  "photo.fill": "photo",
  "photo.on.rectangle": "photo-library",
  "camera.viewfinder": "center-focus-strong",
  // Location
  "location.fill": "location-on",
  "map.fill": "map",
  // Watch/Device
  "applewatch": "watch",
  "wifi": "wifi",
  "wifi.slash": "wifi-off",
  // Charts
  "chart.line.uptrend.xyaxis": "trending-up",
  "chart.xyaxis.line": "show-chart",
  // Misc
  "lock.fill": "lock",
  "eye.fill": "visibility",
  "eye.slash.fill": "visibility-off",
  "sparkles": "auto-awesome",
  "wand.and.stars": "auto-fix-high",
  "crown.fill": "workspace-premium",
  "person.2.fill": "group",
  "bubble.left.fill": "chat-bubble",
  "brain": "smart-toy",
  "square.and.arrow.up": "upload",
  "square.and.arrow.down": "download",
  "doc.fill": "description",
  "calendar": "calendar-today",
  "clock.fill": "schedule",
  "tag.fill": "label",
  "slider.horizontal.3": "tune",
  "arrow.up.right": "north-east",
} as Record<string, ComponentProps<typeof MaterialIcons>["name"]>;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: string;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = (MAPPING[name] ?? "help-outline") as ComponentProps<typeof MaterialIcons>["name"];
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
