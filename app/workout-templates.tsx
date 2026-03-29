import { useState, useEffect, useCallback } from "react";
import {
  Text, View, TouchableOpacity, FlatList, Alert,
  Platform, ImageBackground, ActivityIndicator,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import {
  getTemplates, deleteTemplate, saveTemplate, recordTemplateUsage,
  BUILT_IN_TEMPLATES, type WorkoutTemplate,
} from "@/lib/workout-templates";
import { UI as SF } from "@/constants/ui-colors";

const DASHBOARD_BG = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663430072618/PZcnawJwIZkQHTEM.jpg";

export default function WorkoutTemplatesScreen() {
  const router = useRouter();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = useCallback(async () => {
    const t = await getTemplates();
    setTemplates(t);
    setLoading(false);
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleDelete = useCallback((tmpl: WorkoutTemplate) => {
    Alert.alert("Delete Template", `Remove "${tmpl.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteTemplate(tmpl.id);
          if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          loadTemplates();
        },
      },
    ]);
  }, [loadTemplates]);

  const handleUseTemplate = useCallback(async (tmpl: WorkoutTemplate) => {
    await recordTemplateUsage(tmpl.id);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to log-workout with template params
    router.push({
      pathname: "/log-workout" as any,
      params: {
        templateType: tmpl.type,
        templateDuration: String(tmpl.durationMinutes),
        templateCalories: String(tmpl.estimatedCalories),
        templateDistance: tmpl.distanceKm ? String(tmpl.distanceKm) : "",
        templateHR: tmpl.heartRateAvg ? String(tmpl.heartRateAvg) : "",
        templateTitle: tmpl.name,
      },
    });
  }, [router]);

  const handleAddBuiltIn = useCallback(async (idx: number) => {
    const preset = BUILT_IN_TEMPLATES[idx];
    await saveTemplate(preset);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadTemplates();
  }, [loadTemplates]);

  const renderTemplate = useCallback(({ item }: { item: WorkoutTemplate }) => (
    <View style={{
      backgroundColor: SF.surface, borderRadius: 16, padding: 14, marginBottom: 10,
      borderWidth: 1, borderColor: SF.border2,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{
          width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center",
          backgroundColor: item.color + "18", borderWidth: 1, borderColor: item.color + "30",
        }}>
          <MaterialIcons name={item.icon as any} size={24} color={item.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{item.name}</Text>
          <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 }}>
            {item.durationMinutes} min · {item.estimatedCalories} kcal
            {item.distanceKm ? ` · ${item.distanceKm} km` : ""}
          </Text>
          {item.usageCount > 0 && (
            <Text style={{ color: "#B45309", fontFamily: "DMSans_400Regular", fontSize: 9, marginTop: 2 }}>
              Used {item.usageCount} time{item.usageCount !== 1 ? "s" : ""}
              {item.lastUsedAt ? ` · Last: ${new Date(item.lastUsedAt).toLocaleDateString()}` : ""}
            </Text>
          )}
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          onPress={() => handleUseTemplate(item)}
          style={{
            flex: 1, backgroundColor: SF.gold, borderRadius: 10, paddingVertical: 10,
            flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          <MaterialIcons name="play-arrow" size={18} color={SF.bg} />
          <Text style={{ color: SF.bg, fontFamily: "DMSans_700Bold", fontSize: 13 }}>Use Template</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={{
            width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center",
            backgroundColor: "rgba(239,68,68,0.10)", borderWidth: 1, borderColor: "rgba(239,68,68,0.20)",
          }}
        >
          <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  ), [handleUseTemplate, handleDelete]);

  // Determine which built-in templates haven't been added yet
  const existingNames = new Set(templates.map((t) => t.name));
  const suggestedTemplates = BUILT_IN_TEMPLATES.filter((b) => !existingNames.has(b.name));

  return (
    <View style={{ flex: 1, backgroundColor: SF.bg }}>
      <ImageBackground source={{ uri: DASHBOARD_BG }} style={{ flex: 1 }} imageStyle={{ opacity: 0.08 }}>
        <ScreenContainer edges={["top", "left", "right"]} className="flex-1">
          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
            paddingTop: 8, paddingBottom: 12, gap: 12,
          }}>
            <TouchableOpacity onPress={() => router.back()} style={{
              width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(245,158,11,0.10)",
              alignItems: "center", justifyContent: "center",
            }}>
              <MaterialIcons name="arrow-back" size={22} color={SF.gold3} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 20 }}>Workout Templates</Text>
              <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 11 }}>
                {templates.length} template{templates.length !== 1 ? "s" : ""} saved
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/log-workout" as any)}
              style={{
                flexDirection: "row", alignItems: "center", gap: 4,
                backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 10,
                paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: SF.border2,
              }}
            >
              <MaterialIcons name="add" size={16} color={SF.gold} />
              <Text style={{ color: SF.gold, fontFamily: "DMSans_600SemiBold", fontSize: 12 }}>New</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={SF.gold} size="large" />
            </View>
          ) : (
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={renderTemplate}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              ListHeaderComponent={
                suggestedTemplates.length > 0 ? (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
                      SUGGESTED TEMPLATES
                    </Text>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                      {suggestedTemplates.map((s, i) => (
                        <TouchableOpacity
                          key={s.name}
                          onPress={() => handleAddBuiltIn(BUILT_IN_TEMPLATES.indexOf(s))}
                          style={{
                            flexDirection: "row", alignItems: "center", gap: 6,
                            backgroundColor: SF.surface, borderRadius: 10, paddingHorizontal: 10,
                            paddingVertical: 8, borderWidth: 1, borderColor: SF.border,
                          }}
                        >
                          <MaterialIcons name={s.icon as any} size={14} color={s.color} />
                          <Text style={{ color: SF.fg, fontFamily: "DMSans_500Medium", fontSize: 11 }}>{s.name}</Text>
                          <MaterialIcons name="add-circle-outline" size={14} color={SF.gold} />
                        </TouchableOpacity>
                      ))}
                    </View>
                    {templates.length > 0 && (
                      <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginTop: 20, marginBottom: 4 }}>
                        YOUR TEMPLATES
                      </Text>
                    )}
                  </View>
                ) : templates.length > 0 ? (
                  <Text style={{ color: SF.gold, fontFamily: "DMSans_700Bold", fontSize: 12, letterSpacing: 1, marginBottom: 10 }}>
                    YOUR TEMPLATES
                  </Text>
                ) : null
              }
              ListEmptyComponent={
                suggestedTemplates.length === 0 ? (
                  <View style={{ alignItems: "center", paddingVertical: 40 }}>
                    <MaterialIcons name="bookmark-border" size={48} color="#B45309" />
                    <Text style={{ color: SF.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginTop: 12 }}>No Templates Yet</Text>
                    <Text style={{ color: SF.muted, fontFamily: "DMSans_400Regular", fontSize: 13, textAlign: "center", marginTop: 4 }}>
                      Log a workout and save it as a template for quick access
                    </Text>
                  </View>
                ) : null
              }
            />
          )}
        </ScreenContainer>
      </ImageBackground>
    </View>
  );
}
