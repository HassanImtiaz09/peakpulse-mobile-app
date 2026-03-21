import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, TextInput, Modal, ScrollView } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { usePantry, type PantryCategory } from "@/lib/pantry-context";
import { trpc } from "@/lib/trpc";

const SF = { bg: "#0A0500", card: "#150A00", orange: "#F59E0B", gold: "#FBBF24", cream: "#FDE68A", muted: "#B45309", text: "#FFF7ED", border: "rgba(245,158,11,0.10)", green: "#22C55E", blue: "#60A5FA" };

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  category: string;
  estimatedExpiry: number;
  selected: boolean;
}

const RECEIPT_CATEGORIES = ["produce", "dairy", "meat", "seafood", "grains", "canned", "frozen", "beverages", "snacks", "condiments", "bakery", "other"] as const;

const CATEGORY_MAP: Record<string, PantryCategory> = {
  produce: "Vegetables", dairy: "Dairy", meat: "Proteins", seafood: "Proteins",
  grains: "Grains & Carbs", canned: "Other", frozen: "Other", beverages: "Beverages",
  snacks: "Other", condiments: "Condiments & Spices", bakery: "Grains & Carbs", other: "Other",
};

const CATEGORY_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  produce: "eco", dairy: "water-drop", meat: "restaurant", seafood: "set-meal",
  grains: "grain", canned: "inventory-2", frozen: "ac-unit", beverages: "local-cafe",
  snacks: "cookie", condiments: "science", bakery: "bakery-dining", other: "category",
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

  // Edit state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryPickerIndex, setCategoryPickerIndex] = useState<number | null>(null);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [expiryPickerIndex, setExpiryPickerIndex] = useState<number | null>(null);

  const EXPIRY_OPTIONS = [
    { label: "1 day", days: 1 }, { label: "2 days", days: 2 }, { label: "3 days", days: 3 },
    { label: "5 days", days: 5 }, { label: "1 week", days: 7 }, { label: "2 weeks", days: 14 },
    { label: "3 weeks", days: 21 }, { label: "1 month", days: 30 }, { label: "2 months", days: 60 },
    { label: "3 months", days: 90 }, { label: "6 months", days: 180 }, { label: "1 year", days: 365 },
  ];

  async function pickImage(useCamera: boolean) {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.8, base64: true };
    const result = useCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!result.canceled && result.assets[0]) {
      setReceiptImage(result.assets[0].uri);
      setItems([]); setAdded(false); setEditingIndex(null);
      await analyzeReceipt(result.assets[0].uri, result.assets[0].base64 ?? null);
    }
  }

  async function analyzeReceipt(uri: string, base64Input: string | null) {
    setScanning(true);
    try {
      let base64 = base64Input;
      if (!base64) {
        if (Platform.OS === "web") {
          const resp = await fetch(uri); const blob = await resp.blob();
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => { const r = reader.result as string; resolve(r.split(",")[1] ?? r); };
            reader.onerror = reject; reader.readAsDataURL(blob);
          });
        } else {
          let readUri = uri;
          if (uri.startsWith("ph://")) {
            const cacheUri = FileSystem.cacheDirectory + `receipt_${Date.now()}.jpg`;
            await FileSystem.copyAsync({ from: uri, to: cacheUri }); readUri = cacheUri;
          }
          base64 = await FileSystem.readAsStringAsync(readUri, { encoding: FileSystem.EncodingType.Base64 });
        }
      }
      if (!base64) throw new Error("Could not read image.");
      const { url } = await uploadPhoto.mutateAsync({ base64, mimeType: "image/jpeg" });
      const result = await scanReceipt.mutateAsync({ photoUrl: url });
      setStoreName(result.storeName ?? null); setTotal(result.total ?? 0); setReceiptDate(result.date ?? null);
      setItems((result.items ?? []).map((item: any) => ({
        name: item.name ?? "Unknown", quantity: item.quantity ?? 1, price: item.price ?? 0,
        category: item.category ?? "other", estimatedExpiry: item.estimatedExpiry ?? 7, selected: true,
      })));
    } catch (e: any) {
      Alert.alert("Scan Failed", e.message ?? "Could not read the receipt.");
    } finally { setScanning(false); }
  }

  function toggleItem(index: number) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, selected: !item.selected } : item));
  }

  function updateItem(index: number, updates: Partial<ReceiptItem>) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  }

  function startEditName(index: number) {
    setEditingIndex(index); setEditName(items[index].name);
  }

  function commitEditName() {
    if (editingIndex !== null && editName.trim()) {
      updateItem(editingIndex, { name: editName.trim() });
    }
    setEditingIndex(null);
  }

  function openCategoryPicker(index: number) {
    setCategoryPickerIndex(index); setShowCategoryPicker(true);
  }

  function selectCategory(cat: string) {
    if (categoryPickerIndex !== null) updateItem(categoryPickerIndex, { category: cat });
    setShowCategoryPicker(false); setCategoryPickerIndex(null);
  }

  function openExpiryPicker(index: number) {
    setExpiryPickerIndex(index); setShowExpiryPicker(true);
  }

  function selectExpiry(days: number) {
    if (expiryPickerIndex !== null) updateItem(expiryPickerIndex, { estimatedExpiry: days });
    setShowExpiryPicker(false); setExpiryPickerIndex(null);
  }

  function selectAll() { setItems(prev => prev.map(item => ({ ...item, selected: true }))); }
  function deselectAll() { setItems(prev => prev.map(item => ({ ...item, selected: false }))); }

  async function addToPantry() {
    const selected = items.filter(i => i.selected);
    if (selected.length === 0) { Alert.alert("No Items", "Select at least one item."); return; }
    const pantryItems = selected.map(item => {
      const expDate = new Date(); expDate.setDate(expDate.getDate() + item.estimatedExpiry);
      return {
        name: item.name, category: CATEGORY_MAP[item.category] ?? ("Other" as PantryCategory),
        quantity: item.quantity, unit: "item" as string, expiresAt: expDate.toISOString(), source: "ai-scan" as const,
      };
    });
    await addItems(pantryItems); setAdded(true);
    Alert.alert("Added to Pantry", `${selected.length} item${selected.length !== 1 ? "s" : ""} added.`);
  }

  const selectedCount = items.filter(i => i.selected).length;

  const formatExpiry = (days: number) => {
    if (days <= 1) return "1 day";
    if (days < 7) return `${days} days`;
    if (days === 7) return "1 week";
    if (days < 30) return `${Math.round(days / 7)} weeks`;
    if (days < 60) return "1 month";
    if (days < 365) return `${Math.round(days / 30)} months`;
    return "1 year";
  };

  const renderItem = useCallback(({ item, index }: { item: ReceiptItem; index: number }) => {
    const isEditingName = editingIndex === index;
    return (
      <View style={[styles.itemCard, item.selected && styles.itemSelected]}>
        {/* Row 1: Checkbox + Name + Edit icon */}
        <View style={styles.itemRow}>
          <TouchableOpacity onPress={() => toggleItem(index)} style={[styles.checkbox, item.selected && styles.checkboxChecked]}>
            {item.selected && <MaterialIcons name="check" size={14} color="#0A0500" />}
          </TouchableOpacity>
          <MaterialIcons name={CATEGORY_ICONS[item.category] ?? "category"} size={18} color={item.selected ? SF.orange : SF.muted} style={{ marginRight: 8 }} />
          {isEditingName ? (
            <TextInput
              value={editName}
              onChangeText={setEditName}
              onBlur={commitEditName}
              onSubmitEditing={commitEditName}
              autoFocus
              returnKeyType="done"
              style={styles.nameInput}
              selectionColor={SF.orange}
            />
          ) : (
            <TouchableOpacity onPress={() => startEditName(index)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={[styles.itemName, !item.selected && styles.itemDeselected]} numberOfLines={1}>{item.name}</Text>
              <MaterialIcons name="edit" size={12} color={SF.muted} />
            </TouchableOpacity>
          )}
          {item.price > 0 && <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>}
        </View>

        {/* Row 2: Editable category + expiry + quantity */}
        <View style={styles.editRow}>
          <TouchableOpacity onPress={() => openCategoryPicker(index)} style={styles.editPill}>
            <MaterialIcons name="label" size={11} color={SF.blue} />
            <Text style={styles.editPillText}>{item.category}</Text>
            <MaterialIcons name="arrow-drop-down" size={14} color={SF.blue} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => openExpiryPicker(index)} style={styles.editPill}>
            <MaterialIcons name="event" size={11} color={SF.green} />
            <Text style={[styles.editPillText, { color: SF.green }]}>{formatExpiry(item.estimatedExpiry)}</Text>
            <MaterialIcons name="arrow-drop-down" size={14} color={SF.green} />
          </TouchableOpacity>

          <View style={styles.qtyControl}>
            <TouchableOpacity onPress={() => updateItem(index, { quantity: Math.max(1, item.quantity - 1) })}>
              <MaterialIcons name="remove" size={14} color={SF.muted} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>x{item.quantity}</Text>
            <TouchableOpacity onPress={() => updateItem(index, { quantity: item.quantity + 1 })}>
              <MaterialIcons name="add" size={14} color={SF.orange} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }, [editingIndex, editName, items]);

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
          <Text style={styles.pickDesc}>AI extracts items and adds them to your pantry with estimated expiry dates.</Text>
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
          {receiptImage && <Image source={{ uri: receiptImage }} style={styles.receiptPreview} contentFit="cover" />}
          <ActivityIndicator color={SF.orange} size="large" style={{ marginTop: 16 }} />
          <Text style={styles.scanningText}>Reading receipt...</Text>
        </View>
      )}

      {!scanning && items.length > 0 && (
        <View style={{ flex: 1 }}>
          <View style={styles.summaryCard}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <MaterialIcons name="receipt" size={18} color={SF.green} />
              <Text style={styles.summaryTitle}>{storeName ?? "Receipt"}</Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
              <Text style={styles.summaryDetail}>{items.length} items</Text>
              {total > 0 && <Text style={styles.summaryDetail}>${total.toFixed(2)}</Text>}
              {receiptDate && <Text style={styles.summaryDetail}>{receiptDate}</Text>}
            </View>
          </View>

          <View style={styles.editHint}>
            <MaterialIcons name="info-outline" size={13} color={SF.muted} />
            <Text style={styles.editHintText}>Tap name, category, or expiry to edit</Text>
          </View>

          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedCount}/{items.length} selected</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity onPress={selectAll}><Text style={styles.selectionAction}>All</Text></TouchableOpacity>
              <TouchableOpacity onPress={deselectAll}><Text style={styles.selectionAction}>None</Text></TouchableOpacity>
            </View>
          </View>

          <FlatList data={items} renderItem={renderItem} keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}
            extraData={editingIndex}
          />

          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.rescanBtn} onPress={() => { setReceiptImage(null); setItems([]); setAdded(false); setEditingIndex(null); }}>
              <MaterialIcons name="refresh" size={18} color={SF.orange} />
              <Text style={styles.rescanText}>New</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, added && styles.addBtnDone]}
              onPress={added ? () => router.push("/pantry") : addToPantry}
              disabled={!added && selectedCount === 0}
            >
              <MaterialIcons name={added ? "check-circle" : "add-shopping-cart"} size={18} color="#0A0500" />
              <Text style={styles.addBtnText}>{added ? "View Pantry" : `Add ${selectedCount} to Pantry`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Category Picker Modal */}
      <Modal visible={showCategoryPicker} transparent animationType="slide" onRequestClose={() => setShowCategoryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {RECEIPT_CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.modalOption, categoryPickerIndex !== null && items[categoryPickerIndex]?.category === cat && styles.modalOptionActive]}
                  onPress={() => selectCategory(cat)}>
                  <MaterialIcons name={CATEGORY_ICONS[cat] ?? "category"} size={20} color={categoryPickerIndex !== null && items[categoryPickerIndex]?.category === cat ? SF.orange : SF.muted} />
                  <Text style={[styles.modalOptionText, categoryPickerIndex !== null && items[categoryPickerIndex]?.category === cat && { color: SF.orange }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                  <Text style={styles.modalOptionSub}>{CATEGORY_MAP[cat]}</Text>
                  {categoryPickerIndex !== null && items[categoryPickerIndex]?.category === cat && <MaterialIcons name="check" size={18} color={SF.orange} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Expiry Picker Modal */}
      <Modal visible={showExpiryPicker} transparent animationType="slide" onRequestClose={() => setShowExpiryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowExpiryPicker(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Set Shelf Life</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {EXPIRY_OPTIONS.map(opt => (
                <TouchableOpacity key={opt.days} style={[styles.modalOption, expiryPickerIndex !== null && items[expiryPickerIndex]?.estimatedExpiry === opt.days && styles.modalOptionActive]}
                  onPress={() => selectExpiry(opt.days)}>
                  <MaterialIcons name="event" size={20} color={expiryPickerIndex !== null && items[expiryPickerIndex]?.estimatedExpiry === opt.days ? SF.green : SF.muted} />
                  <Text style={[styles.modalOptionText, expiryPickerIndex !== null && items[expiryPickerIndex]?.estimatedExpiry === opt.days && { color: SF.green }]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.modalOptionSub}>
                    {new Date(Date.now() + opt.days * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Text>
                  {expiryPickerIndex !== null && items[expiryPickerIndex]?.estimatedExpiry === opt.days && <MaterialIcons name="check" size={18} color={SF.green} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  summaryCard: { marginHorizontal: 16, marginTop: 12, backgroundColor: SF.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(34,197,94,0.15)" },
  summaryTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 15 },
  summaryDetail: { color: SF.muted, fontSize: 11 },
  editHint: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingTop: 8 },
  editHintText: { color: SF.muted, fontSize: 11, fontStyle: "italic" },
  selectionBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 6 },
  selectionText: { color: SF.muted, fontSize: 12 },
  selectionAction: { color: SF.orange, fontSize: 12, fontFamily: "Outfit_700Bold" },
  itemCard: { backgroundColor: SF.card, borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: SF.border },
  itemSelected: { borderColor: "rgba(245,158,11,0.25)" },
  itemRow: { flexDirection: "row", alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: SF.muted, alignItems: "center", justifyContent: "center", marginRight: 8 },
  checkboxChecked: { backgroundColor: SF.orange, borderColor: SF.orange },
  itemName: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 13, flex: 1 },
  itemDeselected: { color: SF.muted, textDecorationLine: "line-through" },
  nameInput: { flex: 1, color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 13, borderBottomWidth: 1, borderBottomColor: SF.orange, paddingVertical: 2, paddingHorizontal: 0 },
  priceText: { color: SF.cream, fontSize: 12, fontFamily: "Outfit_700Bold", marginLeft: 8 },
  editRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginLeft: 30 },
  editPill: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: SF.border },
  editPillText: { color: SF.blue, fontSize: 10, fontFamily: "Outfit_700Bold", textTransform: "capitalize" },
  qtyControl: { flexDirection: "row", alignItems: "center", gap: 6, marginLeft: "auto", backgroundColor: "rgba(245,158,11,0.06)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  qtyText: { color: SF.text, fontSize: 11, fontFamily: "Outfit_700Bold", minWidth: 20, textAlign: "center" },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 32, backgroundColor: SF.bg, borderTopWidth: 1, borderTopColor: SF.border },
  rescanBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: SF.border },
  rescanText: { color: SF.orange, fontFamily: "Outfit_700Bold", fontSize: 13 },
  addBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: SF.orange, borderRadius: 12, paddingVertical: 12 },
  addBtnDone: { backgroundColor: SF.green },
  addBtnText: { color: "#0A0500", fontFamily: "Outfit_700Bold", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#1A1000", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 17, marginBottom: 12, textAlign: "center" },
  modalOption: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 10 },
  modalOptionActive: { backgroundColor: "rgba(245,158,11,0.08)" },
  modalOptionText: { color: SF.text, fontFamily: "Outfit_700Bold", fontSize: 14, flex: 1 },
  modalOptionSub: { color: SF.muted, fontSize: 11 },
});
