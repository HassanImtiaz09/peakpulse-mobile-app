/**
 * Workout Templates Service
 *
 * Allows users to save frequently used workout configurations
 * for one-tap logging. Templates persist in AsyncStorage.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WorkoutType } from "@/lib/health-service";
import { UI } from "@/constants/ui-colors";

// ── Types ──────────────────────────────────────────────────────────

export interface WorkoutTemplate {
  id: string;
  name: string;
  type: WorkoutType;
  durationMinutes: number;
  estimatedCalories: number;
  distanceKm?: number;
  heartRateAvg?: number;
  notes?: string;
  color: string;
  icon: string;
  usageCount: number;
  createdAt: string;
  lastUsedAt?: string;
}

export type CreateTemplateInput = Omit<WorkoutTemplate, "id" | "usageCount" | "createdAt" | "lastUsedAt">;

// ── Storage Key ───────────────────────────────────────────────────

const TEMPLATES_KEY = "@workout_templates";

// ── Helpers ───────────────────────────────────────────────────────

function generateId(): string {
  return `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── CRUD Operations ───────────────────────────────────────────────

export async function getTemplates(): Promise<WorkoutTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[WorkoutTemplates] Failed to load:", e);
  }
  return [];
}

export async function saveTemplate(input: CreateTemplateInput): Promise<WorkoutTemplate> {
  const templates = await getTemplates();
  const template: WorkoutTemplate = {
    ...input,
    id: generateId(),
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };
  templates.unshift(template);
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return template;
}

export async function updateTemplate(id: string, updates: Partial<CreateTemplateInput>): Promise<WorkoutTemplate | null> {
  const templates = await getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx < 0) return null;
  templates[idx] = { ...templates[idx], ...updates };
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  return templates[idx];
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const templates = await getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;
  await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

export async function recordTemplateUsage(id: string): Promise<void> {
  const templates = await getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx >= 0) {
    templates[idx].usageCount += 1;
    templates[idx].lastUsedAt = new Date().toISOString();
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  }
}

// ── Default Templates (built-in suggestions) ─────────────────────

export const BUILT_IN_TEMPLATES: CreateTemplateInput[] = [
  {
    name: "Morning Run 5K",
    type: "running",
    durationMinutes: 30,
    estimatedCalories: 330,
    distanceKm: 5,
    color: UI.green,
    icon: "directions-run",
  },
  {
    name: "Lunch Walk",
    type: "walking",
    durationMinutes: 30,
    estimatedCalories: 150,
    distanceKm: 2.5,
    color: "#3B82F6",
    icon: "directions-walk",
  },
  {
    name: "Gym Strength",
    type: "strength_training",
    durationMinutes: 60,
    estimatedCalories: 420,
    color: UI.red,
    icon: "fitness-center",
  },
  {
    name: "HIIT Session",
    type: "hiit",
    durationMinutes: 25,
    estimatedCalories: 325,
    color: UI.orange2,
    icon: "bolt",
  },
  {
    name: "Evening Yoga",
    type: "yoga",
    durationMinutes: 45,
    estimatedCalories: 180,
    color: "#8B5CF6",
    icon: "self-improvement",
  },
  {
    name: "Cycling Commute",
    type: "cycling",
    durationMinutes: 40,
    estimatedCalories: 360,
    distanceKm: 12,
    color: UI.gold,
    icon: "pedal-bike",
  },
];
