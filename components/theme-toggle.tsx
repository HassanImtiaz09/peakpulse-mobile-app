import { TouchableOpacity, Platform, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useThemeContext } from "@/lib/theme-provider";
import { useColors } from "@/hooks/use-colors";

/**
 * A compact theme toggle button that cycles: dark → light → system → dark.
 * Designed to sit in the top-right corner of the app alongside the search FAB.
 */
export function ThemeToggle() {
  const { colorScheme, themePreference, setThemePreference } = useThemeContext();
  const colors = useColors();

  const iconName: keyof typeof MaterialIcons.glyphMap =
    themePreference === "system"
      ? "brightness-auto"
      : colorScheme === "dark"
        ? "dark-mode"
        : "light-mode";

  function handlePress() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    // Cycle: dark → light → system → dark
    if (themePreference === "dark") {
      setThemePreference("light");
    } else if (themePreference === "light") {
      setThemePreference("system");
    } else {
      setThemePreference("dark");
    }
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.button,
        {
          backgroundColor:
            colorScheme === "dark"
              ? "rgba(245,158,11,0.12)"
              : "rgba(217,119,6,0.12)",
          borderColor:
            colorScheme === "dark"
              ? "rgba(245,158,11,0.25)"
              : "rgba(217,119,6,0.25)",
        },
      ]}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={iconName}
        size={18}
        color={colorScheme === "dark" ? "#F59E0B" : "#D97706"}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
