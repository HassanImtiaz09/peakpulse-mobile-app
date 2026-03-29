import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, Image, Dimensions,
  Platform, Modal, FlatList, Animated, PanResponder, ImageBackground} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { GOLDEN_SCAN, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { UI as SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_W = SCREEN_W - 40;
const PHOTO_H = Math.round(PHOTO_W * (4 / 3));

interface ScanEntry {
  date: string;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  weightKg?: number;
  photoUrl?: string;
  transformations?: Array<{ target_bf: number; imageUrl: string }>;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

function deltaText(a: number | undefined, b: number | undefined, unit: string, lowerIsBetter = true) {
  if (a == null || b == null) return null;
  const diff = b - a;
  if (Math.abs(diff) < 0.01) return { text: `${unit} unchanged`, color: SF.muted };
  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "";
  return { text: `${sign}${diff.toFixed(1)}${unit}`, color: isGood ? SF.green : SF.red };
}

export default function BodyScanCompareScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [scans, setScans] = useState<ScanEntry[]>([]);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(0);
  const [datePickerVisible, setDatePickerVisible] = useState<"left" | "right" | null>(null);
  const sliderX = useRef(new Animated.Value(PHOTO_W / 2)).current;

  // Load scan history from AsyncStorage (guest) + server (authenticated)
  useEffect(() => {
    AsyncStorage.getItem("@body_scan_history").then((raw) => {
      if (raw) {
        try {
          const parsed: ScanEntry[] = JSON.parse(raw);
          const sorted = parsed.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          setScans(sorted);
          if (sorted.length >= 2) {
            setLeftIdx(0);
            setRightIdx(sorted.length - 1);
          }
        } catch { /* ignore */ }
      }
    });
  }, []);

  // Also load from server for authenticated users
  const serverScans = trpc.bodyScan.getHistory.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const allScans = useMemo(() => {
    const server = (serverScans.data ?? []) as ScanEntry[];
    // Merge server + local, deduplicate by date
    const map = new Map<string, ScanEntry>();
    for (const s of scans) map.set(s.date, s);
    for (const s of server) map.set(s.date, s);
    return Array.from(map.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [scans, serverScans.data]);

  const leftScan = allScans[leftIdx] ?? null;
  const rightScan = allScans[rightIdx] ?? null;

  const leftPhoto = leftScan?.photoUrl ?? leftScan?.transformations?.[0]?.imageUrl;
  const rightPhoto = rightScan?.photoUrl ?? rightScan?.transformations?.[0]?.imageUrl;

  // Slider pan responder for comparison
  const panResponder = useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(20, Math.min(PHOTO_W - 20, gesture.moveX - 20));
        sliderX.setValue(newX);
      },
    }), []);

  const stats = useMemo(() => {
    if (!leftScan || !rightScan) return [];
    const items: Array<{ label: string; delta: { text: string; color: string } | null; left: string; right: string }> = [];

    const bfDelta = deltaText(leftScan.bodyFatPercent, rightScan.bodyFatPercent, "% BF", true);
    if (leftScan.bodyFatPercent != null || rightScan.bodyFatPercent != null) {
      items.push({
        label: "Body Fat",
        delta: bfDelta,
        left: leftScan.bodyFatPercent != null ? `${leftScan.bodyFatPercent}%` : "—",
        right: rightScan.bodyFatPercent != null ? `${rightScan.bodyFatPercent}%` : "—",
      });
    }

    const weightDelta = deltaText(leftScan.weightKg, rightScan.weightKg, " kg", true);
    if (leftScan.weightKg != null || rightScan.weightKg != null) {
      items.push({
        label: "Weight",
        delta: weightDelta,
        left: leftScan.weightKg != null ? `${leftScan.weightKg} kg` : "—",
        right: rightScan.weightKg != null ? `${rightScan.weightKg} kg` : "—",
      });
    }

    const muscleDelta = deltaText(leftScan.muscleMassKg, rightScan.muscleMassKg, " kg", false);
    if (leftScan.muscleMassKg != null || rightScan.muscleMassKg != null) {
      items.push({
        label: "Muscle Mass",
        delta: muscleDelta,
        left: leftScan.muscleMassKg != null ? `${leftScan.muscleMassKg} kg` : "—",
        right: rightScan.muscleMassKg != null ? `${rightScan.muscleMassKg} kg` : "—",
      });
    }

    return items;
  }, [leftScan, rightScan]);

  // Days between scans
  const daysBetween = useMemo(() => {
    if (!leftScan || !rightScan) return 0;
    const diff = new Date(rightScan.date).getTime() - new Date(leftScan.date).getTime();
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }, [leftScan, rightScan]);

  if (allScans.length < 2) {
    return (
      <ImageBackground source={{ uri: GOLDEN_SCAN }} style={{ flex: 1 }} resizeMode="cover">
      <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
        <View style={{ flex: 1, backgroundColor: SF.bg, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ position: "absolute", top: 16, left: 20, padding: 4 }}>
            <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
          </TouchableOpacity>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📸</Text>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18, textAlign: "center", marginBottom: 8 }}>
            Need 2+ Body Scans
          </Text>
          <Text style={{ color: SF.muted, fontSize: 13, textAlign: "center", lineHeight: 20 }}>
            Complete at least two body scans on different dates to unlock the side-by-side comparison view. Go to the Body Scan tab to take your next scan.
          </Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: SF.gold, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
            <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
      </ImageBackground>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <ScrollView style={{ flex: 1, backgroundColor: SF.bg }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <MaterialIcons name="arrow-back" size={24} color={SF.gold} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 22 }}>Progress Comparison</Text>
              <Text style={{ color: SF.muted, fontSize: 12, marginTop: 2 }}>
                {daysBetween > 0 ? `${daysBetween} days apart` : "Select two dates to compare"}
              </Text>
            </View>
          </View>
        </View>

        {/* Date selectors */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={{
              flex: 1, backgroundColor: SF.surface, borderRadius: 14, padding: 12,
              borderWidth: 1, borderColor: SF.border2, alignItems: "center",
            }}
            onPress={() => setDatePickerVisible("left")}
          >
            <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>BEFORE</Text>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
              {leftScan ? formatDate(leftScan.date) : "Select"}
            </Text>
            {leftScan?.bodyFatPercent != null && (
              <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>{leftScan.bodyFatPercent}% BF</Text>
            )}
          </TouchableOpacity>

          <View style={{ alignItems: "center", justifyContent: "center" }}>
            <MaterialIcons name="compare-arrows" size={24} color={SF.gold} />
          </View>

          <TouchableOpacity
            style={{
              flex: 1, backgroundColor: SF.surface, borderRadius: 14, padding: 12,
              borderWidth: 1, borderColor: "rgba(16,185,129,0.25)", alignItems: "center",
            }}
            onPress={() => setDatePickerVisible("right")}
          >
            <Text style={{ color: SF.green, fontFamily: "DMSans_700Bold", fontSize: 10, letterSpacing: 1, marginBottom: 4 }}>AFTER</Text>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>
              {rightScan ? formatDate(rightScan.date) : "Select"}
            </Text>
            {rightScan?.bodyFatPercent != null && (
              <Text style={{ color: SF.muted, fontSize: 11, marginTop: 2 }}>{rightScan.bodyFatPercent}% BF</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Photo comparison slider */}
        {leftPhoto && rightPhoto ? (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <View style={{
              width: PHOTO_W, height: PHOTO_H, borderRadius: 20, overflow: "hidden",
              backgroundColor: SF.surface, borderWidth: 1, borderColor: SF.border,
            }}>
              {/* Right photo (full width behind) */}
              <Image source={{ uri: rightPhoto }} style={{ position: "absolute", width: PHOTO_W, height: PHOTO_H }} resizeMode="cover" />

              {/* Left photo (clipped by slider) */}
              <Animated.View style={{
                position: "absolute", top: 0, left: 0, bottom: 0,
                width: sliderX, overflow: "hidden",
              }}>
                <Image source={{ uri: leftPhoto }} style={{ width: PHOTO_W, height: PHOTO_H }} resizeMode="cover" />
              </Animated.View>

              {/* Slider handle */}
              <Animated.View
                {...panResponder.panHandlers}
                style={{
                  position: "absolute", top: 0, bottom: 0,
                  left: Animated.subtract(sliderX, 16),
                  width: 32, alignItems: "center", justifyContent: "center",
                }}
              >
                <View style={{ width: 3, height: "100%", backgroundColor: SF.gold }} />
                <View style={{
                  position: "absolute", width: 36, height: 36, borderRadius: 18,
                  backgroundColor: SF.gold, alignItems: "center", justifyContent: "center",
                  shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4,
                  elevation: 6,
                }}>
                  <MaterialIcons name="drag-handle" size={20} color={SF.bg} />
                </View>
              </Animated.View>

              {/* Labels */}
              <View style={{ position: "absolute", top: 12, left: 12, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 11 }}>BEFORE</Text>
              </View>
              <View style={{ position: "absolute", top: 12, right: 12, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: SF.green, fontFamily: "DMSans_700Bold", fontSize: 11 }}>AFTER</Text>
              </View>
            </View>

            <Text style={{ color: SF.muted, fontSize: 10, textAlign: "center", marginTop: 8 }}>
              Drag the slider to compare before and after
            </Text>
          </View>
        ) : (
          <View style={{
            marginHorizontal: 20, marginBottom: 16, backgroundColor: SF.surface,
            borderRadius: 20, padding: 32, alignItems: "center",
            borderWidth: 1, borderColor: SF.border,
          }}>
            <Text style={{ fontSize: 40, marginBottom: 8 }}>🖼️</Text>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14, marginBottom: 4 }}>No Photos Available</Text>
            <Text style={{ color: SF.muted, fontSize: 12, textAlign: "center" }}>
              The selected scans don't have photos attached. Take a photo during your next body scan to enable the visual comparison.
            </Text>
          </View>
        )}

        {/* Stats comparison */}
        {stats.length > 0 && (
          <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
            <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 12 }}>Stats Comparison</Text>
            {stats.map((stat, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: SF.surface, borderRadius: 14, padding: 14,
                  borderWidth: 1, borderColor: SF.border, marginBottom: 8,
                }}
              >
                <Text style={{ color: SF.muted, fontSize: 10, fontFamily: "DMSans_700Bold", letterSpacing: 1, marginBottom: 8 }}>
                  {stat.label.toUpperCase()}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 20 }}>{stat.left}</Text>
                    <Text style={{ color: SF.muted, fontSize: 9, marginTop: 2 }}>Before</Text>
                  </View>
                  <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
                    {stat.delta ? (
                      <Text style={{ color: stat.delta.color, fontFamily: "BebasNeue_400Regular", fontSize: 16 }}>
                        {stat.delta.text}
                      </Text>
                    ) : (
                      <Text style={{ color: SF.muted, fontSize: 12 }}>—</Text>
                    )}
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ color: SF.green, fontFamily: "DMSans_700Bold", fontSize: 20 }}>{stat.right}</Text>
                    <Text style={{ color: SF.muted, fontSize: 9, marginTop: 2 }}>After</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Timeline */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 12 }}>Scan Timeline</Text>
          {allScans.map((scan, i) => {
            const isLeft = i === leftIdx;
            const isRight = i === rightIdx;
            return (
              <TouchableOpacity
                key={scan.date}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  backgroundColor: isLeft || isRight ? "rgba(245,158,11,0.08)" : SF.surface,
                  borderRadius: 12, padding: 12, marginBottom: 6,
                  borderWidth: 1,
                  borderColor: isLeft ? SF.border2 : isRight ? "rgba(16,185,129,0.25)" : SF.border,
                }}
                onPress={() => {
                  // Tap to set as left or right depending on which is closer
                  if (datePickerVisible === "left") { setLeftIdx(i); setDatePickerVisible(null); }
                  else if (datePickerVisible === "right") { setRightIdx(i); setDatePickerVisible(null); }
                }}
              >
                {scan.photoUrl ? (
                  <Image source={{ uri: scan.photoUrl }} style={{ width: 44, height: 56, borderRadius: 8, backgroundColor: SF.surface2 }} resizeMode="cover" />
                ) : (
                  <View style={{ width: 44, height: 56, borderRadius: 8, backgroundColor: SF.surface2, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: 18 }}>📸</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>{formatDate(scan.date)}</Text>
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 3 }}>
                    {scan.bodyFatPercent != null && <Text style={{ color: SF.muted, fontSize: 11 }}>{scan.bodyFatPercent}% BF</Text>}
                    {scan.weightKg != null && <Text style={{ color: SF.muted, fontSize: 11 }}>{scan.weightKg} kg</Text>}
                  </View>
                </View>
                {isLeft && (
                  <View style={{ backgroundColor: SF.gold, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: SF.bg, fontSize: 9, fontFamily: "DMSans_700Bold" }}>BEFORE</Text>
                  </View>
                )}
                {isRight && (
                  <View style={{ backgroundColor: SF.green, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: SF.bg, fontSize: 9, fontFamily: "DMSans_700Bold" }}>AFTER</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tip */}
        <View style={{
          marginHorizontal: 20, marginTop: 4,
          backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 16,
          padding: 14, borderWidth: 1, borderColor: SF.border,
        }}>
          <Text style={{ color: SF.gold3, fontSize: 12, lineHeight: 18 }}>
            {"💡 "}
            <Text style={{ fontFamily: "DMSans_700Bold" }}>Tip:</Text>
            {" Take body scan photos in the same lighting and pose for the most accurate comparison. Weekly scans are ideal for tracking progress."}
          </Text>
        </View>
      </ScrollView>

      {/* Date picker modal */}
      <Modal visible={datePickerVisible !== null} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" }}>
          <View style={{
            backgroundColor: SF.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
            maxHeight: "60%", paddingBottom: Platform.OS === "ios" ? 34 : 20,
          }}>
            <View style={{
              flexDirection: "row", justifyContent: "space-between", alignItems: "center",
              padding: 20, borderBottomWidth: 1, borderBottomColor: SF.border,
            }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 18 }}>
                Select {datePickerVisible === "left" ? "Before" : "After"} Date
              </Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(null)} style={{ padding: 4 }}>
                <MaterialIcons name="close" size={24} color={SF.muted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={allScans}
              keyExtractor={(item) => item.date}
              contentContainerStyle={{ padding: 20, gap: 8 }}
              renderItem={({ item, index }) => {
                const isSelected = datePickerVisible === "left" ? index === leftIdx : index === rightIdx;
                const isDisabled = datePickerVisible === "left" ? index >= rightIdx : index <= leftIdx;
                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row", alignItems: "center", gap: 12,
                      backgroundColor: isSelected ? "rgba(245,158,11,0.12)" : SF.surface2,
                      borderRadius: 12, padding: 14,
                      borderWidth: 1,
                      borderColor: isSelected ? SF.gold : SF.border,
                      opacity: isDisabled ? 0.4 : 1,
                    }}
                    disabled={isDisabled}
                    onPress={() => {
                      if (datePickerVisible === "left") setLeftIdx(index);
                      else setRightIdx(index);
                      setDatePickerVisible(null);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }}>{formatDate(item.date)}</Text>
                      <View style={{ flexDirection: "row", gap: 10, marginTop: 3 }}>
                        {item.bodyFatPercent != null && <Text style={{ color: SF.muted, fontSize: 11 }}>{item.bodyFatPercent}% BF</Text>}
                        {item.weightKg != null && <Text style={{ color: SF.muted, fontSize: 11 }}>{item.weightKg} kg</Text>}
                      </View>
                    </View>
                    {isSelected && <MaterialIcons name="check-circle" size={22} color={SF.gold} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
