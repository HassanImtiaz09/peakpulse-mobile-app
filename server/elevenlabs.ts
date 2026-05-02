/**
 * ElevenLabs TTS Service — Voice Coach Audio Synthesis
 *
 * Provides text-to-speech synthesis using ElevenLabs API for:
 * - AI Coach chat responses (spoken coaching)
 * - Real-time workout form cues (premium voice)
 * - Morning briefings and motivational messages
 *
 * Features:
 * - Voice selection from ElevenLabs library
 * - Server-side audio caching (in-memory LRU)
 * - Streaming support for long responses
 * - Graceful fallback when API is unavailable
 */

import { ElevenLabsClient } from "elevenlabs";
import { Readable } from "stream";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface VoiceInfo {
  voiceId: string;
  name: string;
  category: string;
  description: string;
  previewUrl: string | null;
  labels: Record<string, string>;
}

export interface SynthesisOptions {
  /** Text to synthesize */
  text: string;
  /** ElevenLabs voice ID (default: "21m00Tcm4TlvDq8ikWAM" = Rachel) */
  voiceId?: string;
  /** Model ID (default: "eleven_turbo_v2_5" for low latency) */
  modelId?: string;
  /** Stability (0–1, default 0.5) */
  stability?: number;
  /** Similarity boost (0–1, default 0.75) */
  similarityBoost?: number;
  /** Output format */
  outputFormat?: "mp3_44100_128" | "mp3_22050_32" | "pcm_16000" | "pcm_24000";
}

export interface SynthesisResult {
  /** Audio data as Buffer */
  audioBuffer: Buffer;
  /** Content type */
  contentType: string;
  /** Whether this was served from cache */
  cached: boolean;
  /** Character count consumed */
  characterCount: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

/** Default voice: Rachel — clear, warm, coaching-appropriate */
const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

/** Low-latency model for real-time coaching */
const DEFAULT_MODEL_ID = "eleven_turbo_v2_5";

/** Max text length per synthesis request (ElevenLabs limit) */
const MAX_TEXT_LENGTH = 5000;

/** Cache TTL in milliseconds (1 hour) */
const CACHE_TTL_MS = 60 * 60 * 1000;

/** Max cache entries */
const MAX_CACHE_ENTRIES = 100;

/** Curated voices suitable for fitness coaching */
export const COACHING_VOICES: VoiceInfo[] = [
  {
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    category: "premade",
    description: "Warm and clear female voice, great for coaching and instruction",
    previewUrl: null,
    labels: { accent: "american", gender: "female", use_case: "narration" },
  },
  {
    voiceId: "29vD33N1CtxCmqQRPOHJ",
    name: "Drew",
    category: "premade",
    description: "Confident male voice with energy, ideal for workout motivation",
    previewUrl: null,
    labels: { accent: "american", gender: "male", use_case: "narration" },
  },
  {
    voiceId: "EXAVITQu4vr4xnSDxMaL",
    name: "Sarah",
    category: "premade",
    description: "Soft and encouraging female voice for mindful coaching",
    previewUrl: null,
    labels: { accent: "american", gender: "female", use_case: "narration" },
  },
  {
    voiceId: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    category: "premade",
    description: "Deep and authoritative male voice for serious training",
    previewUrl: null,
    labels: { accent: "american", gender: "male", use_case: "narration" },
  },
  {
    voiceId: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    category: "premade",
    description: "Young and energetic female voice for high-intensity workouts",
    previewUrl: null,
    labels: { accent: "american", gender: "female", use_case: "narration" },
  },
];

// ── Client Singleton ───────────────────────────────────────────────────────────

let _client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient | null {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new ElevenLabsClient({ apiKey: key });
  }
  return _client;
}

/**
 * Check if ElevenLabs is configured and available.
 */
export function isElevenLabsAvailable(): boolean {
  return !!process.env.ELEVENLABS_API_KEY;
}

// ── In-Memory LRU Cache ────────────────────────────────────────────────────────

interface CacheEntry {
  audioBuffer: Buffer;
  contentType: string;
  characterCount: number;
  createdAt: number;
}

const audioCache = new Map<string, CacheEntry>();

function getCacheKey(text: string, voiceId: string, modelId: string): string {
  // Simple hash: voice + model + first 200 chars of text
  const textKey = text.length > 200 ? text.slice(0, 200) + `_${text.length}` : text;
  return `${voiceId}:${modelId}:${textKey}`;
}

function pruneCache(): void {
  if (audioCache.size <= MAX_CACHE_ENTRIES) return;

  // Remove oldest entries
  const entries = [...audioCache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  const toRemove = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
  for (const [key] of toRemove) {
    audioCache.delete(key);
  }
}

function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of audioCache) {
    if (now - entry.createdAt > CACHE_TTL_MS) {
      audioCache.delete(key);
    }
  }
}

// ── Core Functions ─────────────────────────────────────────────────────────────

/**
 * Synthesize text to speech using ElevenLabs.
 *
 * Returns an audio buffer (MP3 by default) that can be sent to the client
 * or stored in S3.
 */
export async function synthesizeSpeech(options: SynthesisOptions): Promise<SynthesisResult> {
  const client = getClient();
  if (!client) {
    throw new Error("ElevenLabs API key not configured. Set ELEVENLABS_API_KEY environment variable.");
  }

  const {
    text,
    voiceId = DEFAULT_VOICE_ID,
    modelId = DEFAULT_MODEL_ID,
    stability = 0.5,
    similarityBoost = 0.75,
    outputFormat = "mp3_44100_128",
  } = options;

  // Validate text length
  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters (got ${text.length})`);
  }

  // Check cache
  const cacheKey = getCacheKey(text, voiceId, modelId);
  const cached = audioCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      audioBuffer: cached.audioBuffer,
      contentType: "audio/mpeg",
      cached: true,
      characterCount: cached.characterCount,
    };
  }

  // Synthesize via ElevenLabs API
  const audioStream = await client.textToSpeech.convert(voiceId, {
    text: text.trim(),
    model_id: modelId,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
    },
    output_format: outputFormat,
  });

  // Collect stream into buffer
  const chunks: Buffer[] = [];
  if (audioStream instanceof Readable) {
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
  } else if (typeof ReadableStream !== "undefined" && (audioStream as any) instanceof ReadableStream) {
    const reader = (audioStream as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  } else {
    // Assume it's a Buffer or Uint8Array
    chunks.push(Buffer.from(audioStream as any));
  }

  const audioBuffer = Buffer.concat(chunks);

  // Cache the result
  const entry: CacheEntry = {
    audioBuffer,
    contentType: "audio/mpeg",
    characterCount: text.length,
    createdAt: Date.now(),
  };
  audioCache.set(cacheKey, entry);
  pruneCache();

  return {
    audioBuffer,
    contentType: "audio/mpeg",
    cached: false,
    characterCount: text.length,
  };
}

/**
 * List available voices from ElevenLabs.
 *
 * Returns the curated coaching voices by default. If `includeAll` is true,
 * fetches all voices from the API (including user's cloned voices).
 */
export async function listVoices(includeAll = false): Promise<VoiceInfo[]> {
  if (!includeAll) {
    return COACHING_VOICES;
  }

  const client = getClient();
  if (!client) {
    return COACHING_VOICES;
  }

  try {
    const response = await client.voices.getAll();
    const voices: VoiceInfo[] = (response.voices ?? []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category ?? "premade",
      description: v.description ?? "",
      previewUrl: v.preview_url ?? null,
      labels: v.labels ?? {},
    }));
    return voices;
  } catch {
    // Fallback to curated list
    return COACHING_VOICES;
  }
}

/**
 * Get a specific coaching voice by ID.
 */
export function getCoachingVoice(voiceId: string): VoiceInfo | undefined {
  return COACHING_VOICES.find((v) => v.voiceId === voiceId);
}

/**
 * Prepare coaching text for synthesis.
 *
 * Cleans up text for better TTS output:
 * - Removes markdown formatting
 * - Converts abbreviations
 * - Adds natural pauses
 */
export function prepareTextForSpeech(text: string): string {
  return text
    // Remove markdown bold/italic
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove markdown links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Convert common abbreviations for natural speech
    .replace(/\bkg\b/g, "kilograms")
    .replace(/\blbs?\b/g, "pounds")
    .replace(/\breps?\b/g, "reps")
    .replace(/\bBF%?\b/g, "body fat percent")
    .replace(/\bRPE\b/g, "R P E")
    .replace(/\bBMR\b/g, "B M R")
    .replace(/\bTDEE\b/g, "T D E E")
    .replace(/\bHIIT\b/g, "H I I T")
    // Add natural pauses after sentences
    .replace(/\.\s+/g, ". ... ")
    // Clean up extra whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Estimate the duration of synthesized audio in seconds.
 * ElevenLabs averages ~150 words per minute.
 */
export function estimateAudioDuration(text: string): number {
  const wordCount = text.split(/\s+/).length;
  return Math.ceil((wordCount / 150) * 60);
}

/**
 * Clear the audio cache.
 */
export function clearAudioCache(): void {
  audioCache.clear();
}

/**
 * Get cache statistics.
 */
export function getCacheStats(): { entries: number; maxEntries: number } {
  cleanExpiredCache();
  return {
    entries: audioCache.size,
    maxEntries: MAX_CACHE_ENTRIES,
  };
}
