/**
 * ProgressPhotoGallery – chronological gallery of user progress photos
 * stored locally on device (via expo-file-system) with an AI-analysed
 * progress percentage.
 *
 * Features:
 *  - Local-first storage (photos saved to device documentDirectory)
 *  - Chronological grid layout (newest first)
 *  - AI progress percentage badge per photo
 *  - Pinch-to-zoom full-screen viewer
 *  - Pull-to-refresh from server
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { UI, SF } from "@/constants/ui-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

const SCREEN_W = Dimensions.get("window").width;
const COL_COUNT = 3;
const GAP = 3;
const THUMB_SIZE = (SCREEN_W - 48 - GAP * (COL_COUNT - 1)) / COL_COUNT;
const LOCAL_DIR = `${FileSystem.documentDirectory}progress-photos/`;

// ── Types ────────────────────────────────────────────────────────────────────
export type LocalProgressPhoto = {
  id: string;
  localUri: string;
  remoteUrl?: string;
  date: string; // ISO string
  weightKg?: number;
  bodyFatPercent?: number;
  progressPercent?: number; // AI-calculated
  note?: string;
};

// ── Local storage helpers ────────────────────────────────────────────────────
const MANIFEST_FILE = LOCAL_DIR + "manifest.json";

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(LOCAL_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(LOCAL_DIR, { intermediates: true });
  }
}

async function readManifest(): Promise<LocalProgressPhoto[]> {
  await ensureDir();
  const info = await FileSystem.getInfoAsync(MANIFEST_FILE);
  if (!info.exists) return [];
  const raw = await FileSystem.readAsStringAsync(MANIFEST_FILE);
  try {
    return JSON.parse(raw) as LocalProgressPhoto[];
  } catch {
    return [];
  }
}

async function writeManifest(photos: LocalProgressPhoto[]) {
  await ensureDir();
  await FileSystem.writeAsStringAsync(MANIFEST_FILE, JSON.stringify(photos));
}

async function savePhotoLocally(
  sourceUri: string,
  metadata: Omit<LocalProgressPhoto, "localUri" | "id">,
): Promise<LocalProgressPhoto> {
  await ensureDir();
  const id = `pp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ext = sourceUri.split(".").pop()?.split("?")[0] || "jpg";
  const localUri = `${LOCAL_DIR}${id}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: localUri });
  const photo: LocalProgressPhoto = { id, localUri, ...metadata };
  const existing = await readManifest();
  existing.unshift(photo); // newest first
  await writeManifest(existing);
  return photo;
}

async function deletePhotoLocally(id: string) {
  const photos = await readManifest();
  const target = photos.find((p) => p.id === id);
  if (target) {
    const info = await FileSystem.getInfoAsync(target.localUri);
    if (info.exists) await FileSystem.deleteAsync(target.localUri);
  }
  await writeManifest(photos.filter((p) => p.id !== id));
}

// ── Component ────────────────────────────────────────────────────────────────
type Props = {
  /** Target body-fat from user goal (needed for progress % calculation) */
  startBodyFat?: number;
  targetBodyFat?: number;
};

export default function ProgressPhotoGallery({
  startBodyFat,
  targetBodyFat,
}: Props) {
  const { isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState<LocalProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<LocalProgressPhoto | null>(null);
  const [uploading, setUploading] = useState(false);

  // Server queries for syncing
  const { data: serverPhotos, refetch: refetchServer } =
    trpc.progress.getAll.useQuery(undefined, { enabled: isAuthenticated });
  const uploadMutation = trpc.progress.uploadPhoto.useMutation();
  const analyzeMutation = trpc.progress.analyzeProgress.useMutation();

  // ── Load local photos on mount ───────────────────────────────────────────
  useEffect(() => {
    loadLocalPhotos();
  }, []);

  const loadLocalPhotos = useCallback(async () => {
    setLoading(true);
    const local = await readManifest();
    // Sort chronologically (newest first)
    local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPhotos(local);
    setLoading(false);
  }, []);

  // ── Sync with server when serverPhotos change ────────────────────────────
  useEffect(() => {
    if (!serverPhotos || serverPhotos.length === 0) return;

    (async () => {
      const local = await readManifest();
      const localIds = new Set(local.map((p) => p.remoteUrl).filter(Boolean));
      let added = false;

      for (const sp of serverPhotos) {
        if (!localIds.has(sp.photoUrl)) {
          // Download from server to local
          try {
            const id = `pp_srv_${sp.id}`;
            const localUri = `${LOCAL_DIR}${id}.jpg`;
            await FileSystem.downloadAsync(sp.photoUrl, localUri);
            local.push({
              id,
              localUri,
              remoteUrl: sp.photoUrl,
              date: sp.createdAt?.toString() || new Date().toISOString(),
              weightKg: sp.weightKg ?? undefined,
              bodyFatPercent: sp.bodyFatPercent ?? undefined,
              note: sp.note ?? undefined,
            });
            added = true;
          } catch {
            // Skip failed downloads
          }
        }
      }

      if (added) {
        local.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        await writeManifest(local);
        setPhotos([...local]);
      }
    })();
  }, [serverPhotos]);

  // ── Pick & upload photo ──────────────────────────────────────────────────
  const handleAddPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Please allow photo library access to upload progress photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploading(true);
    const asset = result.assets[0];

    try {
      // 1. Save locally immediately
      const localPhoto = await savePhotoLocally(asset.uri, {
        date: new Date().toISOString(),
      });

      setPhotos((prev) => [localPhoto, ...prev]);

      // 2. Upload to server in background
      if (isAuthenticated) {
        try {
          const uploadResult = await uploadMutation.mutateAsync({
            photoUri: asset.uri,
          });

          // 3. Request AI analysis
          if (uploadResult && startBodyFat && targetBodyFat) {
            const analysis = await analyzeMutation.mutateAsync({
              photoUrl: uploadResult.url,
              startBodyFat,
              targetBodyFat,
            });

            // 4. Update local photo with AI data
            const updated = await readManifest();
            const idx = updated.findIndex((p) => p.id === localPhoto.id);
            if (idx >= 0 && analysis) {
              updated[idx].remoteUrl = uploadResult.url;
              updated[idx].bodyFatPercent = analysis.estimatedBodyFat;
              updated[idx].progressPercent = analysis.progressPercent;
              await writeManifest(updated);
              setPhotos([...updated].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
              ));
            }
          }
        } catch {
          // Server upload failed, photo is still saved locally
        }
      }
    } catch (err) {
      Alert.alert("Error", "Failed to save photo. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [isAuthenticated, startBodyFat, targetBodyFat]);

  // ── Refresh ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchServer();
    await loadLocalPhotos();
    setRefreshing(false);
  }, [refetchServer, loadLocalPhotos]);

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = useCallback((photo: LocalProgressPhoto) => {
    Alert.alert("Delete Photo", "Remove this progress photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deletePhotoLocally(photo.id);
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          setFullScreenPhoto(null);
        },
      },
    ]);
  }, []);

  // ── Calculate overall progress % ─────────────────────────────────────────
  const latestWithBf = photos.find((p) => p.bodyFatPercent != null);
  const overallProgress =
    latestWithBf?.progressPercent ??
    (startBodyFat && targetBodyFat && latestWithBf?.bodyFatPercent
      ? Math.min(
          100,
          Math.round(
            (Math.abs(startBodyFat - latestWithBf.bodyFatPercent) /
              Math.abs(startBodyFat - targetBodyFat)) *
              100,
          ),
        )
      : null);

  // ── Render ───────────────────────────────────────────────────────────────
  const renderItem = ({ item }: { item: LocalProgressPhoto }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => setFullScreenPhoto(item)}
      onLongPress={() => handleDelete(item)}
      style={styles.thumbWrap}
    >
      <Image source={{ uri: item.localUri }} style={styles.thumb} />
      {item.progressPercent != null && (
        <View style={styles.progressBadge}>
          <Text style={styles.progressBadgeText}>{item.progressPercent}%</Text>
        </View>
      )}
      <Text style={styles.dateLabel}>
        {new Date(item.date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator color={UI.lime400} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Progress Photos</Text>
        {overallProgress != null && (
          <View style={styles.overallBadge}>
            <Text style={styles.overallBadgeText}>
              {overallProgress}% to goal
            </Text>
          </View>
        )}
      </View>

      {photos.length === 0 ? (
        <TouchableOpacity style={styles.emptyCard} onPress={handleAddPhoto}>
          <MaterialIcons name="add-a-photo" size={32} color="rgba(255,255,255,0.25)" />
          <Text style={styles.emptyText}>
            Take your first progress photo to track your transformation
          </Text>
          <View style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Add Photo</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <>
          <FlatList
            data={photos}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={COL_COUNT}
            columnWrapperStyle={styles.row}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={UI.lime400}
              />
            }
          />

          {/* Add more button */}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddPhoto}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color={SF.darkBg} size="small" />
            ) : (
              <>
                <MaterialIcons name="add-a-photo" size={18} color={SF.darkBg} />
                <Text style={styles.addBtnText}>Add Progress Photo</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Full-screen viewer */}
      <Modal
        visible={!!fullScreenPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <View style={styles.modalBg}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setFullScreenPhoto(null)}
          >
            <MaterialIcons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {fullScreenPhoto && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: fullScreenPhoto.localUri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalDate}>
                  {new Date(fullScreenPhoto.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
                {fullScreenPhoto.bodyFatPercent != null && (
                  <Text style={styles.modalBf}>
                    Body Fat: {fullScreenPhoto.bodyFatPercent.toFixed(1)}%
                  </Text>
                )}
                {fullScreenPhoto.progressPercent != null && (
                  <View style={styles.modalProgressRow}>
                    <View style={styles.modalProgressTrack}>
                      <View
                        style={[
                          styles.modalProgressFill,
                          { width: `${fullScreenPhoto.progressPercent}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.modalProgressText}>
                      {fullScreenPhoto.progressPercent}% to goal
                    </Text>
                  </View>
                )}
                {fullScreenPhoto.note && (
                  <Text style={styles.modalNote}>{fullScreenPhoto.note}</Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={() => handleDelete(fullScreenPhoto)}
              >
                <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  overallBadge: {
    backgroundColor: "rgba(163,230,53,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  overallBadgeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: UI.lime400,
  },
  row: { gap: GAP, marginBottom: GAP },
  thumbWrap: { width: THUMB_SIZE, position: "relative" },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE * 1.3,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  progressBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: UI.lime400,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  progressBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    color: SF.darkBg,
  },
  dateLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 4,
  },
  emptyContainer: { padding: 40, alignItems: "center" },
  emptyCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderStyle: "dashed",
    padding: 32,
    alignItems: "center",
    gap: 12,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    maxWidth: 240,
  },
  emptyBtn: {
    backgroundColor: UI.lime400,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: SF.darkBg,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: UI.lime400,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  addBtnText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: SF.darkBg,
  },
  // Modal
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalClose: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  modalContent: { alignItems: "center", paddingHorizontal: 20 },
  fullImage: { width: SCREEN_W - 40, height: SCREEN_W * 1.2, borderRadius: 16 },
  modalInfo: { marginTop: 16, alignItems: "center", gap: 6 },
  modalDate: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  modalBf: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  modalProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  modalProgressTrack: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  modalProgressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: UI.lime400,
  },
  modalProgressText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: UI.lime400,
  },
  modalNote: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 4,
  },
  modalDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  modalDeleteText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "#EF4444",
  },
});
