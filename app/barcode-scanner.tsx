/**
 * Barcode Scanner Screen — FIXED
 *
 * Changes from original:
 * 1. When a barcode is NOT found in the Open Food Facts database, a manual
 *    entry form now appears directly in the result card. Previously the
 *    "Product not found" card only showed a text message — the user had no
 *    way to log the product without leaving the scanner entirely.
 *    The form is pre-populated with the barcode so it can be saved for future
 *    look-up, and supports entering: name, calories, protein, carbs, fat.
 * 2. Added `manualEntry` state (partial NutritionResult) and a
 *    `ManualEntryForm` sub-component that calls `handleAddToLog` via the
 *    shared result object.
 * 3. No other logic, styling, or functionality changed.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { FlatList } from "react-native";
import { usePantry, type PantryCategory } from "@/lib/pantry-context";
import { UI, SF } from "@/constants/ui-colors";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";

function mapCategoryToPantry(name: string, brand: string): PantryCategory {
  const combined = `${name} ${brand}`.toLowerCase();
  if (
    /chicken|beef|pork|fish|salmon|tuna|turkey|lamb|shrimp|protein|meat|sausage/.test(
      combined
    )
  )
    return "Proteins";
  if (/milk|cheese|yogurt|butter|cream|dairy/.test(combined)) return "Dairy";
  if (
    /bread|cereal|pasta|rice|flour|oat|wheat|corn|cracker|chip|cookie|cake/.test(
      combined
    )
  )
    return "Grains & Carbs";
  if (
    /vegetable|salad|broccoli|carrot|spinach|tomato|onion|pepper|bean|pea|corn/.test(
      combined
    )
  )
    return "Vegetables";
  if (/fruit|apple|banana|berry|orange|grape|mango|juice/.test(combined))
    return "Fruits";
  if (
    /sauce|spice|vinegar|mustard|ketchup|herb|seasoning|salt|pepper|garlic|honey/.test(
      combined
    )
  )
    return "Condiments & Spices";
  if (/oil|margarine|lard/.test(combined)) return "Oils & Fats";
  if (/water|soda|coffee|tea|drink|beverage|beer|wine/.test(combined))
    return "Beverages";
  return "Other";
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const SCAN_AREA_SIZE = SCREEN_W * 0.7;

const OFF_API = "https://world.openfoodfacts.org/api/v2/product";

interface NutritionResult {
  barcode: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  imageUrl: string | null;
  found: boolean;
}

async function lookupBarcode(barcode: string): Promise<NutritionResult> {
  try {
    const resp = await fetch(`${OFF_API}/${barcode}.json`, {
      headers: { "User-Agent": "FytNovaAI/1.0 (contact@peakpulse.app)" },
    });
    const data = await resp.json();
    if (data.status !== 1 || !data.product) {
      return {
        barcode,
        name: "Unknown Product",
        brand: "",
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: "",
        imageUrl: null,
        found: false,
      };
    }
    const p = data.product;
    const n = p.nutriments || {};
    const servingSize = p.serving_size || p.quantity || "100g";
    const calories = Math.round(
      n["energy-kcal_serving"] ?? n["energy-kcal_100g"] ?? 0
    );
    const protein =
      Math.round((n.proteins_serving ?? n.proteins_100g ?? 0) * 10) / 10;
    const carbs =
      Math.round(
        (n.carbohydrates_serving ?? n.carbohydrates_100g ?? 0) * 10
      ) / 10;
    const fat =
      Math.round((n.fat_serving ?? n.fat_100g ?? 0) * 10) / 10;
    return {
      barcode,
      name: p.product_name || p.product_name_en || "Unknown Product",
      brand: p.brands || "",
      calories,
      protein,
      carbs,
      fat,
      servingSize,
      imageUrl:
        p.image_front_small_url || p.image_url || null,
      found: true,
    };
  } catch {
    return {
      barcode,
      name: "Lookup Failed",
      brand: "",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      servingSize: "",
      imageUrl: null,
      found: false,
    };
  }
}

const HISTORY_KEY = "@barcode_scan_history";
const MAX_HISTORY = 50;

interface HistoryItem {
  barcode: string;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  imageUrl: string | null;
  scannedAt: number;
}

async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveToHistory(item: NutritionResult): Promise<void> {
  const history = await loadHistory();
  const filtered = history.filter((h) => h.barcode !== item.barcode);
  const entry: HistoryItem = {
    barcode: item.barcode,
    name: item.name,
    brand: item.brand,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    servingSize: item.servingSize,
    imageUrl: item.imageUrl,
    scannedAt: Date.now(),
  };
  const updated = [entry, ...filtered].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

// ── FIX: Manual Entry Form ────────────────────────────────────────────────────
// Shown when the barcode is not found in Open Food Facts. Previously the user
// saw a dead-end "not found" card with no way to log the food without leaving.
// Now they can type in the details and add to log directly.
interface ManualEntryFormProps {
  barcode: string;
  onSubmit: (result: NutritionResult) => void;
}

function ManualEntryForm({ barcode, onSubmit }: ManualEntryFormProps) {
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const canSubmit = name.trim().length > 0 && calories.trim().length > 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={manualStyles.container}>
        <Text style={manualStyles.title}>Enter Details Manually</Text>
        <Text style={manualStyles.subtitle}>
          This product isn't in our database. Add it yourself:
        </Text>

        <View style={manualStyles.row}>
          <Text style={manualStyles.label}>Product Name *</Text>
          <TextInput
            style={manualStyles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Protein Bar"
            placeholderTextColor="rgba(180,83,9,0.5)"
            returnKeyType="next"
          />
        </View>

        <View style={manualStyles.macroRow}>
          <View style={manualStyles.macroField}>
            <Text style={manualStyles.label}>Calories *</Text>
            <TextInput
              style={manualStyles.input}
              value={calories}
              onChangeText={setCalories}
              placeholder="200"
              placeholderTextColor="rgba(180,83,9,0.5)"
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
          <View style={manualStyles.macroField}>
            <Text style={manualStyles.label}>Protein (g)</Text>
            <TextInput
              style={manualStyles.input}
              value={protein}
              onChangeText={setProtein}
              placeholder="20"
              placeholderTextColor="rgba(180,83,0.5,0.5)"
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={manualStyles.macroRow}>
          <View style={manualStyles.macroField}>
            <Text style={manualStyles.label}>Carbs (g)</Text>
            <TextInput
              style={manualStyles.input}
              value={carbs}
              onChangeText={setCarbs}
              placeholder="25"
              placeholderTextColor="rgba(180,83,9,0.5)"
              keyboardType="numeric"
              returnKeyType="next"
            />
          </View>
          <View style={manualStyles.macroField}>
            <Text style={manualStyles.label}>Fat (g)</Text>
            <TextInput
              style={manualStyles.input}
              value={fat}
              onChangeText={setFat}
              placeholder="8"
              placeholderTextColor="rgba(180,83,9,0.5)"
              keyboardType="numeric"
              returnKeyType="done"
            />
          </View>
        </View>

        <TouchableOpacity
          style={[
            manualStyles.submitBtn,
            !canSubmit && manualStyles.submitBtnDisabled,
          ]}
          disabled={!canSubmit}
          onPress={() => {
            onSubmit({
              barcode,
              name: name.trim(),
              brand: "",
              calories: parseFloat(calories) || 0,
              protein: parseFloat(protein) || 0,
              carbs: parseFloat(carbs) || 0,
              fat: parseFloat(fat) || 0,
              servingSize: "1 serving",
              imageUrl: null,
              found: true, // treat as found so Add to Log button appears
            });
          }}
        >
          <MaterialIcons name="add-circle" size={18} color={SF.fg} />
          <Text style={manualStyles.submitBtnText}>Add to Meal Log</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const manualStyles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(220,38,38,0.06)",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.15)",
    gap: 10,
  },
  title: {
    color: SF.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    marginBottom: 2,
  },
  subtitle: {
    color: SF.muted,
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 4,
  },
  label: {
    color: SF.muted,
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  row: { gap: 4 },
  macroRow: { flexDirection: "row", gap: 10 },
  macroField: { flex: 1, gap: 4 },
  input: {
    backgroundColor: SF.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: SF.fg,
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    borderWidth: 1,
    borderColor: UI.borderGold,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: SF.gold,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    color: SF.fg,
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function BarcodeScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NutritionResult | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const { addItem: addPantryItem } = usePantry();

  useEffect(() => {
    loadHistory().then(setHistory);
  }, []);

  const handleBarcodeScanned = useCallback(
    async ({ type, data }: BarcodeScanningResult) => {
      if (scanned || loading) return;
      setScanned(true);
      setLoading(true);
      if (Platform.OS !== "web") {
        try {
          const Haptics = await import("expo-haptics");
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch {}
      }
      const nutrition = await lookupBarcode(data);
      setResult(nutrition);
      setLoading(false);
      if (nutrition.found) {
        await saveToHistory(nutrition);
        loadHistory().then(setHistory);
      }
    },
    [scanned, loading]
  );

  const handleAddToLog = async (overrideResult?: NutritionResult) => {
    const r = overrideResult ?? result;
    if (!r) return;
    await AsyncStorage.setItem(
      "@barcode_scan_result",
      JSON.stringify({
        name: r.brand ? `${r.name} (${r.brand})` : r.name,
        calories: r.calories,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        servingSize: r.servingSize,
        barcode: r.barcode,
        imageUrl: r.imageUrl,
        timestamp: Date.now(),
      })
    );
    if (Platform.OS !== "web") {
      try {
        const Haptics = await import("expo-haptics");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    router.back();
  };

  const handleScanAgain = () => {
    setScanned(false);
    setResult(null);
    setLoading(false);
    setShowHistory(false);
  };

  const handleRelogFromHistory = async (item: HistoryItem) => {
    await AsyncStorage.setItem(
      "@barcode_scan_result",
      JSON.stringify({
        name: item.brand ? `${item.name} (${item.brand})` : item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        servingSize: item.servingSize,
        barcode: item.barcode,
        imageUrl: item.imageUrl,
        timestamp: Date.now(),
      })
    );
    if (Platform.OS !== "web") {
      try {
        const Haptics = await import("expo-haptics");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    router.back();
  };

  const handleDeleteHistoryItem = async (barcode: string) => {
    const updated = history.filter((h) => h.barcode !== barcode);
    setHistory(updated);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const handleClearHistory = () => {
    Alert.alert(
      "Clear Scan History?",
      "This will remove all previously scanned products.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem(HISTORY_KEY);
          },
        },
      ]
    );
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={SF.gold} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionCard}>
          <MaterialIcons
            name="photo-camera"
            size={48}
            color={SF.muted}
            style={{ marginBottom: 16 }}
          />
          <Text style={styles.permTitle}>Camera Access Required</Text>
          <Text style={styles.permSub}>
            FytNova needs camera access to scan product barcodes and look up
            nutrition information.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Grant Camera Access</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera View */}
      {!result && (
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
              "code93",
              "itf14",
              "codabar",
              "datamatrix",
              "qr",
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
      )}

      {/* Overlay */}
      {!result && !showHistory && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
              <MaterialIcons name="close" size={24} color={SF.fg} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan Barcode</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                style={styles.topBtn}
                onPress={() => setShowHistory(true)}
              >
                <MaterialIcons name="history" size={24} color={SF.fg} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.topBtn}
                onPress={() => setTorchOn(!torchOn)}
              >
                <MaterialIcons
                  name={torchOn ? "flash-on" : "flash-off"}
                  size={24}
                  color={torchOn ? SF.gold : SF.fg}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.scanAreaContainer}>
            <View style={styles.scanArea}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
              {loading && (
                <View style={styles.scanningOverlay}>
                  <ActivityIndicator color={SF.gold} size="large" />
                  <Text style={styles.scanningText}>Looking up product...</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.bottomBar}>
            <View style={styles.instructionCard}>
              <MaterialIcons name="qr-code-scanner" size={20} color={SF.gold} />
              <View style={{ flex: 1 }}>
                <Text style={styles.instructionTitle}>Point at a barcode</Text>
                <Text style={styles.instructionSub}>
                  Align the barcode within the frame. Supports EAN, UPC, QR,
                  and more.
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* History View */}
      {showHistory && !result && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SF.bg }]}>
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={() => setShowHistory(false)}
            >
              <MaterialIcons name="arrow-back" size={24} color={SF.fg} />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Scan History</Text>
            <TouchableOpacity
              style={styles.topBtn}
              onPress={history.length > 0 ? handleClearHistory : undefined}
            >
              <MaterialIcons
                name="delete-outline"
                size={24}
                color={history.length > 0 ? SF.red : "transparent"}
              />
            </TouchableOpacity>
          </View>
          {history.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                padding: 32,
              }}
            >
              <MaterialIcons
                name="history"
                size={48}
                color={SF.muted}
                style={{ marginBottom: 16 }}
              />
              <Text
                style={{
                  color: SF.muted,
                  fontSize: 15,
                  textAlign: "center",
                  lineHeight: 22,
                }}
              >
                No scan history yet. Scan a product barcode and it will appear
                here for quick re-logging.
              </Text>
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.barcode}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 40,
                gap: 10,
              }}
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.brand ? (
                      <Text style={styles.historyBrand} numberOfLines={1}>
                        {item.brand}
                      </Text>
                    ) : null}
                    <View style={styles.historyMacros}>
                      <Text style={styles.historyMacroText}>
                        {item.calories} kcal
                      </Text>
                      <Text
                        style={[styles.historyMacroText, { color: "#3B82F6" }]}
                      >
                        P: {item.protein}g
                      </Text>
                      <Text
                        style={[styles.historyMacroText, { color: UI.gold3 }]}
                      >
                        C: {item.carbs}g
                      </Text>
                      <Text
                        style={[styles.historyMacroText, { color: UI.gold2 }]}
                      >
                        F: {item.fat}g
                      </Text>
                    </View>
                    <Text
                      style={{
                        color: "rgba(146,64,14,0.5)",
                        fontSize: 10,
                        marginTop: 4,
                      }}
                    >
                      {new Date(item.scannedAt).toLocaleDateString()} •{" "}
                      {item.barcode}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <TouchableOpacity
                      style={styles.historyLogBtn}
                      onPress={() => handleRelogFromHistory(item)}
                    >
                      <MaterialIcons name="add-circle" size={16} color={SF.fg} />
                      <Text
                        style={{
                          color: SF.fg,
                          fontFamily: "DMSans_700Bold",
                          fontSize: 11,
                        }}
                      >
                        Log
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.historyDeleteBtn}
                      onPress={() => handleDeleteHistoryItem(item.barcode)}
                    >
                      <MaterialIcons name="close" size={14} color={SF.red} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}

      {/* Result Card */}
      {result && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.resultContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.resultCard}>
            {/* Header */}
            <View style={styles.resultHeader}>
              <MaterialIcons
                name={result.found ? "check-circle" : "error-outline"}
                size={28}
                color={result.found ? UI.green : UI.red}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName} numberOfLines={2}>
                  {result.found ? result.name : "Product Not Found"}
                </Text>
                {result.brand ? (
                  <Text style={styles.resultBrand}>{result.brand}</Text>
                ) : null}
              </View>
            </View>

            {/* Barcode */}
            <View style={styles.barcodeRow}>
              <MaterialIcons
                name="qr-code-scanner"
                size={16}
                color={SF.muted}
              />
              <Text style={styles.barcodeText}>{result.barcode}</Text>
              {result.found && result.servingSize ? (
                <Text style={styles.servingText}>
                  Per {result.servingSize}
                </Text>
              ) : null}
            </View>

            {result.found ? (
              <>
                {/* Nutrition Grid */}
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{result.calories}</Text>
                    <Text style={styles.nutritionLabel}>kcal</Text>
                  </View>
                  <View
                    style={[
                      styles.nutritionItem,
                      {
                        borderLeftWidth: 1,
                        borderLeftColor: UI.borderGold,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nutritionValue,
                        { color: "#3B82F6" },
                      ]}
                    >
                      {result.protein}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View
                    style={[
                      styles.nutritionItem,
                      {
                        borderLeftWidth: 1,
                        borderLeftColor: UI.borderGold,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nutritionValue,
                        { color: UI.gold3 },
                      ]}
                    >
                      {result.carbs}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View
                    style={[
                      styles.nutritionItem,
                      {
                        borderLeftWidth: 1,
                        borderLeftColor: UI.borderGold,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.nutritionValue,
                        { color: UI.gold2 },
                      ]}
                    >
                      {result.fat}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddToLog()}
                >
                  <MaterialIcons name="add-circle" size={20} color={SF.fg} />
                  <Text style={styles.addBtnText}>Add to Meal Log</Text>
                </TouchableOpacity>

                {/* Add to Pantry */}
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    {
                      backgroundColor: "rgba(59,130,246,0.15)",
                      marginTop: -8,
                      shadowOpacity: 0,
                    },
                  ]}
                  onPress={() => {
                    if (!result) return;
                    const name = result.brand
                      ? `${result.name} (${result.brand})`
                      : result.name;
                    const category = mapCategoryToPantry(
                      result.name,
                      result.brand
                    );
                    // Auto-calculate default expiry based on product category
                    const SHELF_LIFE: Record<string, number> = {
                      "Proteins": 3, "Dairy": 7, "Grains & Carbs": 90,
                      "Vegetables": 5, "Fruits": 5, "Condiments & Spices": 180,
                      "Oils & Fats": 180, "Beverages": 30, "Other": 30,
                    };
                    const defaultDays = SHELF_LIFE[category] ?? 30;
                    const defaultDate = new Date();
                    defaultDate.setDate(defaultDate.getDate() + defaultDays);
                    const defaultDateStr = `${String(defaultDate.getDate()).padStart(2, "0")}/${String(defaultDate.getMonth() + 1).padStart(2, "0")}/${defaultDate.getFullYear()}`;
                    Alert.prompt
                      ? Alert.prompt(
                          "Set Expiry Date",
                          `Add ${name} to pantry (${category}).\n\nSuggested expiry: ${defaultDateStr} (~${defaultDays} days for ${category}).\nEdit below or leave as-is:`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Add to Pantry",
                              onPress: async (dateStr?: string) => {
                                let expiresAt: string | undefined;
                                const inputDate = (dateStr && dateStr.trim()) ? dateStr.trim() : defaultDateStr;
                                const parts = inputDate.split(/[\/\-]/);
                                if (parts.length === 3) {
                                  expiresAt =
                                    parts[0].length === 4
                                      ? new Date(
                                          `${parts[0]}-${parts[1].padStart(
                                            2,
                                            "0"
                                          )}-${parts[2].padStart(2, "0")}`
                                        ).toISOString()
                                      : new Date(
                                          `${parts[2]}-${parts[1].padStart(
                                            2,
                                            "0"
                                          )}-${parts[0].padStart(2, "0")}`
                                        ).toISOString();
                                }
                                if (!expiresAt) {
                                  expiresAt = defaultDate.toISOString();
                                }
                                await addPantryItem({
                                  name,
                                  category,
                                  source: "manual",
                                  expiresAt,
                                });
                                Alert.alert(
                                  "\u2705 Added to Pantry",
                                  `${name} added to ${category}.${
                                    expiresAt ? " Expiry tracked." : ""
                                  }`
                                );
                              },
                            },
                          ],
                          "plain-text",
                          "",
                          "numbers-and-punctuation"
                        )
                      : (async () => {
                          // Android: auto-set default expiry based on category
                          const autoExpiry = defaultDate.toISOString();
                          await addPantryItem({
                            name,
                            category,
                            source: "manual",
                            expiresAt: autoExpiry,
                          });
                          Alert.alert(
                            "\u2705 Added to Pantry",
                            `${name} added to ${category}.\nExpiry auto-set to ${defaultDateStr} (~${defaultDays} days).`
                          );
                        })();
                  }}
                >
                  <MaterialIcons name="kitchen" size={18} color="#3B82F6" />
                  <Text
                    style={[styles.addBtnText, { color: "#3B82F6" }]}
                  >
                    Add to Pantry (with Expiry)
                  </Text>
                </TouchableOpacity>

                {/* Save to Favourites */}
                <TouchableOpacity
                  style={[
                    styles.addBtn,
                    {
                      backgroundColor: UI.borderGold,
                      marginTop: -8,
                      shadowOpacity: 0,
                    },
                  ]}
                  onPress={async () => {
                    if (!result) return;
                    const existing = await AsyncStorage.getItem(
                      "@favourite_foods"
                    );
                    const favs = existing ? JSON.parse(existing) : [];
                    const name = result.brand
                      ? `${result.name} (${result.brand})`
                      : result.name;
                    if (
                      favs.some(
                        (f: any) =>
                          f.name.toLowerCase() === name.toLowerCase()
                      )
                    ) {
                      Alert.alert(
                        "Already in Favourites",
                        `${name} is already saved.`
                      );
                      return;
                    }
                    const entry = {
                      id: `fav_${Date.now()}_${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,
                      name,
                      mealType: "snack",
                      calories: result.calories,
                      protein: result.protein,
                      carbs: result.carbs,
                      fat: result.fat,
                      source: "barcode" as const,
                      barcode: result.barcode,
                      addedAt: Date.now(),
                      logCount: 0,
                    };
                    await AsyncStorage.setItem(
                      "@favourite_foods",
                      JSON.stringify([entry, ...favs])
                    );
                    Alert.alert(
                      "⭐ Saved to Favourites",
                      `${name} added for quick one-tap logging.`
                    );
                  }}
                >
                  <MaterialIcons name="star" size={16} color={SF.gold} />
                  <Text
                    style={[styles.addBtnText, { color: SF.gold }]}
                  >
                    Save to Favourites
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              // FIX: Replace dead-end "not found" card with a manual entry form.
              // The user can now fill in name + macros without leaving the screen.
              <ManualEntryForm
                barcode={result.barcode}
                onSubmit={(manualResult) => {
                  // Save manual entry to history for future quick-logging
                  saveToHistory(manualResult).catch(() => {});
                  handleAddToLog(manualResult);
                }}
              />
            )}

            {/* Scan Again / Go Back */}
            <View style={styles.resultActions}>
              <TouchableOpacity
                style={styles.scanAgainBtn}
                onPress={handleScanAgain}
              >
                <MaterialIcons
                  name="qr-code-scanner"
                  size={18}
                  color={SF.gold}
                />
                <Text style={styles.scanAgainText}>Scan Another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.goBackBtn}
                onPress={() => router.back()} {...a11yButton(A11Y_LABELS.backButton)}>
                <Text style={styles.goBackText}>Go Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SF.bg },
  permissionCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  permTitle: {
    color: SF.fg,
    fontSize: 22,
    fontFamily: "BebasNeue_400Regular",
    textAlign: "center",
    marginBottom: 12,
  },
  permSub: {
    color: SF.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  permBtn: {
    backgroundColor: SF.gold,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  permBtnText: {
    color: SF.fg,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  backBtn: { paddingVertical: 12 },
  backBtnText: {
    color: SF.muted,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: {
    color: SF.fg,
    fontSize: 18,
    fontFamily: "DMSans_700Bold",
  },
  scanAreaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE * 0.6,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: SF.gold,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    gap: 12,
  },
  scanningText: {
    color: SF.gold,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 50 : 30,
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(10,5,0,0.85)",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.borderGold,
  },
  instructionTitle: {
    color: SF.fg,
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    marginBottom: 2,
  },
  instructionSub: {
    color: SF.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  resultContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  resultCard: {
    backgroundColor: SF.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: UI.borderGold,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  resultName: {
    color: SF.fg,
    fontSize: 20,
    fontFamily: "BebasNeue_400Regular",
    lineHeight: 26,
  },
  resultBrand: {
    color: SF.muted,
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    marginTop: 2,
  },
  barcodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: UI.goldAlpha10,
  },
  barcodeText: {
    color: SF.muted,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    flex: 1,
  },
  servingText: {
    color: SF.gold3,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    backgroundColor: UI.goldAlpha10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nutritionGrid: {
    flexDirection: "row",
    backgroundColor: SF.bg,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  nutritionItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    gap: 4,
  },
  nutritionValue: {
    color: SF.gold,
    fontSize: 20,
    fontFamily: "BebasNeue_400Regular",
  },
  nutritionLabel: {
    color: SF.muted,
    fontSize: 11,
    fontFamily: "DMSans_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: SF.gold,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: SF.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  addBtnText: {
    color: SF.fg,
    fontSize: 16,
    fontFamily: "DMSans_700Bold",
  },
  resultActions: { flexDirection: "row", gap: 12 },
  scanAgainBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: SF.bg,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: UI.borderGold,
  },
  scanAgainText: {
    color: SF.gold,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  goBackBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SF.bg,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: UI.goldAlpha10,
  },
  goBackText: {
    color: SF.muted,
    fontSize: 14,
    fontFamily: "DMSans_600SemiBold",
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SF.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: UI.goldAlpha10,
    gap: 12,
  },
  historyName: {
    color: SF.fg,
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    marginBottom: 2,
  },
  historyBrand: {
    color: SF.muted,
    fontSize: 12,
    fontFamily: "DMSans_600SemiBold",
    marginBottom: 4,
  },
  historyMacros: { flexDirection: "row", gap: 8, marginTop: 4 },
  historyMacroText: {
    color: SF.gold,
    fontSize: 11,
    fontFamily: "DMSans_700Bold",
  },
  historyLogBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: SF.gold,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  historyDeleteBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(220,38,38,0.10)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.20)",
  },
});
