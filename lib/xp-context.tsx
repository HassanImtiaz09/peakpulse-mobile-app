/**
 * XP Context — Global state provider for the Micro-Reward System.
 * Wraps the XP engine and exposes award function + current state to all screens.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  awardXP,
  getXPSummary,
  type XPAction,
  type AwardResult,
  type XPData,
  type LevelInfo,
  type StreakBadge,
  type XPHistoryEntry,
} from "@/lib/xp-engine";

interface XPState {
  data: XPData;
  levelInfo: LevelInfo;
  badges: StreakBadge[];
  recentHistory: XPHistoryEntry[];
}

interface XPToastData {
  visible: boolean;
  xp: number;
  label: string;
  levelUp: boolean;
  newLevel: number;
  newBadges: number[];
}

interface XPContextValue {
  /** Current XP state */
  state: XPState | null;
  /** Award XP for an action — returns result for celebration UI */
  award: (action: XPAction) => Promise<AwardResult | null>;
  /** Refresh XP data from storage */
  refresh: () => Promise<void>;
  /** Current toast data */
  toast: XPToastData;
  /** Dismiss the toast */
  dismissToast: () => void;
  /** Whether confetti should be showing */
  showConfetti: boolean;
  /** Dismiss confetti */
  dismissConfetti: () => void;
}

const defaultToast: XPToastData = {
  visible: false,
  xp: 0,
  label: "",
  levelUp: false,
  newLevel: 0,
  newBadges: [],
};

const XPContext = createContext<XPContextValue>({
  state: null,
  award: async () => null,
  refresh: async () => {},
  toast: defaultToast,
  dismissToast: () => {},
  showConfetti: false,
  dismissConfetti: () => {},
});

export function useXP() {
  return useContext(XPContext);
}

export function XPProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<XPState | null>(null);
  const [toast, setToast] = useState<XPToastData>(defaultToast);
  const [showConfetti, setShowConfetti] = useState(false);
  const toastQueue = useRef<XPToastData[]>([]);
  const isShowingToast = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const summary = await getXPSummary();
      setState(summary);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showNextToast = useCallback(() => {
    if (toastQueue.current.length === 0) {
      isShowingToast.current = false;
      return;
    }
    isShowingToast.current = true;
    const next = toastQueue.current.shift()!;
    setToast(next);
  }, []);

  const dismissToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
    // Show next queued toast after a brief delay
    setTimeout(showNextToast, 300);
  }, [showNextToast]);

  const dismissConfetti = useCallback(() => {
    setShowConfetti(false);
  }, []);

  const award = useCallback(async (action: XPAction): Promise<AwardResult | null> => {
    try {
      const result = await awardXP(action);
      await refresh();

      // Queue toast
      const toastData: XPToastData = {
        visible: true,
        xp: result.xpAwarded,
        label: result.label,
        levelUp: result.levelUp,
        newLevel: result.newLevel,
        newBadges: result.newBadges,
      };

      if (isShowingToast.current) {
        toastQueue.current.push(toastData);
      } else {
        isShowingToast.current = true;
        setToast(toastData);
      }

      // Show confetti for level-ups or badge unlocks
      if (result.levelUp || result.newBadges.length > 0) {
        setShowConfetti(true);
      }

      return result;
    } catch {
      return null;
    }
  }, [refresh, showNextToast]);

  return (
    <XPContext.Provider
      value={{
        state,
        award,
        refresh,
        toast,
        dismissToast,
        showConfetti,
        dismissConfetti,
      }}
    >
      {children}
    </XPContext.Provider>
  );
}
