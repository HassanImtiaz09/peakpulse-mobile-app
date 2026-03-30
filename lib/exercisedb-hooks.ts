/**
 * ExerciseDB React Hooks
 *
 * Custom hooks that wrap the ExerciseDB service for use in React components.
 * All hooks use local state + useEffect (no external state library needed).
 * Results are cached by the underlying service for the app session.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  searchExercisesByName,
  getExercisesByBodyPart,
  getExercisesByTarget,
  getExercisesByEquipment,
  getExerciseById,
  hasExerciseDBKey,
  type ExerciseDBExercise,
} from "@/lib/exercisedb";

// ── useExerciseSearch ────────────────────────────────────────────────────────

interface UseExerciseSearchResult {
  results: ExerciseDBExercise[];
  loading: boolean;
  error: string | null;
  search: (query: string) => void;
}

/**
 * Hook for searching exercises by name via ExerciseDB API.
 * Includes debounce (300ms) to avoid excessive API calls.
 * Returns empty results if no API key is configured.
 */
export function useExerciseSearch(
  initialQuery: string = "",
  limit: number = 20
): UseExerciseSearchResult {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasExerciseDBKey() || !query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchExercisesByName(query, limit);
        if (mountedRef.current) {
          setResults(data);
          setLoading(false);
        }
      } catch (e: any) {
        if (mountedRef.current) {
          setError(e?.message ?? "Search failed");
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, limit]);

  const search = useCallback((q: string) => setQuery(q), []);

  return { results, loading, error, search };
}

// ── useExercisesByBodyPart ───────────────────────────────────────────────────

interface UseExercisesByBodyPartResult {
  exercises: ExerciseDBExercise[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching exercises by body part.
 * Pass null/empty to skip the fetch.
 */
export function useExercisesByBodyPart(
  bodyPart: string | null,
  limit: number = 50
): UseExercisesByBodyPartResult {
  const [exercises, setExercises] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasExerciseDBKey() || !bodyPart) {
      setExercises([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getExercisesByBodyPart(bodyPart, limit)
      .then((data) => {
        if (mountedRef.current) {
          setExercises(data);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (mountedRef.current) {
          setError(e?.message ?? "Fetch failed");
          setLoading(false);
        }
      });
  }, [bodyPart, limit]);

  return { exercises, loading, error };
}

// ── useExercisesByTarget ─────────────────────────────────────────────────────

interface UseExercisesByTargetResult {
  exercises: ExerciseDBExercise[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching exercises by target muscle.
 * Pass null/empty to skip the fetch.
 */
export function useExercisesByTarget(
  target: string | null,
  limit: number = 50
): UseExercisesByTargetResult {
  const [exercises, setExercises] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasExerciseDBKey() || !target) {
      setExercises([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getExercisesByTarget(target, limit)
      .then((data) => {
        if (mountedRef.current) {
          setExercises(data);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (mountedRef.current) {
          setError(e?.message ?? "Fetch failed");
          setLoading(false);
        }
      });
  }, [target, limit]);

  return { exercises, loading, error };
}

// ── useExercisesByEquipment ──────────────────────────────────────────────────

interface UseExercisesByEquipmentResult {
  exercises: ExerciseDBExercise[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching exercises by equipment type.
 * Pass null/empty to skip the fetch.
 */
export function useExercisesByEquipment(
  equipment: string | null,
  limit: number = 50
): UseExercisesByEquipmentResult {
  const [exercises, setExercises] = useState<ExerciseDBExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasExerciseDBKey() || !equipment) {
      setExercises([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getExercisesByEquipment(equipment, limit)
      .then((data) => {
        if (mountedRef.current) {
          setExercises(data);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (mountedRef.current) {
          setError(e?.message ?? "Fetch failed");
          setLoading(false);
        }
      });
  }, [equipment, limit]);

  return { exercises, loading, error };
}

// ── useExerciseDetail ────────────────────────────────────────────────────────

interface UseExerciseDetailResult {
  exercise: ExerciseDBExercise | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for fetching a single exercise by ExerciseDB ID.
 * Pass null/empty to skip the fetch.
 */
export function useExerciseDetail(
  id: string | null
): UseExerciseDetailResult {
  const [exercise, setExercise] = useState<ExerciseDBExercise | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!hasExerciseDBKey() || !id) {
      setExercise(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    getExerciseById(id)
      .then((data) => {
        if (mountedRef.current) {
          setExercise(data);
          setLoading(false);
        }
      })
      .catch((e: any) => {
        if (mountedRef.current) {
          setError(e?.message ?? "Fetch failed");
          setLoading(false);
        }
      });
  }, [id]);

  return { exercise, loading, error };
}
