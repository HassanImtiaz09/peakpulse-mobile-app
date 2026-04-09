import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, PanResponder, Animated, Dimensions, LayoutChangeEvent,
  Modal, KeyboardAvoidingView, FlatList, ImageBackground} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { captureRef } from "react-native-view-shot";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { FeatureGate } from "@/components/feature-gate";

import { GOLDEN_SCAN, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { EmptyState, EMPTY_STATES } from "@/components/empty-state";
import { useAiLimit } from "@/components/ai-limit-modal";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { incrementCounter } from "@/lib/achievements";
const { width: SCREEN_W } = Dimensions.get("window");
const CARD_PADDING = 40;
const CARD_W = SCREEN_W - CARD_PADDING;
const SLIDER_H = Math.round(CARD_W * (4 / 3));
const COLLAGE_W = 1080;
const COLLAGE_H = 1350;
const PHOTO_W = COLLAGE_W / 2;

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProgressPhoto {
  id: number;
  photoUrl: string;
  note?: string | null;
  isBaseline: boolean;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  createdAt: string | Date;
}

interface MonthGroup {
  key: string;       // "2025-11"
  label: string;     // "Nov 2025"
  photos: ProgressPhoto[];
  latest: ProgressPhoto;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string | Date) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return String(iso); }
}

function monthKey(iso: string | Date) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function groupByMonth(photos: ProgressPhoto[]): MonthGroup[] {
  const map = new Map<string, ProgressPhoto[]>();
  const sorted = [...photos].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const p of sorted) {
    const k = monthKey(p.createdAt);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const groups: MonthGroup[] = [];
  map.forEach((ps, k) => {
    const byDate = [...ps].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    groups.push({ key: k, label: monthLabel(k), photos: ps, latest: byDate[0] });
  });
  return groups.sort((a, b) => a.key.localeCompare(b.key));
}

function deltaSign(val: number) { return val > 0 ? "+" : ""; }

function buildDefaultCaption(params: { name?: string; goal?: string; firstDate: string; latestDate: string }) {
  const { name, goal, firstDate, latestDate } = params;
  let weekStr = "";
  try {
    const diffMs = new Date(latestDate).getTime() - new Date(firstDate).getTime();
    const weeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
    if (weeks > 0) weekStr = `${weeks} week${weeks !== 1 ? "s" : ""} of consistency`;
  } catch { /* ignore */ }
  const goalLabel = goal ? goal.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "my fitness goal";
  const greeting = name ? `${name}'s ` : "";
  return [
    `${weekStr ? weekStr.charAt(0).toUpperCase() + weekStr.slice(1) + " 💪" : "Consistency pays off 💪"}`,
    ``,
    `${greeting}transformation journey — working towards ${goalLabel}.`,
    ``,
    `Tracking every step with @PeakPulseAI ⚡`,
    ``,
    `#PeakPulseTransformation #FitnessJourney #Transformation #BodyRecomposition`,
  ].join("\n");
}

// ─── Collage template (off-screen, captured by ViewShot) ─────────────────────
const CollageTemplate = React.forwardRef<View, {
  firstUrl: string; latestUrl: string;
  firstDate: string; latestDate: string;
  firstWeight?: number | null; latestWeight?: number | null;
  firstBF?: number | null; latestBF?: number | null;
}>(({ firstUrl, latestUrl, firstDate, latestDate, firstWeight, latestWeight, firstBF, latestBF }, ref) => {
  const weightDelta = (firstWeight && latestWeight) ? latestWeight - firstWeight : null;
  const bfDelta = (firstBF && latestBF) ? latestBF - firstBF : null;

  return (
    <View
      ref={ref as any}
      style={{ width: COLLAGE_W, height: COLLAGE_H, backgroundColor: "#0A0E14", flexDirection: "column", overflow: "hidden" }}
      collapsable={false}
    >
      {/* Header */}
      <View style={{ height: 100, backgroundColor: "#0A0E14", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <Text style={{ color: "#F59E0B", fontSize: 36, fontWeight: "900", letterSpacing: 2 }}>⚡ PEAKPULSE</Text>
        <Text style={{ color: "#B45309", fontSize: 28 }}>TRANSFORMATION</Text>
      </View>

      {/* Photos */}
      <View style={{ flex: 1, flexDirection: "row" }}>
        <View style={{ width: PHOTO_W, position: "relative" }}>
          <Image source={{ uri: firstUrl }} style={{ width: PHOTO_W, height: COLLAGE_H - 100 - 160 }} resizeMode="cover" />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(10,5,0,0.80)", paddingVertical: 18, alignItems: "center" }}>
            <Text style={{ color: "#F59E0B", fontSize: 30, fontWeight: "700", letterSpacing: 2 }}>THEN</Text>
            <Text style={{ color: "#B45309", fontSize: 20, marginTop: 4 }}>{firstDate}</Text>
            {firstWeight != null && <Text style={{ color: "#FDE68A", fontSize: 20, marginTop: 4 }}>{firstWeight} kg</Text>}
            {firstBF != null && <Text style={{ color: "#FDE68A", fontSize: 20, marginTop: 2 }}>{firstBF}% BF</Text>}
          </View>
        </View>
        <View style={{ width: 4, backgroundColor: "#F59E0B" }} />
        <View style={{ width: PHOTO_W - 4, position: "relative" }}>
          <Image source={{ uri: latestUrl }} style={{ width: PHOTO_W - 4, height: COLLAGE_H - 100 - 160 }} resizeMode="cover" />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(10,5,0,0.80)", paddingVertical: 18, alignItems: "center" }}>
            <Text style={{ color: "#10B981", fontSize: 30, fontWeight: "700", letterSpacing: 2 }}>NOW</Text>
            <Text style={{ color: "#B45309", fontSize: 20, marginTop: 4 }}>{latestDate}</Text>
            {latestWeight != null && <Text style={{ color: "#6EE7B7", fontSize: 20, marginTop: 4 }}>{latestWeight} kg</Text>}
            {latestBF != null && <Text style={{ color: "#6EE7B7", fontSize: 20, marginTop: 2 }}>{latestBF}% BF</Text>}
          </View>
        </View>
      </View>

      {/* Delta bar */}
      <View style={{ height: 160, backgroundColor: "#0A0E14", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 48, paddingHorizontal: 40 }}>
        {weightDelta != null && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: weightDelta <= 0 ? "#10B981" : "#F87171", fontSize: 44, fontWeight: "900" }}>
              {deltaSign(weightDelta)}{weightDelta.toFixed(1)} kg
            </Text>
            <Text style={{ color: "#B45309", fontSize: 22, marginTop: 4 }}>Weight Change</Text>
          </View>
        )}
        {bfDelta != null && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: bfDelta <= 0 ? "#10B981" : "#F87171", fontSize: 44, fontWeight: "900" }}>
              {deltaSign(bfDelta)}{bfDelta.toFixed(1)}%
            </Text>
            <Text style={{ color: "#B45309", fontSize: 22, marginTop: 4 }}>Body Fat</Text>
          </View>
        )}
        {weightDelta == null && bfDelta == null && (
          <Text style={{ color: "#451A03", fontSize: 26 }}>peakpulse.ai  •  #PeakPulseTransformation</Text>
        )}
      </View>

      {/* Footer */}
      <View style={{ height: 60, backgroundColor: "#0A0E14", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#451A03", fontSize: 22, letterSpacing: 1 }}>peakpulse.ai  •  #PeakPulseTransformation</Text>
      </View>
    </View>
  );
});
CollageTemplate.displayName = "CollageTemplate";

// ─── Caption bottom sheet ─────────────────────────────────────────────────────
function CaptionSheet({ visible, caption, onChangeCaption, onClose, onShare, sharing }: {
  visible: boolean; caption: string; onChangeCaption: (t: string) => void;
  onClose: () => void; onShare: () => void; sharing: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { showLimitModal } = useAiLimit();
  async function copyCaption() {
    await Clipboard.setStringAsync(caption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: "#0A0E14", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, borderTopWidth: 1, borderColor: "rgba(245,158,11,0.2)" }}>
          <View style={{ width: 40, height: 4, backgroundColor: "#451A03", borderRadius: 2, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ color: "#F1F5F9", fontWeight: "700", fontSize: 17, marginBottom: 4 }}>Customise Your Caption</Text>
          <Text style={{ color: "#B45309", fontSize: 12, marginBottom: 16 }}>Edit caption below. Auto-copied on share.</Text>
          <View style={{ backgroundColor: "#141A22", borderRadius: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.15)", marginBottom: 12 }}>
            <TextInput
              value={caption} onChangeText={onChangeCaption} multiline numberOfLines={6}
              style={{ color: "#F1F5F9", fontSize: 14, lineHeight: 22, padding: 14, minHeight: 130, textAlignVertical: "top" }}
              placeholderTextColor="#451A03"
            />
          </View>
          <Text style={{ color: "#451A03", fontSize: 11, textAlign: "right", marginBottom: 14 }}>{caption.length} characters</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
            {["#Transformation", "#FitnessJourney", "#BodyRecomposition", "#PeakPulse", "#GymLife", "#FatLoss", "#BulkSeason"].map((tag) => (
              <TouchableOpacity key={tag}
                style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(245,158,11,0.18)" }}
                onPress={() => { if (!caption.includes(tag)) onChangeCaption(caption.trimEnd() + " " + tag); }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: "rgba(245,158,11,0.12)", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" }}
              onPress={copyCaption}>
              <Text style={{ fontSize: 16 }}>{copied ? "✅" : "📋"}</Text>
              <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 13 }}>{copied ? "Copied!" : "Copy Caption"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ flex: 1.4, backgroundColor: sharing ? "rgba(245,158,11,0.4)" : "#F59E0B", borderRadius: 14, paddingVertical: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
              onPress={onShare} disabled={sharing}>
              {sharing
                ? <><ActivityIndicator size="small" color="#0A0E14" /><Text style={{ color: "#0A0E14", fontWeight: "700", fontSize: 13 }}>Saving…</Text></>
                : <><Text style={{ fontSize: 16 }}>📤</Text><Text style={{ color: "#0A0E14", fontWeight: "700", fontSize: 13 }}>Share Collage</Text></>}
            </TouchableOpacity>
          </View>
          <Text style={{ color: "#451A03", fontSize: 10, textAlign: "center", marginTop: 10 }}>Caption auto-copied to clipboard when you tap Share</Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Timeline Scrubber ────────────────────────────────────────────────────────
function TimelineScrubber({ groups, leftIdx, rightIdx, onLeftChange, onRightChange }: {
  groups: MonthGroup[];
  leftIdx: number; rightIdx: number;
  onLeftChange: (i: number) => void;
  onRightChange: (i: number) => void;
}) {
  if (groups.length < 2) return null;

  return (
    <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
      <Text style={{ color: "#B45309", fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 10, textAlign: "center" }}>
        TIMELINE — SELECT ANY TWO MONTHS TO COMPARE
      </Text>

      {/* Month chips row */}
      <FlatList
        data={groups}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(g) => g.key}
        contentContainerStyle={{ paddingHorizontal: 4, gap: 8 }}
        renderItem={({ item, index }) => {
          const isLeft = index === leftIdx;
          const isRight = index === rightIdx;
          const isBetween = index > leftIdx && index < rightIdx;
          return (
            <TouchableOpacity
              style={{
                paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                backgroundColor: isLeft ? "#F59E0B" : isRight ? "#10B981" : isBetween ? "rgba(245,158,11,0.08)" : "#141A22",
                borderWidth: 1,
                borderColor: isLeft ? "#F59E0B" : isRight ? "#10B981" : "rgba(245,158,11,0.15)",
              }}
              onPress={() => {
                // Tap: assign to left or right depending on which is closer
                if (index <= leftIdx) { onLeftChange(index); }
                else if (index >= rightIdx) { onRightChange(index); }
                else {
                  // Between: move the closer endpoint
                  const distLeft = index - leftIdx;
                  const distRight = rightIdx - index;
                  if (distLeft <= distRight) onLeftChange(index);
                  else onRightChange(index);
                }
              }}
            >
              <Text style={{ color: isLeft || isRight ? "#0A0E14" : "#B45309", fontSize: 12, fontWeight: isLeft || isRight ? "700" : "400" }}>
                {item.label}
              </Text>
              {isLeft && <Text style={{ color: "#0A0E14", fontSize: 9, fontWeight: "700", textAlign: "center" }}>THEN</Text>}
              {isRight && <Text style={{ color: "#0A0E14", fontSize: 9, fontWeight: "700", textAlign: "center" }}>NOW</Text>}
            </TouchableOpacity>
          );
        }}
      />

      {/* Connector line */}
      <View style={{ height: 2, backgroundColor: "rgba(245,158,11,0.10)", marginTop: 8, marginHorizontal: 4, borderRadius: 1 }} />
    </View>
  );
}

// ─── Comparison Slider ────────────────────────────────────────────────────────
function ComparisonSlider({ leftPhoto, rightPhoto, userName, userGoal }: {
  leftPhoto: ProgressPhoto; rightPhoto: ProgressPhoto;
  userName?: string; userGoal?: string;
}) {
  const sliderX = useRef(new Animated.Value(CARD_W / 2)).current;
  const lastX = useRef(CARD_W / 2);
  const [containerW, setContainerW] = useState(CARD_W);
  const collageRef = useRef<View>(null);
  const [exporting, setExporting] = useState(false);
  const [captionVisible, setCaptionVisible] = useState(false);
  const [caption, setCaption] = useState(() =>
    buildDefaultCaption({ name: userName, goal: userGoal, firstDate: String(leftPhoto.createdAt), latestDate: String(rightPhoto.createdAt) })
  );

  // Recompute caption when photos change
  React.useEffect(() => {
    setCaption(buildDefaultCaption({ name: userName, goal: userGoal, firstDate: String(leftPhoto.createdAt), latestDate: String(rightPhoto.createdAt) }));
  }, [leftPhoto.id, rightPhoto.id]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { sliderX.stopAnimation((val) => { lastX.current = val; }); },
      onPanResponderMove: (_, gs) => {
        const next = Math.max(4, Math.min(containerW - 4, lastX.current + gs.dx));
        sliderX.setValue(next);
      },
      onPanResponderRelease: (_, gs) => {
        lastX.current = Math.max(4, Math.min(containerW - 4, lastX.current + gs.dx));
      },
    })
  ).current;

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerW(w);
    sliderX.setValue(w / 2);
    lastX.current = w / 2;
  }, []);

  const clipWidth = sliderX.interpolate({ inputRange: [0, containerW], outputRange: [0, containerW], extrapolate: "clamp" });

  // Delta calculations
  const weightDelta = (leftPhoto.weightKg && rightPhoto.weightKg) ? rightPhoto.weightKg - leftPhoto.weightKg : null;
  const bfDelta = (leftPhoto.bodyFatPercent && rightPhoto.bodyFatPercent) ? rightPhoto.bodyFatPercent - leftPhoto.bodyFatPercent : null;

  function openCaptionSheet() {
    if (Platform.OS === "web") { Alert.alert("Not supported", "Collage export is available on iOS and Android only."); return; }
    setCaptionVisible(true);
  }

  async function doExport() {
    setExporting(true);
    try {
      await Clipboard.setStringAsync(caption);
      const uri = await captureRef(collageRef, { format: "jpg", quality: 0.95, width: COLLAGE_W, height: COLLAGE_H, result: "tmpfile" });
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") { Alert.alert("Permission needed", "Allow PeakPulse to save to your photo library."); setExporting(false); return; }
      await MediaLibrary.saveToLibraryAsync(uri);
      setCaptionVisible(false);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "image/jpeg", dialogTitle: "Share your PeakPulse transformation", UTI: "public.jpeg" });
      } else {
        Alert.alert("Saved! 🎉", "Collage saved to your photo library. Caption is copied to clipboard — paste it when you post!");
      }
    } catch (e: any) {
      Alert.alert("Export failed", e?.message ?? "Something went wrong. Please try again.");
    } finally { setExporting(false); }
  }

  return (
    <>
      {/* Off-screen collage */}
      <View style={{ position: "absolute", top: -9999, left: -9999, width: COLLAGE_W, height: COLLAGE_H, opacity: 0 }} pointerEvents="none">
        <CollageTemplate
          ref={collageRef}
          firstUrl={leftPhoto.photoUrl} latestUrl={rightPhoto.photoUrl}
          firstDate={formatDate(leftPhoto.createdAt)} latestDate={formatDate(rightPhoto.createdAt)}
          firstWeight={leftPhoto.weightKg} latestWeight={rightPhoto.weightKg}
          firstBF={leftPhoto.bodyFatPercent} latestBF={rightPhoto.bodyFatPercent}
        />
      </View>

      <CaptionSheet
        visible={captionVisible} caption={caption} onChangeCaption={setCaption}
        onClose={() => setCaptionVisible(false)} onShare={doExport} sharing={exporting}
      />

      <View
        style={{ marginHorizontal: 20, marginBottom: 16, borderRadius: 20, overflow: "hidden", backgroundColor: "#141A22", borderWidth: 1, borderColor: "rgba(245,158,11,0.18)" }}
        onLayout={onLayout}
      >
        {/* Section label */}
        <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 13, letterSpacing: 1 }}>TRANSFORMATION</Text>
          <Text style={{ color: "#B45309", fontSize: 11 }}>← drag to compare →</Text>
        </View>

        {/* Image comparison */}
        <View style={{ width: "100%", height: SLIDER_H, position: "relative" }} {...panResponder.panHandlers}>
          <Image source={{ uri: rightPhoto.photoUrl }} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: SLIDER_H }} resizeMode="cover" />
          <Animated.View style={{ position: "absolute", top: 0, left: 0, width: clipWidth, height: SLIDER_H, overflow: "hidden" }}>
            <Image source={{ uri: leftPhoto.photoUrl }} style={{ width: containerW, height: SLIDER_H }} resizeMode="cover" />
          </Animated.View>
          <Animated.View style={{ position: "absolute", top: 0, left: sliderX, width: 2, height: SLIDER_H, backgroundColor: "#F59E0B", transform: [{ translateX: -1 }] }} />
          <Animated.View style={{
            position: "absolute", top: SLIDER_H / 2 - 22, left: sliderX,
            transform: [{ translateX: -22 }], width: 44, height: 44, borderRadius: 22,
            backgroundColor: "#F59E0B", alignItems: "center", justifyContent: "center",
            shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 6, elevation: 8,
          }}>
            <Text style={{ color: "#0A0E14", fontSize: 16, fontWeight: "700" }}>⇔</Text>
          </Animated.View>
          {/* THEN label */}
          <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(10,5,0,0.72)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#F59E0B60" }}>
            <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 10, letterSpacing: 1 }}>THEN</Text>
            <Text style={{ color: "#B45309", fontSize: 9 }}>{formatDate(leftPhoto.createdAt)}</Text>
            {leftPhoto.weightKg != null && <Text style={{ color: "#FDE68A", fontSize: 9 }}>{leftPhoto.weightKg} kg</Text>}
            {leftPhoto.bodyFatPercent != null && <Text style={{ color: "#FDE68A", fontSize: 9 }}>{leftPhoto.bodyFatPercent}% BF</Text>}
          </View>
          {/* NOW label */}
          <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(10,5,0,0.72)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#10B98160" }}>
            <Text style={{ color: "#10B981", fontWeight: "700", fontSize: 10, letterSpacing: 1 }}>NOW</Text>
            <Text style={{ color: "#B45309", fontSize: 9 }}>{formatDate(rightPhoto.createdAt)}</Text>
            {rightPhoto.weightKg != null && <Text style={{ color: "#6EE7B7", fontSize: 9 }}>{rightPhoto.weightKg} kg</Text>}
            {rightPhoto.bodyFatPercent != null && <Text style={{ color: "#6EE7B7", fontSize: 9 }}>{rightPhoto.bodyFatPercent}% BF</Text>}
          </View>
        </View>

        {/* Delta stats bar */}
        {(weightDelta != null || bfDelta != null) && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, paddingVertical: 12, paddingHorizontal: 16, borderTopWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
            {weightDelta != null && (
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: weightDelta <= 0 ? "#10B981" : "#F87171", fontWeight: "900", fontSize: 20 }}>
                  {deltaSign(weightDelta)}{weightDelta.toFixed(1)} kg
                </Text>
                <Text style={{ color: "#B45309", fontSize: 10 }}>Weight</Text>
              </View>
            )}
            {weightDelta != null && bfDelta != null && (
              <View style={{ width: 1, backgroundColor: "rgba(245,158,11,0.15)" }} />
            )}
            {bfDelta != null && (
              <View style={{ alignItems: "center" }}>
                <Text style={{ color: bfDelta <= 0 ? "#10B981" : "#F87171", fontWeight: "900", fontSize: 20 }}>
                  {deltaSign(bfDelta)}{bfDelta.toFixed(1)}%
                </Text>
                <Text style={{ color: "#B45309", fontSize: 10 }}>Body Fat</Text>
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 }}>
          <TouchableOpacity
            style={{ backgroundColor: "#F59E0B", borderRadius: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
            onPress={openCaptionSheet}
          >
            <Text style={{ fontSize: 16 }}>📤</Text>
            <Text style={{ color: "#0A0E14", fontWeight: "700", fontSize: 14 }}>Export & Share Collage</Text>
          </TouchableOpacity>
          <Text style={{ color: "#451A03", fontSize: 10, textAlign: "center", marginTop: 6 }}>
            Saves a 1080×1350 branded image · caption auto-copied to clipboard
          </Text>
        </View>
      </View>
    </>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { showLimitModal } = useAiLimit();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isBaseline, setIsBaseline] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [bfInput, setBfInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const { data: photos, refetch } = trpc.progress.getAll.useQuery(undefined, { enabled: isAuthenticated });
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const uploadPhoto = trpc.progress.uploadPhoto.useMutation({
    onSuccess: () => { refetch(); setSelectedImage(null); setNote(""); setWeightInput(""); setBfInput(""); Alert.alert("Saved!", "Progress photo saved."); },
    onError: (e) => { if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; } Alert.alert("Error", e.message); },
  });
  const analyzeProgress = trpc.progress.analyzeProgress.useMutation({
    onError: (e) => { if (e?.message?.includes?.("AI_LIMIT_EXCEEDED") || e?.message?.includes?.("rate limit")) { showLimitModal(e.message); return; } Alert.alert("Error", e.message); },
  });

  const baselinePhoto = photos?.find((p: any) => p.isBaseline);

  // Sort all photos oldest → newest
  const sortedPhotos: ProgressPhoto[] = useMemo(() =>
    photos ? [...photos].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],
    [photos]
  );

  // Group by month for timeline scrubber
  const monthGroups = useMemo(() => groupByMonth(sortedPhotos), [sortedPhotos]);

  // Selected left/right month indices (default: first and last)
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(Math.max(0, monthGroups.length - 1));

  // Keep rightIdx valid when groups change
  React.useEffect(() => {
    setLeftIdx(0);
    setRightIdx(Math.max(0, monthGroups.length - 1));
  }, [monthGroups.length]);

  // Derive the two photos to compare from selected month groups
  const leftPhoto: ProgressPhoto | null = monthGroups[leftIdx]?.latest ?? null;
  const rightPhoto: ProgressPhoto | null = monthGroups[rightIdx]?.latest ?? null;
  const showComparison = !!(leftPhoto && rightPhoto && leftPhoto.id !== rightPhoto.id && leftPhoto.photoUrl && rightPhoto.photoUrl);

  async function pickImage(useCamera: boolean) {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") { Alert.alert("Permission Required", "Camera access is needed."); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [3, 4] });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8, allowsEditing: true, aspect: [3, 4] });
      }
      if (!result.canceled && result.assets[0]) { setSelectedImage(result.assets[0].uri); setAnalysis(null); }
    } catch (e: any) { Alert.alert("Error", e.message); }
  }

  async function savePhoto() {
    if (!selectedImage) return;
    try {
      let base64 = "";
      if (Platform.OS === "web") {
        const resp = await fetch(selectedImage);
        const blob = await resp.blob();
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      } else {
        base64 = await FileSystem.readAsStringAsync(selectedImage, { encoding: FileSystem.EncodingType.Base64 });
      }
      const weightKg = weightInput ? parseFloat(weightInput) : undefined;
      const bodyFatPercent = bfInput ? parseFloat(bfInput) : undefined;
      await (uploadPhoto.mutateAsync as any)({ photoBase64: base64, note, isBaseline, weightKg: isNaN(weightKg as number) ? undefined : weightKg, bodyFatPercent: isNaN(bodyFatPercent as number) ? undefined : bodyFatPercent });
      incrementCounter("progress_photos").catch(() => {});
    } catch (e: any) { Alert.alert("Error", e.message); }
  }

  async function analyzePhoto(photoUrl: string) {
    setAnalyzing(true);
    try {
      const result = await analyzeProgress.mutateAsync({ currentPhotoUrl: photoUrl, baselinePhotoUrl: baselinePhoto?.photoUrl });
      setAnalysis(result);
    } finally { setAnalyzing(false); }
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">Please log in to track progress</Text>
      </ScreenContainer>
    );
  }

  return (
    <ImageBackground source={{ uri: GOLDEN_SCAN }} style={{ flex: 1 }} resizeMode="cover">
    <FeatureGate feature="progress_photos" message="Track your body transformation with side-by-side photo comparisons. Available on Basic plan and above.">
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#141A22", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#F1F5F9", fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#F1F5F9", fontSize: 22, fontWeight: "800" }}>Progress Photos</Text>
            <Text style={{ color: "#B45309", fontSize: 12 }}>Track your transformation journey</Text>
          </View>
        </View>

        {/* Timeline scrubber */}
        {monthGroups.length >= 2 && (
          <TimelineScrubber
            groups={monthGroups}
            leftIdx={leftIdx} rightIdx={rightIdx}
            onLeftChange={(i) => { if (i < rightIdx) setLeftIdx(i); }}
            onRightChange={(i) => { if (i > leftIdx) setRightIdx(i); }}
          />
        )}

        {/* Comparison slider */}
        {showComparison ? (
          <ComparisonSlider
            leftPhoto={leftPhoto!} rightPhoto={rightPhoto!}
            userName={(profile as any)?.name} userGoal={(profile as any)?.goal}
          />
        ) : photos && photos.length === 1 ? (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#141A22", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
            <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 14, textAlign: "center", marginBottom: 4 }}>Add one more photo to unlock</Text>
            <Text style={{ color: "#B45309", fontSize: 12, textAlign: "center" }}>Add 2+ photos to see before/after comparison.</Text>
          </View>
        ) : null}

        {/* Upload New Photo */}
        <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#141A22", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#F1F5F9", fontWeight: "700", fontSize: 14, marginBottom: 12 }}>Add New Photo</Text>
          {selectedImage ? (
            <View style={{ marginBottom: 12 }}>
              <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 280, borderRadius: 14, backgroundColor: "#141A22" }} resizeMode="cover" />
              <TouchableOpacity style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }} onPress={() => setSelectedImage(null)}>
                <Text style={{ color: "#F1F5F9", fontWeight: "700", fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }} onPress={() => pickImage(true)}>
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={{ color: "#B45309", fontSize: 12 }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, backgroundColor: "#141A22", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }} onPress={() => pickImage(false)}>
                <Text style={{ fontSize: 24 }}>🖼️</Text>
                <Text style={{ color: "#B45309", fontSize: 12 }}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
          {selectedImage && (
            <>
              <TextInput value={note} onChangeText={setNote} placeholder="Add a note (optional)" placeholderTextColor="#451A03"
                style={{ backgroundColor: "#141A22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#F1F5F9", fontSize: 13, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }} returnKeyType="done" />
              {/* Optional weight + BF% */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#B45309", fontSize: 11, marginBottom: 4 }}>Weight (kg) — optional</Text>
                  <TextInput value={weightInput} onChangeText={setWeightInput} placeholder="e.g. 82.5" placeholderTextColor="#451A03" keyboardType="decimal-pad"
                    style={{ backgroundColor: "#141A22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#F1F5F9", fontSize: 13, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }} returnKeyType="done" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#B45309", fontSize: 11, marginBottom: 4 }}>Body Fat % — optional</Text>
                  <TextInput value={bfInput} onChangeText={setBfInput} placeholder="e.g. 18.0" placeholderTextColor="#451A03" keyboardType="decimal-pad"
                    style={{ backgroundColor: "#141A22", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#F1F5F9", fontSize: 13, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }} returnKeyType="done" />
                </View>
              </View>
              <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }} onPress={() => setIsBaseline(!isBaseline)}>
                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isBaseline ? "#F59E0B" : "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                  {isBaseline && <Text style={{ color: "#F1F5F9", fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={{ color: "#B45309", fontSize: 13 }}>Set as baseline photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: uploadPhoto.isPending ? 0.7 : 1 }} onPress={savePhoto} disabled={uploadPhoto.isPending}>
                {uploadPhoto.isPending ? <ActivityIndicator color="#F1F5F9" size="small" /> : <Text style={{ color: "#F1F5F9", fontWeight: "700" }}>Save Photo</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* AI Analysis Result */}
        {analysis && (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#141A22", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#A78BFA30" }}>
            <Text style={{ color: "#FBBF24", fontWeight: "700", fontSize: 13, marginBottom: 10 }}>✨ AI Analysis</Text>
            <Text style={{ color: "#F59E0B", fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{String(analysis.summary)}</Text>
            {analysis.details?.map((d: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>•</Text>
                <Text style={{ color: "#B45309", fontSize: 13, flex: 1, lineHeight: 18 }}>{d}</Text>
              </View>
            ))}
            {analysis.recommendations?.length > 0 && (
              <View style={{ backgroundColor: "#22C55E10", borderRadius: 10, padding: 10, marginTop: 8 }}>
                <Text style={{ color: "#FDE68A", fontWeight: "700", fontSize: 12, marginBottom: 6 }}>RECOMMENDATIONS</Text>
                {analysis.recommendations.map((r: string, i: number) => (
                  <Text key={i} style={{ color: "#B45309", fontSize: 12, marginBottom: 3 }}>→ {r}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Photos Grid */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: "#F1F5F9", fontWeight: "700", fontSize: 16, marginBottom: 12 }}>Your Photos ({photos?.length ?? 0})</Text>
          {!photos || photos.length === 0 ? (
            <EmptyState {...EMPTY_STATES.progressPhotos} compact onCta={() => pickImage(false)} />
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {sortedPhotos.map((photo, i) => (
                <View key={photo.id} style={{ width: "48%", backgroundColor: "#141A22", borderRadius: 14, overflow: "hidden", borderWidth: photo.isBaseline ? 2 : 1, borderColor: photo.isBaseline ? "#F59E0B" : "rgba(245,158,11,0.10)" }}>
                  <Image source={{ uri: photo.photoUrl }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
                  {photo.isBaseline && (
                    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#F1F5F9", fontSize: 10, fontWeight: "700" }}>BASELINE</Text>
                    </View>
                  )}
                  {i === 0 && (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#F59E0B60" }}>
                      <Text style={{ color: "#F59E0B", fontSize: 9, fontWeight: "700" }}>FIRST</Text>
                    </View>
                  )}
                  {i === sortedPhotos.length - 1 && sortedPhotos.length > 1 && (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#10B98160" }}>
                      <Text style={{ color: "#10B981", fontSize: 9, fontWeight: "700" }}>LATEST</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: "#B45309", fontSize: 10 }}>{formatDate(photo.createdAt)}</Text>
                    {(photo.weightKg != null || photo.bodyFatPercent != null) && (
                      <View style={{ flexDirection: "row", gap: 8, marginTop: 3 }}>
                        {photo.weightKg != null && <Text style={{ color: "#FDE68A", fontSize: 10 }}>{photo.weightKg} kg</Text>}
                        {photo.bodyFatPercent != null && <Text style={{ color: "#FDE68A", fontSize: 10 }}>{photo.bodyFatPercent}% BF</Text>}
                      </View>
                    )}
                    {photo.note && <Text style={{ color: "#F59E0B", fontSize: 11, marginTop: 3 }} numberOfLines={2}>{photo.note}</Text>}
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingVertical: 6, alignItems: "center", marginTop: 8 }}
                      onPress={() => analyzePhoto(photo.photoUrl)} disabled={analyzing}>
                      {analyzing ? <ActivityIndicator size="small" color="#FBBF24" /> : <Text style={{ color: "#FBBF24", fontSize: 11, fontWeight: "700" }}>✨ AI Analyze</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
    </FeatureGate>
    </ImageBackground>
  );
}
