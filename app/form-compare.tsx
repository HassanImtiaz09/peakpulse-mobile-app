/**
 * Form Compare Screen
 *
 * Side-by-side comparison of user's exercise photo vs AI reference image.
 * Users can take a photo or pick from gallery, then compare their form
 * against the correct reference with annotation overlays.
 */

import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ImageBackground,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { GOLDEN_SOCIAL, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { resolveGifAsset } from "@/lib/gif-resolver";
import { getExerciseInfo } from "@/lib/exercise-data";
import { getFormAnnotations, hasFormAnnotations } from "@/lib/form-annotations";
import { FormAnnotationOverlay, AnnotationLegend } from "@/components/form-annotation-overlay";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_W } = Dimensions.get("window");
const COMPARE_W = (SCREEN_W - 48) / 2;
const COMPARE_H = COMPARE_W * 1.3;

const STORAGE_KEY = "peakpulse_form_photos";

interface SavedFormPhoto {
  exerciseName: string;
  uri: string;
  date: string;
}

export default function FormCompareScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    exerciseName?: string;
    gifUrl?: string;
  }>();

  const exerciseName = params.exerciseName ?? "Exercise";
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [savedPhotos, setSavedPhotos] = useState<SavedFormPhoto[]>([]);
  const [viewMode, setViewMode] = useState<"side" | "overlay">("side");

  // Get reference image
  const referenceAsset = useMemo(() => {
    const info = getExerciseInfo(exerciseName);
    if (info?.angleViews?.[0]?.gifUrl) {
      return resolveGifAsset(info.angleViews[0].gifUrl);
    }
    if (params.gifUrl) return resolveGifAsset(params.gifUrl);
    return null;
  }, [exerciseName, params.gifUrl]);

  // Get form annotations
  const annotations = useMemo(
    () => getFormAnnotations(exerciseName),
    [exerciseName]
  );

  // Load saved photos
  const loadSavedPhotos = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const all: SavedFormPhoto[] = JSON.parse(data);
        setSavedPhotos(all.filter((p) => p.exerciseName === exerciseName));
      }
    } catch {}
  }, [exerciseName]);

  React.useEffect(() => {
    loadSavedPhotos();
  }, [loadSavedPhotos]);

  // Take photo with camera
  const takePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission",
        "Please allow camera access to take a form photo."
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUserPhoto(result.assets[0].uri);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
  }, []);

  // Pick from gallery
  const pickPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUserPhoto(result.assets[0].uri);
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    }
  }, []);

  // Save photo for history
  const savePhoto = useCallback(async () => {
    if (!userPhoto) return;
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      const all: SavedFormPhoto[] = data ? JSON.parse(data) : [];
      all.push({
        exerciseName,
        uri: userPhoto,
        date: new Date().toISOString(),
      });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(all));
      setSavedPhotos((prev) => [
        ...prev,
        { exerciseName, uri: userPhoto, date: new Date().toISOString() },
      ]);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      Alert.alert("Saved", "Your form photo has been saved for tracking.");
    } catch {
      Alert.alert("Error", "Could not save photo.");
    }
  }, [userPhoto, exerciseName]);

  const toggleAnnotations = useCallback(() => {
    setShowAnnotations((prev) => !prev);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  return (
    <ScreenContainer edges={["top", "left", "right"]}>
      <ImageBackground
        source={{ uri: GOLDEN_SOCIAL }}
        style={{ flex: 1 }}
        resizeMode="cover"
      >
        <View style={GOLDEN_OVERLAY_STYLE}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FDE68A" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Form Compare</Text>
              <Text style={styles.headerSubtitle}>{exerciseName}</Text>
            </View>
            {annotations && (
              <Pressable
                onPress={toggleAnnotations}
                style={({ pressed }) => [
                  styles.annotationToggle,
                  showAnnotations && styles.annotationToggleActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <MaterialIcons
                  name="architecture"
                  size={20}
                  color={showAnnotations ? "#0A0E14" : "#D4AF37"}
                />
              </Pressable>
            )}
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* View Mode Toggle */}
            <View style={styles.viewModeRow}>
              <Pressable
                onPress={() => setViewMode("side")}
                style={[
                  styles.viewModeBtn,
                  viewMode === "side" && styles.viewModeBtnActive,
                ]}
              >
                <MaterialIcons
                  name="view-column"
                  size={16}
                  color={viewMode === "side" ? "#0A0E14" : "#D4AF37"}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "side" && styles.viewModeTextActive,
                  ]}
                >
                  Side by Side
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setViewMode("overlay")}
                style={[
                  styles.viewModeBtn,
                  viewMode === "overlay" && styles.viewModeBtnActive,
                ]}
              >
                <MaterialIcons
                  name="layers"
                  size={16}
                  color={viewMode === "overlay" ? "#0A0E14" : "#D4AF37"}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "overlay" && styles.viewModeTextActive,
                  ]}
                >
                  Overlay
                </Text>
              </Pressable>
            </View>

            {/* Comparison Area */}
            {viewMode === "side" ? (
              <View style={styles.sideBySide}>
                {/* Reference Image */}
                <View style={styles.compareCard}>
                  <Text style={styles.compareLabel}>Reference</Text>
                  <View style={styles.compareImageContainer}>
                    {referenceAsset ? (
                      <>
                        <Image
                          source={
                            typeof referenceAsset === "string"
                              ? { uri: referenceAsset }
                              : referenceAsset
                          }
                          style={styles.compareImage}
                          contentFit="contain"
                          cachePolicy="memory-disk"
                        />
                        {showAnnotations && annotations && (
                          <FormAnnotationOverlay
                            annotation={annotations}
                            width={COMPARE_W}
                            height={COMPARE_H}
                            simplified
                          />
                        )}
                      </>
                    ) : (
                      <View style={styles.placeholderBox}>
                        <MaterialIcons
                          name="fitness-center"
                          size={32}
                          color="#D4AF37"
                        />
                        <Text style={styles.placeholderText}>No reference</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* User Photo */}
                <View style={styles.compareCard}>
                  <Text style={styles.compareLabel}>Your Form</Text>
                  <View style={styles.compareImageContainer}>
                    {userPhoto ? (
                      <Image
                        source={{ uri: userPhoto }}
                        style={styles.compareImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Pressable
                        onPress={takePhoto}
                        style={({ pressed }) => [
                          styles.placeholderBox,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <MaterialIcons
                          name="add-a-photo"
                          size={32}
                          color="#D4AF37"
                        />
                        <Text style={styles.placeholderText}>
                          Take a photo
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              /* Overlay Mode */
              <View style={styles.overlayContainer}>
                <View style={styles.overlayImageBox}>
                  {referenceAsset && (
                    <Image
                      source={
                        typeof referenceAsset === "string"
                          ? { uri: referenceAsset }
                          : referenceAsset
                      }
                      style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
                      contentFit="contain"
                      cachePolicy="memory-disk"
                    />
                  )}
                  {userPhoto && (
                    <Image
                      source={{ uri: userPhoto }}
                      style={[StyleSheet.absoluteFill, { opacity: 0.5 }]}
                      contentFit="contain"
                    />
                  )}
                  {showAnnotations && annotations && (
                    <FormAnnotationOverlay
                      annotation={annotations}
                      width={SCREEN_W - 32}
                      height={(SCREEN_W - 32) * 1.2}
                    />
                  )}
                  {!userPhoto && (
                    <Pressable
                      onPress={takePhoto}
                      style={({ pressed }) => [
                        styles.overlayPlaceholder,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <MaterialIcons
                        name="add-a-photo"
                        size={40}
                        color="#D4AF37"
                      />
                      <Text style={styles.overlayPlaceholderText}>
                        Add your photo to overlay
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.overlayHint}>
                  Both images are overlaid at 50% opacity for form comparison
                </Text>
              </View>
            )}

            {/* Annotation Legend */}
            {showAnnotations && annotations && <AnnotationLegend />}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={takePhoto}
                style={({ pressed }) => [
                  styles.actionButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <MaterialIcons name="camera-alt" size={20} color="#0A0E14" />
                <Text style={styles.actionButtonText}>Take Photo</Text>
              </Pressable>
              <Pressable
                onPress={pickPhoto}
                style={({ pressed }) => [
                  styles.actionButtonSecondary,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <MaterialIcons name="photo-library" size={20} color="#D4AF37" />
                <Text style={styles.actionButtonSecondaryText}>Gallery</Text>
              </Pressable>
            </View>

            {userPhoto && (
              <Pressable
                onPress={savePhoto}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
              >
                <MaterialIcons name="save" size={18} color="#22C55E" />
                <Text style={styles.saveButtonText}>
                  Save Photo for Progress Tracking
                </Text>
              </Pressable>
            )}

            {/* Tips Section */}
            <View style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Form Comparison Tips</Text>
              <View style={styles.tipRow}>
                <MaterialIcons name="camera" size={16} color="#D4AF37" />
                <Text style={styles.tipText}>
                  Set up your phone on a tripod or have someone take the photo
                </Text>
              </View>
              <View style={styles.tipRow}>
                <MaterialIcons name="straighten" size={16} color="#D4AF37" />
                <Text style={styles.tipText}>
                  Match the same angle as the reference image for best comparison
                </Text>
              </View>
              <View style={styles.tipRow}>
                <MaterialIcons name="wb-sunny" size={16} color="#D4AF37" />
                <Text style={styles.tipText}>
                  Good lighting helps identify form details more clearly
                </Text>
              </View>
              <View style={styles.tipRow}>
                <MaterialIcons name="repeat" size={16} color="#D4AF37" />
                <Text style={styles.tipText}>
                  Take photos regularly to track your form improvement over time
                </Text>
              </View>
            </View>

            {/* Saved Photos History */}
            {savedPhotos.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.historyTitle}>
                  Form History ({savedPhotos.length})
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {savedPhotos.map((photo, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setUserPhoto(photo.uri)}
                      style={({ pressed }) => [
                        styles.historyThumb,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.historyImage}
                        contentFit="cover"
                      />
                      <Text style={styles.historyDate}>
                        {new Date(photo.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </ImageBackground>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,175,55,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FDE68A",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#D4AF37",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
  },
  annotationToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212,175,55,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  annotationToggleActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#FDE68A",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  viewModeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  viewModeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(212,175,55,0.08)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  viewModeBtnActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#FDE68A",
  },
  viewModeText: {
    color: "#D4AF37",
    fontSize: 13,
    fontWeight: "600",
  },
  viewModeTextActive: {
    color: "#0A0E14",
  },
  sideBySide: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  compareCard: {
    flex: 1,
  },
  compareLabel: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  compareImageContainer: {
    width: COMPARE_W,
    height: COMPARE_H,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  compareImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  placeholderText: {
    color: "#9BA1A6",
    fontSize: 12,
    fontWeight: "500",
  },
  overlayContainer: {
    marginBottom: 12,
  },
  overlayImageBox: {
    width: SCREEN_W - 32,
    height: (SCREEN_W - 32) * 1.2,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  overlayPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  overlayPlaceholderText: {
    color: "#D4AF37",
    fontSize: 14,
    fontWeight: "600",
  },
  overlayHint: {
    color: "#687076",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#D4AF37",
  },
  actionButtonText: {
    color: "#0A0E14",
    fontSize: 15,
    fontWeight: "700",
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(212,175,55,0.1)",
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.3)",
  },
  actionButtonSecondaryText: {
    color: "#D4AF37",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.1)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.3)",
    marginBottom: 16,
  },
  saveButtonText: {
    color: "#22C55E",
    fontSize: 14,
    fontWeight: "600",
  },
  tipsCard: {
    backgroundColor: "rgba(10,14,20,0.7)",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.15)",
    gap: 10,
    marginBottom: 16,
  },
  tipsTitle: {
    color: "#FDE68A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  tipText: {
    color: "#E5E7EB",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  historySection: {
    marginBottom: 16,
  },
  historyTitle: {
    color: "#FDE68A",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 10,
  },
  historyThumb: {
    width: 80,
    alignItems: "center",
    gap: 4,
  },
  historyImage: {
    width: 72,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212,175,55,0.2)",
  },
  historyDate: {
    color: "#9BA1A6",
    fontSize: 10,
    fontWeight: "500",
  },
});
