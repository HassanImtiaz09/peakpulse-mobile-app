/**
 * Pre-Workout Energy Check-In — Pure Logic
 *
 * Adjusts workout plans based on the user's reported energy level.
 * Stores energy check-in history in AsyncStorage for pattern learning.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Types ────────────────────────────────────────────────────
export type EnergyLevel = "low" | "normal" | "high";

export interface EnergyOption {
  level: EnergyLevel;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  adjustment: string;
}

export interface EnergyCheckinEntry {
  date: string;
  energy: EnergyLevel;
}

// ── Workout Adjustment Logic ─────────────────────────────────
export function adjustWorkoutForEnergy(
  dayData: any,
  energy: EnergyLevel
): any {
  if (!dayData || !dayData.exercises) return dayData;

  const exercises = [...dayData.exercises];

  switch (energy) {
    case "low": {
      // Keep only the first 3 exercises (prioritize compounds)
      const reduced = exercises.slice(0, 3);
      return {
        ...dayData,
        exercises: reduced.map((ex: any) => {
          // Parse sets string like "4x8" or "4" and reduce
          const setsStr = String(ex.sets ?? "3");
          const setsMatch = setsStr.match(/^(\d+)/);
          const originalSets = setsMatch ? parseInt(setsMatch[1], 10) : 3;
          const newSets = Math.max(2, originalSets - 1);
          const newSetsStr = setsStr.replace(/^\d+/, String(newSets));
          return {
            ...ex,
            sets: newSetsStr,
            notes: ex.notes
              ? `${ex.notes} (Low energy — reduced volume)`
              : "Low energy — reduced volume",
          };
        }),
        _energyLevel: "low" as const,
        _originalExerciseCount: exercises.length,
      };
    }
    case "high": {
      return {
        ...dayData,
        exercises: exercises.map((ex: any) => {
          const setsStr = String(ex.sets ?? "3");
          const setsMatch = setsStr.match(/^(\d+)/);
          const originalSets = setsMatch ? parseInt(setsMatch[1], 10) : 3;
          const newSets = originalSets + 1;
          const newSetsStr = setsStr.replace(/^\d+/, String(newSets));
          return {
            ...ex,
            sets: newSetsStr,
            notes: ex.notes
              ? `${ex.notes} (Extra set — you're fired up!)`
              : "Extra set — you're fired up!",
          };
        }),
        _energyLevel: "high" as const,
      };
    }
    case "normal":
    default:
      return { ...dayData, _energyLevel: "normal" as const };
  }
}

// ── Storage ──────────────────────────────────────────────────
const ENERGY_HISTORY_KEY = "@peakpulse_energy_checkins";

export async function saveEnergyCheckin(energy: EnergyLevel): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ENERGY_HISTORY_KEY);
    const history: EnergyCheckinEntry[] = raw ? JSON.parse(raw) : [];
    history.push({ date: new Date().toISOString(), energy });
    // Keep last 90 days
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const trimmed = history.filter(
      (h) => new Date(h.date).getTime() > cutoff
    );
    await AsyncStorage.setItem(ENERGY_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Non-critical — silently fail
  }
}

export async function getEnergyHistory(): Promise<EnergyCheckinEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ENERGY_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
