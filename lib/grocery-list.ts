/**
 * Grocery Shopping List Export Module
 *
 * Auto-compiles all ingredients from the weekly AI meal plan into a
 * categorised shopping list. Supports text (clipboard/share) and PDF export.
 */
// Platform-specific imports are only used in export functions below.
// For pure logic (extractGroceryList, generateGroceryText), no RN imports needed.
let Platform: any, Share: any, Alert: any, Clipboard: any;
try {
  Platform = require("react-native").Platform;
  Share = require("react-native").Share;
  Alert = require("react-native").Alert;
  Clipboard = require("expo-clipboard");
} catch {
  // Running in test environment without RN
}

// ── Types ──────────────────────────────────────────────────────────

export interface GroceryItem {
  name: string;
  category: string;
  meals: string[]; // which meals use this ingredient
  days: string[];  // which days need it
}

export interface GroceryCategory {
  name: string;
  icon: string;
  items: GroceryItem[];
}

// ── Category classification ────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Proteins": ["chicken", "beef", "lamb", "turkey", "salmon", "tuna", "cod", "shrimp", "prawn", "fish", "tofu", "tempeh", "seitan", "egg", "steak", "pork", "sausage", "bacon", "mince", "fillet", "breast", "thigh", "drumstick", "lentil", "chickpea", "bean", "edamame"],
  "Dairy & Alternatives": ["milk", "yogurt", "yoghurt", "cheese", "cream", "butter", "ghee", "paneer", "labneh", "whey", "casein", "oat milk", "almond milk", "soy milk", "coconut milk", "plant milk"],
  "Grains & Carbs": ["rice", "pasta", "bread", "oat", "quinoa", "couscous", "noodle", "tortilla", "wrap", "pita", "flatbread", "cereal", "granola", "flour", "cornmeal", "barley", "bulgur", "millet", "buckwheat", "potato", "sweet potato"],
  "Vegetables": ["spinach", "kale", "broccoli", "cauliflower", "carrot", "tomato", "onion", "garlic", "pepper", "capsicum", "zucchini", "courgette", "cucumber", "lettuce", "cabbage", "mushroom", "asparagus", "aubergine", "eggplant", "celery", "corn", "pea", "green bean", "beetroot", "radish", "leek", "spring onion", "avocado"],
  "Fruits": ["apple", "banana", "orange", "lemon", "lime", "berry", "blueberry", "strawberry", "raspberry", "mango", "pineapple", "grape", "melon", "watermelon", "peach", "pear", "kiwi", "date", "fig", "pomegranate", "cherry", "plum", "coconut"],
  "Nuts & Seeds": ["almond", "walnut", "cashew", "peanut", "pistachio", "pecan", "hazelnut", "macadamia", "chia", "flax", "sesame", "sunflower seed", "pumpkin seed", "hemp seed", "nut butter", "peanut butter", "almond butter", "tahini"],
  "Oils & Condiments": ["olive oil", "coconut oil", "vegetable oil", "sesame oil", "soy sauce", "tamari", "vinegar", "mustard", "ketchup", "mayo", "mayonnaise", "hot sauce", "sriracha", "honey", "maple syrup", "jam", "salsa", "pesto", "hummus", "dressing"],
  "Spices & Herbs": ["salt", "pepper", "cumin", "turmeric", "paprika", "cinnamon", "oregano", "basil", "thyme", "rosemary", "parsley", "cilantro", "coriander", "ginger", "chili", "cayenne", "nutmeg", "cardamom", "clove", "bay leaf", "mint", "dill", "za'atar", "sumac", "saffron", "vanilla"],
  "Beverages": ["water", "tea", "coffee", "juice", "smoothie", "protein shake", "kombucha"],
};

const CATEGORY_ICONS: Record<string, string> = {
  "Proteins": "🥩",
  "Dairy & Alternatives": "🥛",
  "Grains & Carbs": "🌾",
  "Vegetables": "🥦",
  "Fruits": "🍎",
  "Nuts & Seeds": "🥜",
  "Oils & Condiments": "🫒",
  "Spices & Herbs": "🌿",
  "Beverages": "🥤",
  "Other": "🛒",
};

function classifyIngredient(name: string): string {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return category;
  }
  return "Other";
}

// ── Extract ingredients from meal plan ─────────────────────────────

export function extractGroceryList(mealPlan: any): GroceryCategory[] {
  if (!mealPlan?.days || !Array.isArray(mealPlan.days)) return [];

  const itemMap = new Map<string, GroceryItem>();

  for (const day of mealPlan.days) {
    const dayName = day.day ?? "Unknown";
    for (const meal of (day.meals ?? [])) {
      const mealName = meal.name ?? meal.type ?? "Meal";
      for (const ingredient of (meal.ingredients ?? [])) {
        const isStr = Object.prototype.toString.call(ingredient) === "[object String]";
        const ingName = isStr ? (ingredient as string) : ((ingredient as any).name ?? String(ingredient));
        const cleanName = ingName.trim();
        if (!cleanName) continue;

        // Normalize key: lowercase, remove quantities/amounts at start
        const key = cleanName.toLowerCase()
          .replace(/^\d+[\s]*(?:g|kg|ml|l|oz|cups?|tbsp|tsp|pieces?|slices?|cloves?|stalks?|bunch(?:es)?|handful|pinch|dash)\s*/i, "")
          .replace(/\s+/g, " ")
          .trim();

        if (!key) continue;

        const existing = itemMap.get(key);
        if (existing) {
          if (!existing.meals.includes(mealName)) existing.meals.push(mealName);
          if (!existing.days.includes(dayName)) existing.days.push(dayName);
        } else {
          itemMap.set(key, {
            name: cleanName,
            category: classifyIngredient(cleanName),
            meals: [mealName],
            days: [dayName],
          });
        }
      }
    }
  }

  // Group by category
  const categoryMap = new Map<string, GroceryItem[]>();
  for (const item of itemMap.values()) {
    const list = categoryMap.get(item.category) ?? [];
    list.push(item);
    categoryMap.set(item.category, list);
  }

  // Sort categories in a logical order
  const ORDER = ["Proteins", "Dairy & Alternatives", "Vegetables", "Fruits", "Grains & Carbs", "Nuts & Seeds", "Oils & Condiments", "Spices & Herbs", "Beverages", "Other"];
  const result: GroceryCategory[] = [];
  for (const catName of ORDER) {
    const items = categoryMap.get(catName);
    if (items && items.length > 0) {
      items.sort((a, b) => a.name.localeCompare(b.name));
      result.push({ name: catName, icon: CATEGORY_ICONS[catName] ?? "🛒", items });
    }
  }

  return result;
}

// ── Text export ────────────────────────────────────────────────────

export function generateGroceryText(categories: GroceryCategory[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  let text = `🛒 Weekly Grocery List\n`;
  text += `${date}\n`;
  text += `${"─".repeat(40)}\n\n`;

  for (const cat of categories) {
    text += `${cat.icon} ${cat.name.toUpperCase()} (${cat.items.length})\n`;
    for (const item of cat.items) {
      text += `  □ ${item.name}`;
      if (item.days.length < 7) text += `  (${item.days.join(", ")})`;
      text += `\n`;
    }
    text += `\n`;
  }

  text += `${"─".repeat(40)}\n`;
  text += `Total: ${totalItems} items across ${categories.length} categories\n`;
  text += `Generated by FytNova\n`;

  return text;
}

export async function copyGroceryList(categories: GroceryCategory[]): Promise<void> {
  const text = generateGroceryText(categories);
  await Clipboard.setStringAsync(text);
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);
  Alert.alert("✅ Copied!", `${totalItems} grocery items copied to clipboard. Paste anywhere to share.`);
}

export async function shareGroceryList(categories: GroceryCategory[]): Promise<void> {
  const text = generateGroceryText(categories);
  try {
    await Share.share({ message: text, title: "Weekly Grocery List" });
  } catch {
    Alert.alert("Share Error", "Could not share the grocery list.");
  }
}

// ── PDF export ─────────────────────────────────────────────────────

function generateGroceryHTML(categories: GroceryCategory[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const totalItems = categories.reduce((s, c) => s + c.items.length, 0);

  const sections = categories.map(cat => `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid #F59E0B;">
        <span style="font-size: 18px;">${cat.icon}</span>
        <h3 style="margin: 0; color: #1a1a1a; font-size: 15px; font-weight: 700;">${cat.name}</h3>
        <span style="background: #FEF3C7; color: #92400E; font-size: 11px; padding: 2px 8px; border-radius: 8px; font-weight: 600;">${cat.items.length}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        ${cat.items.map((item, idx) => `
          <tr style="border-bottom: 1px solid #f0f0f0; ${idx % 2 === 1 ? "background: #fafafa;" : ""}">
            <td style="padding: 8px 10px; width: 24px;">
              <span style="width: 16px; height: 16px; border: 2px solid #F59E0B; border-radius: 3px; display: inline-block;"></span>
            </td>
            <td style="padding: 8px 4px; font-size: 13px; font-weight: 500; color: #1a1a1a;">${item.name}</td>
            <td style="padding: 8px 10px; font-size: 11px; color: #888; text-align: right;">${item.days.length === 7 ? "All week" : item.days.join(", ")}</td>
          </tr>
        `).join("")}
      </table>
    </div>
  `).join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; padding: 0; }
        @page { margin: 18mm 14mm; }
      </style>
    </head>
    <body>
      <div style="background: linear-gradient(135deg, #1a0a00 0%, #2d1800 50%, #1a0a00 100%); padding: 28px 24px; margin: -18mm -14mm 20px -14mm; color: white;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 11px; color: #F59E0B; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">FytNova</div>
            <h1 style="font-size: 24px; font-weight: 800; margin-bottom: 4px; color: #FBBF24;">Weekly Grocery List</h1>
            <div style="font-size: 12px; color: rgba(255,255,255,0.7);">${date}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 32px; font-weight: 800; color: #F59E0B;">${totalItems}</div>
            <div style="font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px;">Items</div>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
        ${categories.map(cat => `
          <div style="background: #FEF3C7; border-radius: 8px; padding: 8px 12px; text-align: center; border: 1px solid #FDE68A;">
            <span style="font-size: 14px;">${cat.icon}</span>
            <span style="font-size: 11px; font-weight: 600; color: #92400E; margin-left: 4px;">${cat.items.length}</span>
          </div>
        `).join("")}
      </div>

      ${sections}

      <div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #eee; text-align: center;">
        <div style="font-size: 10px; color: #999;">Generated by FytNova &bull; ${date}</div>
        <div style="font-size: 9px; color: #ccc; margin-top: 3px;">Auto-compiled from your weekly meal plan</div>
      </div>
    </body>
    </html>
  `;
}

export async function exportGroceryPdf(categories: GroceryCategory[]): Promise<void> {
  try {
    const html = generateGroceryHTML(categories);

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }
      return;
    }

    const Print = await import("expo-print");
    const Sharing = await import("expo-sharing");

    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: "Weekly Grocery List",
        UTI: "com.adobe.pdf",
      });
    } else {
      Alert.alert("PDF Generated", `Grocery list saved to: ${uri}`);
    }
  } catch (err) {
    console.error("[GroceryList] Export error:", err);
    Alert.alert("Export Error", "Could not generate the grocery list PDF. Please try again.");
  }
}
