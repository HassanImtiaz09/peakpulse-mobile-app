/**
 * AiLimitModal — Unified upgrade prompt when AI rate limits are exceeded.
 * 
 * Usage:
 *   const { showLimitModal, AiLimitModalComponent } = useAiLimitModal();
 *   
 *   // In a catch block:
 *   if (error.message.includes("AI_LIMIT_EXCEEDED")) {
 *     showLimitModal(error.message);
 *     return;
 *   }
 *   
 *   // In JSX:
 *   <AiLimitModalComponent />
 */
import React, { useState, useCallback, createContext, useContext } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { UI } from "@/constants/ui-colors";

const { width: W } = Dimensions.get("window");

interface AiLimitContextValue {
  showLimitModal: (errorMessage?: string) => void;
}

const AiLimitContext = createContext<AiLimitContextValue>({
  showLimitModal: () => {},
});

export function useAiLimit() {
  return useContext(AiLimitContext);
}

interface Props {
  children: React.ReactNode;
}

/**
 * Wrap your app (or a subtree) with this provider.
 * Then call `useAiLimit().showLimitModal(err)` from any screen.
 */
export function AiLimitProvider({ children }: Props) {
  const [visible, setVisible] = useState(false);
  const [detail, setDetail] = useState("");
  const router = useRouter();

  const showLimitModal = useCallback((errorMessage?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    // Parse the detail from "AI_LIMIT_EXCEEDED:You have used all 5 AI calls..."
    const msg = errorMessage?.split("AI_LIMIT_EXCEEDED:")[1] ?? 
      "You've reached your AI usage limit for this month.";
    setDetail(msg);
    setVisible(true);
  }, []);

  const handleUpgrade = () => {
    setVisible(false);
    router.push("/subscription-plans" as any);
  };

  const handleClose = () => setVisible(false);

  return (
    <AiLimitContext.Provider value={{ showLimitModal }}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <MaterialIcons name="auto-awesome" size={32} color={UI.gold} />
            </View>

            <Text style={styles.title}>AI Limit Reached</Text>
            <Text style={styles.desc}>{detail}</Text>

            <View style={styles.featureRow}>
              <MaterialIcons name="all-inclusive" size={18} color={UI.gold2} />
              <Text style={styles.featureText}>Upgrade for unlimited AI calls</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="bolt" size={18} color={UI.gold2} />
              <Text style={styles.featureText}>Priority AI processing</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialIcons name="stars" size={18} color={UI.gold2} />
              <Text style={styles.featureText}>Unlock all premium features</Text>
            </View>

            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={handleUpgrade}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Upgrade to Pro"
            >
              <MaterialIcons name="workspace-premium" size={20} color={UI.bg} />
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Maybe later"
            >
              <Text style={styles.closeBtnText}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AiLimitContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: W - 48,
    backgroundColor: UI.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.borderGold2,
    padding: 28,
    alignItems: "center",
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245,158,11,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    color: UI.fg,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  desc: {
    color: UI.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingLeft: 12,
  },
  featureText: {
    color: UI.fg,
    fontSize: 14,
    fontWeight: "500",
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.gold,
    paddingVertical: 15,
    paddingHorizontal: 32,
    borderRadius: 14,
    marginTop: 16,
    width: "100%",
    justifyContent: "center",
  },
  upgradeBtnText: {
    color: UI.bg,
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  closeBtnText: {
    color: UI.muted,
    fontSize: 14,
  },
});
