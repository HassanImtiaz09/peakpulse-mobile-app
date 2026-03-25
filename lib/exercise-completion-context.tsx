import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "@exercise_completion";

export interface ExerciseCompletion {
  /** Key: "YYYY-MM-DD" */
  [date: string]: {
    /** Key: exercise name, value: true if completed */
    [exerciseName: string]: boolean;
  };
}

interface ExerciseCompletionContextValue {
  completions: ExerciseCompletion;
  toggleExercise: (date: string, exerciseName: string) => void;
  isCompleted: (date: string, exerciseName: string) => boolean;
  getCompletedCount: (date: string, exercises: string[]) => number;
  getTodayCompletedCount: (exercises: string[]) => number;
  resetDay: (date: string) => void;
}

const ExerciseCompletionContext = createContext<ExerciseCompletionContextValue>({
  completions: {},
  toggleExercise: () => {},
  isCompleted: () => false,
  getCompletedCount: () => 0,
  getTodayCompletedCount: () => 0,
  resetDay: () => {},
});

export function ExerciseCompletionProvider({ children }: { children: React.ReactNode }) {
  const [completions, setCompletions] = useState<ExerciseCompletion>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setCompletions(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const save = useCallback((next: ExerciseCompletion) => {
    setCompletions(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleExercise = useCallback((date: string, exerciseName: string) => {
    setCompletions((prev) => {
      const dayData = prev[date] ?? {};
      const next = {
        ...prev,
        [date]: {
          ...dayData,
          [exerciseName]: !dayData[exerciseName],
        },
      };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isCompleted = useCallback((date: string, exerciseName: string) => {
    return !!completions[date]?.[exerciseName];
  }, [completions]);

  const getCompletedCount = useCallback((date: string, exercises: string[]) => {
    const dayData = completions[date];
    if (!dayData) return 0;
    return exercises.filter((e) => dayData[e]).length;
  }, [completions]);

  const getTodayCompletedCount = useCallback((exercises: string[]) => {
    const today = new Date().toISOString().split("T")[0];
    return getCompletedCount(today, exercises);
  }, [getCompletedCount]);

  const resetDay = useCallback((date: string) => {
    setCompletions((prev) => {
      const next = { ...prev };
      delete next[date];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <ExerciseCompletionContext.Provider
      value={{ completions, toggleExercise, isCompleted, getCompletedCount, getTodayCompletedCount, resetDay }}
    >
      {children}
    </ExerciseCompletionContext.Provider>
  );
}

export function useExerciseCompletion() {
  return useContext(ExerciseCompletionContext);
}
