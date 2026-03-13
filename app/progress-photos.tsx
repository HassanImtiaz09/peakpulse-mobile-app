import React, { useState } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

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
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#150A00", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#FFF7ED", fontSize: 16 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: "#FFF7ED", fontSize: 22, fontFamily: "Outfit_800ExtraBold" }}>Progress Photos</Text>
            <Text style={{ color: "#92400E", fontSize: 12 }}>Track your transformation journey</Text>
          </View>
        </View>

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
                <Text style={{ color: "#92400E", fontSize: 12 }}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: "#150A00", borderRadius: 14, paddingVertical: 16, alignItems: "center", borderWidth: 1, borderColor: "rgba(245,158,11,0.10)", gap: 6 }}
                onPress={() => pickImage(false)}
              >
                <Text style={{ fontSize: 24 }}>🖼️</Text>
                <Text style={{ color: "#92400E", fontSize: 12 }}>Gallery</Text>
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
                <Text style={{ color: "#92400E", fontSize: 13 }}>Set as baseline photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: "#F59E0B", borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: uploadPhoto.isPending ? 0.7 : 1 }}
                onPress={savePhoto}
                disabled={uploadPhoto.isPending}
              >
                {uploadPhoto.isPending ? <ActivityIndicator color="#FFF7ED" size="small" /> : <Text style={{ color: "#FFF7ED", fontFamily: "Outfit_700Bold" }}>Save Photo</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* AI Analysis Result */}
        {analysis && (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: "#150A00", borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "#A78BFA30" }}>
            <Text style={{ color: "#FBBF24", fontFamily: "Outfit_700Bold", fontSize: 13, marginBottom: 10 }}>✨ AI Analysis</Text>
            <Text style={{ color: "#F59E0B", fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{String(analysis.summary)}</Text>
            {analysis.details?.map((d: string, i: number) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
                <Text style={{ color: "#F59E0B", fontSize: 12 }}>•</Text>
                <Text style={{ color: "#92400E", fontSize: 13, flex: 1, lineHeight: 18 }}>{d}</Text>
              </View>
            ))}
            {analysis.recommendations?.length > 0 && (
              <View style={{ backgroundColor: "#22C55E10", borderRadius: 10, padding: 10, marginTop: 8 }}>
                <Text style={{ color: "#FDE68A", fontFamily: "Outfit_700Bold", fontSize: 12, marginBottom: 6 }}>RECOMMENDATIONS</Text>
                {analysis.recommendations.map((r: string, i: number) => (
                  <Text key={i} style={{ color: "#92400E", fontSize: 12, marginBottom: 3 }}>→ {r}</Text>
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
              <Text style={{ color: "#92400E", fontSize: 13, textAlign: "center" }}>No progress photos yet. Add your first photo to start tracking your journey!</Text>
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {photos.map((photo: any, i: number) => (
                <View key={i} style={{ width: "48%", backgroundColor: "#150A00", borderRadius: 14, overflow: "hidden", borderWidth: photo.isBaseline ? 2 : 1, borderColor: photo.isBaseline ? "#F59E0B" : "rgba(245,158,11,0.10)" }}>
                  <Image source={{ uri: photo.photoUrl }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
                  {photo.isBaseline && (
                    <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#F59E0B", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: "#FFF7ED", fontSize: 10, fontFamily: "Outfit_700Bold" }}>BASELINE</Text>
                    </View>
                  )}
                  <View style={{ padding: 10 }}>
                    <Text style={{ color: "#92400E", fontSize: 10 }}>
                      {new Date(photo.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                    {photo.note && <Text style={{ color: "#F59E0B", fontSize: 11, marginTop: 3 }} numberOfLines={2}>{photo.note}</Text>}
                    <TouchableOpacity
                      style={{ backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 8, paddingVertical: 6, alignItems: "center", marginTop: 8 }}
                      onPress={() => analyzePhoto(photo.photoUrl)}
                      disabled={analyzing}
                    >
                      {analyzing ? (
                        <ActivityIndicator size="small" color="#FBBF24" />
                      ) : (
                        <Text style={{ color: "#FBBF24", fontSize: 11, fontFamily: "Outfit_700Bold" }}>✨ AI Analyze</Text>
                      )}
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
