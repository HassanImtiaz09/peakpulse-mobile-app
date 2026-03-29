/**
 * GuestMigrationModal — Shown after signup when guest data exists.
 * Offers to migrate AsyncStorage data to the server account.
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ActivityIndicator, Dimensions,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { UI } from "@/constants/ui-colors";
import {
  hasGuestDataToMigrate,
  migrateGuestDataToAccount,
  getMigrationPromptConfig,
  type MigrationResult,
} from "@/lib/guest-data-migration";

const { width: W } = Dimensions.get("window");

interface Props {
  visible: boolean;
  onClose: () => void;
  /** tRPC mutation to upload data. (key, data) => Promise<void> */
  uploadFn: (key: string, data: unknown) => Promise<void>;
}

type Phase = "checking" | "prompt" | "migrating" | "success" | "error" | "nodata";

export function GuestMigrationModal({ visible, onClose, uploadFn }: Props) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [result, setResult] = useState<MigrationResult | null>(null);
  const config = getMigrationPromptConfig();

  useEffect(() => {
    if (visible) {
      checkData();
    }
  }, [visible]);

  async function checkData() {
    setPhase("checking");
    const hasData = await hasGuestDataToMigrate();
    setPhase(hasData ? "prompt" : "nodata");
    if (!hasData) {
      setTimeout(onClose, 1500);
    }
  }

  async function handleMigrate() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("migrating");
    const res = await migrateGuestDataToAccount(uploadFn);
    setResult(res);
    setPhase(res.success ? "success" : "error");
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {phase === "checking" && (
            <>
              <ActivityIndicator color={UI.gold} size="large" />
              <Text style={styles.title}>Checking for existing data...</Text>
            </>
          )}

          {phase === "nodata" && (
            <>
              <MaterialIcons name="check-circle" size={48} color={UI.green} />
              <Text style={styles.title}>All set!</Text>
              <Text style={styles.desc}>No guest data found. Starting fresh.</Text>
            </>
          )}

          {phase === "prompt" && (
            <>
              <MaterialIcons name="cloud-upload" size={48} color={UI.gold} />
              <Text style={styles.title}>{config.title}</Text>
              <Text style={styles.desc}>{config.message}</Text>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleMigrate}
                accessibilityRole="button"
                accessibilityLabel={config.confirmLabel}
              >
                <MaterialIcons name="cloud-upload" size={18} color={UI.bg} />
                <Text style={styles.primaryBtnText}>{config.confirmLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleSkip}
                accessibilityRole="button"
                accessibilityLabel={config.cancelLabel}
              >
                <Text style={styles.secondaryBtnText}>{config.cancelLabel}</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === "migrating" && (
            <>
              <ActivityIndicator color={UI.gold} size="large" />
              <Text style={styles.title}>Importing your data...</Text>
              <Text style={styles.desc}>This may take a moment.</Text>
            </>
          )}

          {phase === "success" && (
            <>
              <MaterialIcons name="check-circle" size={48} color={UI.green} />
              <Text style={styles.title}>Data Imported!</Text>
              <Text style={styles.desc}>
                {result?.migratedItems.length ?? 0} data categories imported successfully.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}

          {phase === "error" && (
            <>
              <MaterialIcons name="error-outline" size={48} color={UI.red} />
              <Text style={styles.title}>Partial Import</Text>
              <Text style={styles.desc}>
                {result?.migratedItems.length ?? 0} items imported,{" "}
                {result?.failedItems.length ?? 0} failed. You can retry later from Settings.
              </Text>
              <TouchableOpacity style={styles.primaryBtn} onPress={onClose}>
                <Text style={styles.primaryBtnText}>Continue Anyway</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: W - 48,
    backgroundColor: UI.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: UI.borderGold,
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  title: {
    color: UI.fg,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 8,
  },
  desc: {
    color: UI.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 8,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: UI.gold,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
    width: "100%",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: UI.bg,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    color: UI.muted,
    fontSize: 14,
    fontWeight: "500",
  },
});
