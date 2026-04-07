/**
 * TransformationCard – displays the AI-generated transformation image on
 * the home dashboard with a CTA to upload progress photos.
 *
 * Shown after the user completes their first body scan.  Pulls the active
 * goal's transformation image and latest progress data from the server,
 * and shows the progress percentage toward the target body-fat.
 */

import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI, SF } from "@/constants/ui-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = SCREEN_W - 48;
const IMAGE_H = 180;

type Props = {
  /** Hide the component entirely (e.g. when user hasn't scanned yet) */
  hidden?: boolean;
};

export default function TransformationCard({ hidden }: Props) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: goal } = trpc.goals.active.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: latestCheckin } = trpc.progressCheckin.latest.useQuery(
    undefined,
    { enabled: isAuthenticated },
  );

  if (hidden || !goal) return null;

  // ── Progress calculation ─────────────────────────────────────────────────
  const startBf = goal.originalBodyFat ?? 0;
  const targetBf = goal.targetBodyFat ?? 0;
  const currentBf = latestCheckin?.bodyFatEstimate ?? startBf;
  const totalDelta = Math.abs(startBf - targetBf) || 1;
  const achievedDelta = Math.abs(startBf - currentBf);
  const progressPct = Math.min(100, Math.round((achievedDelta / totalDelta) * 100));

  const imageUrl = goal.imageUrl;

  return (
    <View style={styles.card}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>Your Transformation Goal</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{progressPct}%</Text>
        </View>
      </View>

      {/* AI-generated transformation image */}
      {imageUrl ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/body-scan-compare")}
          accessibilityRole="button"
          accessibilityLabel="View transformation comparison"
        >
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <MaterialIcons name="compare" size={18} color="#FFF" />
            <Text style={styles.overlayText}>Tap to compare</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <MaterialIcons name="auto-awesome" size={36} color="rgba(255,255,255,0.2)" />
          <Text style={styles.placeholderText}>
            Complete a body scan to see your AI transformation preview
          </Text>
        </View>
      )}

      {/* Progress bar */}
      <View style={styles.progressRow}>
        <Text style={styles.progressLabel}>
          {currentBf.toFixed(1)}% BF
        </Text>
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progressPct}%` }]}
          />
        </View>
        <Text style={styles.progressLabel}>
          {targetBf.toFixed(1)}% BF
        </Text>
      </View>

      {/* CTA buttons */}
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() => router.push("/progress-checkin")}
          accessibilityRole="button"
          accessibilityLabel="Upload progress photo"
        >
          <MaterialIcons name="add-a-photo" size={18} color={SF.darkBg} />
          <Text style={styles.ctaPrimaryText}>Upload Progress Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => router.push("/progress-photos")}
          accessibilityRole="button"
          accessibilityLabel="View progress gallery"
        >
          <MaterialIcons name="photo-library" size={18} color={UI.lime400} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: UI.lime400,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: SF.darkBg,
  },
  image: {
    width: CARD_W - 32,
    height: IMAGE_H,
    borderRadius: 14,
    marginBottom: 12,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 20,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  overlayText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#FFFFFF",
  },
  placeholderImage: {
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    maxWidth: 220,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  progressLabel: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    width: 55,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: UI.lime400,
  },
  ctaRow: {
    flexDirection: "row",
    gap: 10,
  },
  ctaPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.lime400,
    paddingVertical: 12,
    borderRadius: 14,
  },
  ctaPrimaryText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: SF.darkBg,
  },
  ctaSecondary: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
  },
});
