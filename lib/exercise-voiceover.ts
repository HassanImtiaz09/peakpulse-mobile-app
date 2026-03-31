/**
 * Exercise Voiceover — Converts exercise instructions into natural coaching scripts
 * for expo-speech TTS narration during video playback.
 *
 * Uses the existing ExerciseInstruction data to generate spoken coaching text.
 */
import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { getExerciseInstructions } from "./exercise-instructions";

/** State of the voiceover */
export type VoiceoverState = "idle" | "speaking" | "paused";

/**
 * Build a natural coaching script from exercise instructions.
 * The script is designed to be spoken aloud while the user watches the demo video.
 */
export function buildCoachingScript(exerciseName: string): string {
  const instruction = getExerciseInstructions(exerciseName);
  if (!instruction) {
    return `Let me walk you through the ${exerciseName}. Watch the video carefully and follow along with proper form.`;
  }

  const parts: string[] = [];

  // Opening
  parts.push(`Let's do the ${exerciseName}. Here's how to perform it with proper form.`);

  // Steps — numbered for clarity
  instruction.steps.forEach((step: string, i: number) => {
    // Clean up the step text for speech (remove parenthetical degree symbols etc.)
    const cleanStep = step
      .replace(/°/g, " degrees")
      .replace(/–/g, " to ")
      .replace(/—/g, ". ");
    parts.push(`Step ${i + 1}. ${cleanStep}`);
  });

  // Breathing cue
  if (instruction.breathing) {
    const cleanBreathing = instruction.breathing
      .replace(/°/g, " degrees")
      .replace(/–/g, " to ")
      .replace(/—/g, ". ");
    parts.push(`Breathing. ${cleanBreathing}`);
  }

  // Mistakes to avoid
  if (instruction.avoid.length > 0) {
    parts.push("Common mistakes to avoid.");
    instruction.avoid.forEach((mistake: string) => {
      const cleanMistake = mistake
        .replace(/°/g, " degrees")
        .replace(/–/g, " to ")
        .replace(/—/g, ". ");
      parts.push(cleanMistake);
    });
  }

  // Closing
  parts.push("That's it. Focus on controlled movement and proper form throughout.");

  return parts.join(" ... ");
}

/**
 * Speak the coaching script for an exercise.
 * Returns a promise that resolves when speaking is done.
 */
export function speakCoaching(
  exerciseName: string,
  options?: {
    rate?: number;
    onStart?: () => void;
    onDone?: () => void;
    onStopped?: () => void;
    onError?: (error: Error) => void;
  }
): void {
  const script = buildCoachingScript(exerciseName);

  if (Platform.OS === "web") {
    // Web: use browser SpeechSynthesis directly for better control
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(script);
      utterance.rate = options?.rate ?? 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";
      utterance.onstart = () => options?.onStart?.();
      utterance.onend = () => options?.onDone?.();
      utterance.onerror = () => options?.onError?.(new Error("Speech error"));
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    return;
  }

  // Native: use expo-speech
  Speech.speak(script, {
    language: "en-US",
    rate: options?.rate ?? 0.85,
    pitch: 1.0,
    volume: 1.0,
    onStart: () => options?.onStart?.(),
    onDone: () => options?.onDone?.(),
    onStopped: () => options?.onStopped?.(),
    onError: (error) => options?.onError?.(error),
  });
}

/**
 * Stop any ongoing coaching speech.
 */
export async function stopCoaching(): Promise<void> {
  if (Platform.OS === "web") {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    return;
  }
  await Speech.stop();
}

/**
 * Check if coaching is currently speaking.
 */
export async function isCoachingSpeaking(): Promise<boolean> {
  if (Platform.OS === "web") {
    return "speechSynthesis" in window && window.speechSynthesis.speaking;
  }
  return Speech.isSpeakingAsync();
}
