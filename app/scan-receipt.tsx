import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { usePantry, type PantryCategory } from "@/lib/pantry-context";
import { trpc } from "@/lib/trpc";

const SF = { bg: "#0A0500", card: "#150A00", orange: "#F59E0B", gold: "#FBBF24", cream: "#FDE68A", muted: "#B45309", text: "#FFF7ED", border: "rgba(245,158,11,0.10)", green: "#22C55E" };

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
  estimatedExpiry: number;
  selected: boolean;
}

const CATEGORY_MAP: Record<string, PantryCategory> = {
  produce: "Vegetables",
  dairy: "Dairy",
  meat: "Proteins",
  seafood: "Proteins",
  grains: "Grains & Carbs",
  canned: "Other",
  frozen: "Other",
  beverages: "Beverages",
  snacks: "Other",
  condiments: "Condiments & Spices",
  bakery: "Grains & Carbs",
  other: "Other",
};

export default function ScanReceiptScreen() {
  const router = useRouter();
  const { addItems } = usePantry();
  const uploadPhoto = trpc.upload.photo.useMutation();
  const scanReceipt = trpc.receipt.scan.useMutation();

  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [storeName, setStoreName] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [receiptDate, setReceiptDate] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function pickImage(useCamera: boolean) {
    const opts: ImagePicker.ImagePickerOptions = {
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    };
    const result = useCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0].uri);
      setItems([]);
      setAdded(false);
      await analyzeReceipt(result.assets[0].uri, result.assets[0].base64 ?? null);
    }
  }

  async function analyzeReceipt(uri: string, base64Input: string | null) {
    setScanning(true);
    try {
      let base64 = base64Input;
      if (!base64) {
        if (Platform.OS === "web") {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const r = reader.result as string;
              resolve(r.split(",")[1] ?? r);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          let readUri = uri;
          if (uri.startsWith("ph://")) {
            const cacheUri = FileSystem.cacheDirectory + `receipt_${Date.now()}.jpg`;
            await FileSystem.copyAsync({ from: uri, to: cacheUri });
            readUri = cacheUri;
          }
          base64 = await FileSystem.readAsStringAsync(readUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
      }
      if (!base64) throw new Error("Could not read image.");

      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      const result = await scanReceipt.mutateAsync({ photoUrl: url });

      setStoreName(result.storeName ?? null);
      setTotal(result.total ?? 0);
      setReceiptDate(result.date ?? null);
      setItems(
        (result.items ?? []).map((item: any) => ({
          name: item.name ?? "Unknown",
          quantity: item.quantity ?? 1,
          price: item.price ?? 0,
          category: item.category ?? "other",
          estimatedExpiry: item.estimatedExpiry ?? 7,
          selected: true,
        }))
      );
    } catch (e: any) {
      Alert.alert("Scan Failed", e.message ?? "Could not read the receipt. Try a clearer photo.");
    } finally {
      setScanning(false);
    }
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  function selectAll() {
    setItems(prev => prev.map(item => ({ ...item, selected: true })));
  }

  function deselectAll() {
    setItems(prev => prev.map(item => ({ ...item, selected: false })));
  }

  async function addToPantry() {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) {
      Alert.alert("No Items", "Select at least one item to add.");
      return;
    }
    const pantryItems = selected.map(item => {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + item.estimatedExpiry);
      return {
        name: item.name,
        category: CATEGORY_MAP[item.category] ?? ("Other" as PantryCategory),
        quantity: item.quantity,
        unit: "item" as string,
        expiresAt: expDate.toISOString(),
        source: "ai-scan" as const,
      };
    });
    await addItems(pantryItems);
    setAdded(true);
    Alert.alert(
      "Added to Pantry",
      `${selected.length} item${selected.length !== 1 ? "s" : ""} added to your pantry.`
    );
  }

  const selectedCount = items.filter(i => i.selected).length;

  const getCategoryIcon = (cat: string): keyof typeof MaterialIcons.glyphMap => {
    const map: Record<string, keyof typeof MaterialIcons.glyphMap> = {
      produce: "eco", dairy: "water-drop", meat: "restaurant", seafood: "set-meal",
      grains: "grain", canned: "inventory-2", frozen: "ac-unit", beverages: "local-cafe",
      snacks: "cookie", condiments: "science", bakery: "bakery-dining", other: "category",
    };
    return map[cat] ?? "category";
  };

  const renderItem = ({ item, index }: { item: ReceiptItem; index: number }) => (
    <TouchableOpacity
      style={[styles.itemCard, item.selected && styles.itemSelected]}
      onPress={() => toggleItem(index)}
      activeOpacity={0.7}
    >
      <View style={styles.itemRow}>
        <View style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
          {item.selected && <MaterialIcons name="check" size={14} color="#0A0500" />}
        </View>
        <MaterialIcons name={getCategoryIcon(item.category)} size={18} color={item.selected ? SF.orange : SF.muted} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemName, !item.selected && styles.itemDeselected]} numberOfLines={1}>{item.name}</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
            <Text style={styles.itemDetail}>x{item.quantity}</Text>
            {item.price > 0 && <Text style={styles.itemDetail}>${item.price.toFixed(2)}</Text>}
            <Text style={styles.itemDetail}>{item.estimatedExpiry}d shelf life</Text>
          </View>
        </View>
        <View style={styles.catPill}>
          <Text style={styles.catText}>{item.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-background">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={22} color={SF.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={{ width: 36 }} />
      </View>

      {!receiptImage && !scanning && items.length === 0 && (
        <View style={styles.pickSection}>
          <MaterialIcons name="receipt-long" size={56} color={SF.muted} />
          <Text style={styles.pickTitle}>Scan a grocery receipt</Text>
          <Text style={styles.pickDesc}>AI will extract items and add them to your pantry with estimated expiry dates.</Text>
          <View style={styles.pickBtns}>
            <TouchableOpacity style={styles.pickBtn} onPress={() => pickImage(true)}>
              <MaterialIcons name="photo-camera" size={22} color="#0A0500" />
              <Text style={styles.pickBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.pickBtn, styles.pickBtnAlt]} onPress={() => pickImage(false)}>
              <MaterialIcons name="photo-library" size={22} color={SF.orange} />
              <Text style={[styles.pickBtnText, { color: SF.orange }]}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {scanning && (
        <View style={styles.scanningSection}>
          {receiptImage && (
            <Image source={{ uri: receiptImage }} style={styles.receiptPreview} contentFit="cover" />
          )}
          <ActivityIndicator color={SF.orange} size="large" style={{ marginTop: 16 }} />
          <Text style={styles.scanningText}>Reading receipt...</Text>
          <Text style={styles.scanningSubtext}>AI is extracting grocery items</Text>
        </View>
      )}

      {!scanning && items.length > 0 && (
        <View style={{ flex: 1 }}>
          {/* Receipt summary */}
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="receipt" size={18} color={SF.green} />
              <Text style={styles.summaryTitle}>{storeName ?? "Receipt"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <Text style={styles.summaryDetail}>{items.length} items found</Text>
              {total > 0 && <Text style={styles.summaryDetail}>Total: ${total.toFixed(2)}</Text>}
              {receiptDate && <Text style={styles.summaryDetail}>{receiptDate}</Text>}
            </View>
          </View>

          {/* Selection controls */}
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedCount} of {items.length} selected</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectionAction}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAll}>
                <Text style={styles.selectionAction}>None</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          />

          {/* Bottom action bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={[styles.rescanBtn]} onPress={() => { setReceiptImage(null); setItems([]); setAdded(false); }}>
              <MaterialIcons name="refresh" size={18} color={SF.orange} />
              <Text style={styles.rescanText}>New Scan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, added && styles.addBtnDone]}
              onPress={added ? () => router.push("/pantry") : addToPantry}
              disabled={!added && selectedCount === 0}
            >
              <MaterialIcons name={added ? "check-circle" : "add-shopping-cart"} size={18} color="#0A0500" />
              <Text style={styles.addBtnText}>
                {added ? "View Pantry" : `Add ${selectedCount} to Pantry`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: SF.border },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: SF.card, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 18 },
  pickSection: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
  pickTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 20, marginTop: 8 },
  pickDesc: { color: SF.muted, fontSize: 13, textAlign: "center", lineHeight: 20 },
  pickBtns: { flexDirection: "row", gap: 12, marginTop: 16 },
  pickBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  pickBtnAlt: { backgroundColor: "rgba(245,158,11,0.10)", borderWidth: 1, borderColor: SF.border },
  pickBtnText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 },
  scanningSection: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  receiptPreview: { width: 200, height: 280, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  scanningText: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 16, marginTop: 12 },
  scanningSubtext: { color: SF.muted, fontSize: 12, marginTop: 4 },
  summaryCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: SF.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  summaryTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 15 },
  summaryDetail: { color: SF.muted, fontSize: 11 },
  selectionBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 },
  selectionText: { color: SF.muted, fontSize: 12 },
  selectionAction: { color: SF.orange, fontSize: 12, fontFamily: "Outfit_700Bold" },
  itemCard: { backgroundColor: SF.card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: SF.border },
  itemSelected: { borderColor: "rgba(245,158,11,0.25)" },
  itemRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: SF.muted, alignItems: "center", justifyContent: "center", marginRight: 8 },
  checkboxChecked: { backgroundColor: SF.orange, borderColor: SF.orange },
  itemName: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 13 },
  itemDeselected: { color: SF.muted, textDecorationLine: "line-through" },
  itemDetail: { color: SF.muted, fontSize: 10 },
  catPill: { backgroundColor: "rgba(245,158,11,0.10)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  catText: { color: SF.cream, fontSize: 9, fontFamily: "Outfit_700Bold", textTransform: "capitalize" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32, backgroundColor: SF.bg, borderTopWidth: 1, borderTopColor: SF.border },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  rescanText: { color: SF.orange, fontFamily: "Outfit_700Bold", fontSize: 13 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 12, paddingVertical: 12 },
  addBtnDone: { backgroundColor: SF.green },
  addBtnText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 },
});
