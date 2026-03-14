import React, { useState, useRef, useCallback } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image,
  TextInput, Platform, PanResponder, Animated, Dimensions, LayoutChangeEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_PADDING = 40; // 20 each side
const CARD_W = SCREEN_W - CARD_PADDING;
const SLIDER_H = Math.round(CARD_W * (4 / 3)); // 3:4 portrait

// ─── Drag-to-reveal comparison component ─────────────────────────────────────
function ComparisonSlider({ firstUrl, latestUrl, firstDate, latestDate }: {
  firstUrl: string;
  latestUrl: string;
  firstDate: string;
  latestDate: string;
}) {
  const sliderX = useRef(new Animated.Value(CARD_W / 2)).current;
  const lastX = useRef(CARD_W / 2);
  const [containerW, setContainerW] = useState(CARD_W);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        sliderX.stopAnimation((val) => { lastX.current = val; });
      },
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

  const clipWidth = sliderX.interpolate({
    inputRange: [0, containerW],
    outputRange: [0, containerW],
    extrapolate: "clamp",
  });

  return (
    <View
      style={{ marginHorizontal: 20, marginBottom: 24, borderRadius: 20, overflow: "hidden", backgroundColor: "#150A00", borderWidth: 1, borderColor: "rgba(245,158,11,0.18)" }}
      onLayout={onLayout}
    >
      {/* Section label */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 13, letterSpacing: 1 }}>TRANSFORMATION</Text>
        <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 11 }}>← drag to compare →</Text>
      </View>

      {/* Image comparison area */}
      <View style={{ width: "100%", height: SLIDER_H, position: "relative" }} {...panResponder.panHandlers}>
        {/* LATEST photo (right / full width background) */}
        <Image
          source={{ uri: latestUrl }}
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: SLIDER_H }}
          resizeMode="cover"
        />

        {/* FIRST photo clipped to left of divider */}
        <Animated.View
          style={{ position: "absolute", top: 0, left: 0, width: clipWidth, height: SLIDER_H, overflow: "hidden" }}
        >
          <Image
            source={{ uri: firstUrl }}
            style={{ width: containerW, height: SLIDER_H }}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Divider line */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: sliderX,
            width: 2,
            height: SLIDER_H,
            backgroundColor: "#F59E0B",
            transform: [{ translateX: -1 }],
          }}
        />

        {/* Drag handle */}
        <Animated.View
          style={{
            position: "absolute",
            top: SLIDER_H / 2 - 22,
            left: sliderX,
            transform: [{ translateX: -22 }],
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "#F59E0B",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.5,
            shadowRadius: 6,
            elevation: 8,
          }}
        >
          <Text style={{ color: "#0A0500", fontSize: 16, fontFamily: "Outfit_700Bold" }}>⇔</Text>
        </Animated.View>

        {/* THEN label */}
        <View style={{ position: "absolute", top: 10, left: 10, backgroundColor: "rgba(10,5,0,0.72)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#F59E0B60" }}>
          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 10, letterSpacing: 1 }}>THEN</Text>
          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{firstDate}</Text>
        </View>

        {/* NOW label */}
        <View style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(10,5,0,0.72)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#10B98160" }}>
          <Text style={{ color: "#10B981", fontFamily: "Outfit_700Bold", fontSize: 10, letterSpacing: 1 }}>NOW</Text>
          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 9 }}>{latestDate}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between" }}>
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 11 }}>STARTING POINT</Text>
          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 10 }}>{firstDate}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: "rgba(245,158,11,0.15)" }} />
        <View style={{ alignItems: "center" }}>
          <Text style={{ color: "#10B981", fontFamily: "Outfit_700Bold", fontSize: 11 }}>LATEST</Text>
          <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 10 }}>{latestDate}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ProgressPhotosScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isBaseline, setIsBaseline] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const { data: photos, refetch } = trpc.progress.getAll.useQuery(undefined, { enabled: isAuthenticated });
  const uploadPhoto = trpc.progress.uploadPhoto.useMutation({
    onSuccess: () => { refetch(); setSelectedImage(null); setNote(""); Alert.alert("Saved!", "Progress photo saved."); },
    onError: (e) => Alert.alert("Error", e.message),
  });
  const analyzeProgress = trpc.progress.analyzeProgress.useMutation({
    onError: (e) => Alert.alert("Error", e.message),
  });

  const baselinePhoto = photos?.find((p: any) => p.isBaseline);

  // Derive first and latest for comparison
  const sortedPhotos: any[] = photos ? [...photos].sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  ) : [];
  const firstPhoto = sortedPhotos[0] ?? null;
  const latestPhoto = sortedPhotos.length > 1 ? sortedPhotos[sortedPhotos.length - 1] : null;
  const showComparison = !!(firstPhoto && latestPhoto && firstPhoto.photoUrl && latestPhoto.photoUrl);

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    } catch { return iso; }
  }

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
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setAnalysis(null);
      }
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
      await uploadPhoto.mutateAsync({ photoBase64: base64, note, isBaseline });
    } catch (e: any) { Alert.alert("Error", e.message); }
  }

  async function analyzePhoto(photoUrl: string) {
    setAnalyzing(true);
    try {
      const result = await analyzeProgress.mutateAsync({
        currentPhotoUrl: photoUrl,
        baselinePhotoUrl: baselinePhoto?.photoUrl,
      });
      setAnalysis(result);
    } finally {
      setAnalyzing(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <ScreenContainer className="flex-1 items-center justify-center p-6">
        <Text className="text-foreground text-lg text-center">Please log in to track progress</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#150A00", alignItems: "center", justifyContent: "center" }}
          >
            <Text style={{ color: "#FFF7ED", fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#FFF7ED", fontSize: 22, fontFamily: "Outfit_800ExtraBold" }}>Progress Photos</Text>
            <Text style={{ color: "#92400E", fontSize: 12, fontFamily: "DMSans_400Regular" }}>Track your transformation journey</Text>
          </View>
        </View>

        {/* ── Transformation Comparison Slider ── */}
        {showComparison ? (
          <ComparisonSlider
            firstUrl={firstPhoto.photoUrl}
            latestUrl={latestPhoto.photoUrl}
            firstDate={formatDate(firstPhoto.createdAt)}
            latestDate={formatDate(latestPhoto.createdAt)}
          />
        ) : photos && photos.length === 1 ? (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "rgba(245,158,11,0.12)", alignItems: "center" }}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📸</Text>
            <Text style={{ color: "#F59E0B", fontFamily: "Outfit_700Bold", fontSize: 14, textAlign: "center", marginBottom: 4 }}>Add one more photo to unlock</Text>
            <Text style={{ color: "#92400E", fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center" }}>The before/after comparison slider appears once you have 2 or more progress photos.</Text>
          </View>
        ) : null}

        {/* Upload New Photo */}
        <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 14, marginBottom: 12 }}>Add New Photo</Text>

          {selectedImage ? (
            <View style={{ marginBottom: 12 }}>
              <Image source={{ uri: selectedImage }} style={{ width: "100%", height: 280, borderRadius: 14, backgroundColor: "#150A00" }} resizeMode="cover" />
              <TouchableOpacity
                style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(100,116,139,0.56)", borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 }}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 12 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                onPress={() => pickImage(true)}
              >
                <Text style={{ fontSize: 24 }}>📷</Text>
                <Text style={{ color: "#92400E", fontSize: 12, fontFamily: "DMSans_400Regular" }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <Text style={{ fontSize: 24 }}>🖼️</Text>
                <Text style={{ color: "#92400E", fontSize: 12, fontFamily: "DMSans_400Regular" }}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {selectedImage && (
            <>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor="#451A03"
                style={{ backgroundColor: "#150A00", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#FFF7ED", fontSize: 13, marginBottom: 10, borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}
                onPress={() => setIsBaseline(!isBaseline)}
              >
                <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: isBaseline ? "#F59E0B" : "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: "#F59E0B", alignItems: "center", justifyContent: "center" }}>
                  {isBaseline && <Text style={{ color: "#FFF7ED", fontSize: 12 }}>✓</Text>}
                </View>
                <Text style={{ color: "#92400E", fontSize: 13, fontFamily: "DMSans_400Regular" }}>Set as baseline photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: uploadPhoto.isPending ? 0.7 : 1 }}
                onPress={savePhoto}
                disabled={uploadPhoto.isPending}
              >
                {uploadPhoto.isPending
                  ? <ActivityIndicator color="#FFF7ED" size="small" />
                  : <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold" }}>Save Photo</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* AI Analysis Result */}
        {analysis && (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#A78BFA30" }}>
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 10 }}>✨ AI Analysis</Text>
            <Text style={{ color: "#F59E0B", fontSize: 14, lineHeight: 20, marginBottom: 12, fontFamily: "DMSans_400Regular" }}>{String(analysis.summary)}</Text>
            {analysis.details?.map((d: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>•</Text>
                <Text style={{ color: "#92400E", fontSize: 13, flex: 1, lineHeight: 18, fontFamily: "DMSans_400Regular" }}>{d}</Text>
              </View>
            ))}
            {analysis.recommendations?.length > 0 && (
              <View style={{ backgroundColor: "#22C55E10", borderRadius: 10, padding: 10, marginTop: 8 }}>
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 6 }}>RECOMMENDATIONS</Text>
                {analysis.recommendations.map((r: string, i: number) => (
                  <Text key={i} style={{ color: "#92400E", fontSize: 12, marginBottom: 3, fontFamily: "DMSans_400Regular" }}>→ {r}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Photos Grid */}
        <View style={{ paddingHorizontal: 20 }}>
          <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold", fontSize: 16, marginBottom: 12 }}>
            Your Photos ({photos?.length ?? 0})
          </Text>
          {!photos || photos.length === 0 ? (
            <View style={{ backgroundColor: "#150A00", borderRadius: 16, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)" }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📸</Text>
              <Text style={{ color: "#92400E", fontSize: 13, textAlign: "center", fontFamily: "DMSans_400Regular" }}>
                No progress photos yet. Add your first photo to start tracking your journey!
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {photos.map((photo: any, i: number) => (
                <View
                  key={i}
                  style={{ width: "48%", backgroundColor: "#150A00", borderRadius: 14, overflow: "hidden", borderWidth: photo.isBaseline ? 2 : 1, borderColor: photo.isBaseline ? "#F59E0B" : "rgba(245,158,11,0.10)" }}
                >
                  <Image source={{ uri: photo.photoUrl }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
                  {photo.isBaseline && (
                    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold" }}>BASELINE</Text>
                    </View>
                  )}
                  {/* First / Latest badge */}
                  {i === 0 && (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#F59E0B60" }}>
                      <Text style={{ color: "#F59E0B", fontSize: 9, fontFamily: "Outfit_700Bold" }}>FIRST</Text>
                    </View>
                  )}
                  {i === photos.length - 1 && photos.length > 1 && (
                    <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(10,5,0,0.75)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#10B98160" }}>
                      <Text style={{ color: "#10B981", fontSize: 9, fontFamily: "Outfit_700Bold" }}>LATEST</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: "#92400E", fontSize: 10, fontFamily: "DMSans_400Regular" }}>
                      {new Date(photo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                    {photo.note && (
                      <Text style={{ color: "#F59E0B", fontSize: 11, marginTop: 3, fontFamily: "DMSans_400Regular" }} numberOfLines={2}>{photo.note}</Text>
                    )}
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingVertical: 6, alignItems: "center", marginTop: 8 }}
                      onPress={() => analyzePhoto(photo.photoUrl)}
                      disabled={analyzing}
                    >
                      {analyzing
                        ? <ActivityIndicator size="small" color="#FBBF24" />
                        : <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>✨ AI Analyze</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
