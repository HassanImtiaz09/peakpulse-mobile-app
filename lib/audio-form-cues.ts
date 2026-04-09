/**
 * Audio Form Cues
 *
 * Provides step-by-step spoken form instructions for exercises
 * using expo-speech text-to-speech engine.
 *
 * Each exercise has a sequence of cues that can be played
 * sequentially with timing between each step.
 */

import * as Speech from "expo-speech";
import { Platform } from "react-native";
import { UI } from "@/constants/ui-colors";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FormCue {
  /** Step number (1-based) */
  step: number;
  /** Phase of the exercise */
  phase: "setup" | "execution" | "peak" | "return" | "breathing";
  /** Short label for the step */
  label: string;
  /** Full spoken text */
  text: string;
  /** Duration in ms to wait after speaking this cue */
  pauseAfter: number;
}

export interface ExerciseAudioCues {
  /** Exercise name */
  exerciseName: string;
  /** Ordered list of form cues */
  cues: FormCue[];
  /** Total estimated duration in seconds */
  estimatedDuration: number;
}

// ── Cue Data ─────────────────────────────────────────────────────────────────

const AUDIO_CUES: Record<string, ExerciseAudioCues> = {
  "bench press": {
    exerciseName: "Bench Press",
    estimatedDuration: 28,
    cues: [
      { step: 1, phase: "setup", label: "Grip", text: "Grip the bar just outside shoulder width. Wrap your thumbs around the bar.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Arch", text: "Retract your shoulder blades. Squeeze them together and press them into the bench. Create a slight arch in your upper back.", pauseAfter: 2000 },
      { step: 3, phase: "setup", label: "Feet", text: "Plant your feet flat on the floor. Drive through your heels for stability.", pauseAfter: 1500 },
      { step: 4, phase: "breathing", label: "Breathe", text: "Take a deep breath and brace your core.", pauseAfter: 1500 },
      { step: 5, phase: "execution", label: "Lower", text: "Unrack the bar. Lower it slowly to your mid-chest. Keep your elbows at about 45 degrees from your body.", pauseAfter: 2500 },
      { step: 6, phase: "peak", label: "Touch", text: "Lightly touch your chest. Don't bounce. Pause briefly.", pauseAfter: 1500 },
      { step: 7, phase: "return", label: "Press", text: "Press the bar up and slightly back. Drive through your chest and triceps. Lock out at the top.", pauseAfter: 2000 },
      { step: 8, phase: "breathing", label: "Exhale", text: "Exhale at the top. Reset your breath for the next rep.", pauseAfter: 1000 },
    ],
  },
  "squat": {
    exerciseName: "Squat",
    estimatedDuration: 30,
    cues: [
      { step: 1, phase: "setup", label: "Bar Position", text: "Position the bar on your upper traps. Grip the bar firmly with hands just outside your shoulders.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Stance", text: "Feet shoulder-width apart, toes pointed slightly outward at about 30 degrees.", pauseAfter: 1500 },
      { step: 3, phase: "breathing", label: "Brace", text: "Take a deep breath into your belly. Brace your core hard, like you're about to be punched.", pauseAfter: 2000 },
      { step: 4, phase: "execution", label: "Descend", text: "Push your hips back and bend your knees. Sit down between your legs. Keep your chest up and eyes forward.", pauseAfter: 2500 },
      { step: 5, phase: "peak", label: "Depth", text: "Go until your hip crease is below your knee. This is full depth. Your knees should track over your toes.", pauseAfter: 2000 },
      { step: 6, phase: "return", label: "Drive Up", text: "Drive up through your heels. Push your back into the bar. Stand up tall and squeeze your glutes at the top.", pauseAfter: 2500 },
      { step: 7, phase: "breathing", label: "Exhale", text: "Exhale at the top. Take another breath before the next rep.", pauseAfter: 1000 },
    ],
  },
  "deadlift": {
    exerciseName: "Deadlift",
    estimatedDuration: 32,
    cues: [
      { step: 1, phase: "setup", label: "Stance", text: "Stand with feet hip-width apart. The bar should be over your mid-foot, about one inch from your shins.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Grip", text: "Hinge at the hips and grip the bar just outside your knees. Use a double overhand or mixed grip.", pauseAfter: 2000 },
      { step: 3, phase: "setup", label: "Position", text: "Drop your hips, lift your chest, and pull the slack out of the bar. Your arms should be straight. Engage your lats.", pauseAfter: 2500 },
      { step: 4, phase: "breathing", label: "Brace", text: "Take a big breath. Brace your core. This protects your spine.", pauseAfter: 1500 },
      { step: 5, phase: "execution", label: "Pull", text: "Push the floor away with your legs. Keep the bar close to your body. It should drag up your shins.", pauseAfter: 2500 },
      { step: 6, phase: "peak", label: "Lockout", text: "Once the bar passes your knees, drive your hips forward. Stand tall. Squeeze your glutes. Don't lean back.", pauseAfter: 2000 },
      { step: 7, phase: "return", label: "Lower", text: "Push your hips back first. Then bend your knees once the bar passes them. Control the descent.", pauseAfter: 2000 },
      { step: 8, phase: "breathing", label: "Reset", text: "Reset at the bottom. Don't bounce. Take a fresh breath for each rep.", pauseAfter: 1000 },
    ],
  },
  "push up": {
    exerciseName: "Push Up",
    estimatedDuration: 22,
    cues: [
      { step: 1, phase: "setup", label: "Hands", text: "Place your hands slightly wider than shoulder width. Fingers spread, pointing forward.", pauseAfter: 1500 },
      { step: 2, phase: "setup", label: "Body Line", text: "Get into a plank position. Your body should form a straight line from head to heels. Engage your core.", pauseAfter: 2000 },
      { step: 3, phase: "breathing", label: "Breathe In", text: "Inhale as you prepare to lower.", pauseAfter: 1000 },
      { step: 4, phase: "execution", label: "Lower", text: "Bend your elbows and lower your chest toward the floor. Keep your elbows at 45 degrees, not flared out.", pauseAfter: 2000 },
      { step: 5, phase: "peak", label: "Bottom", text: "Lower until your chest nearly touches the floor. Keep your core tight. Don't let your hips sag.", pauseAfter: 1500 },
      { step: 6, phase: "return", label: "Push", text: "Push through your palms. Extend your arms fully. Exhale as you push up.", pauseAfter: 1500 },
    ],
  },
  "pull up": {
    exerciseName: "Pull Up",
    estimatedDuration: 24,
    cues: [
      { step: 1, phase: "setup", label: "Grip", text: "Grab the bar with an overhand grip, slightly wider than shoulder width. Hang with arms fully extended.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Engage", text: "Depress your shoulder blades. Pull them down and back. This activates your lats.", pauseAfter: 1500 },
      { step: 3, phase: "breathing", label: "Breathe", text: "Take a breath and brace your core.", pauseAfter: 1000 },
      { step: 4, phase: "execution", label: "Pull", text: "Pull yourself up by driving your elbows down toward your hips. Lead with your chest, not your chin.", pauseAfter: 2500 },
      { step: 5, phase: "peak", label: "Top", text: "Pull until your chin clears the bar. Squeeze your back muscles at the top.", pauseAfter: 1500 },
      { step: 6, phase: "return", label: "Lower", text: "Lower yourself slowly and under control. Fully extend your arms at the bottom. Don't swing.", pauseAfter: 2000 },
    ],
  },
  "lateral raise": {
    exerciseName: "Lateral Raise",
    estimatedDuration: 20,
    cues: [
      { step: 1, phase: "setup", label: "Start", text: "Stand tall with dumbbells at your sides. Slight bend in your elbows. Palms facing in.", pauseAfter: 1500 },
      { step: 2, phase: "execution", label: "Raise", text: "Raise your arms out to the sides. Lead with your elbows, not your hands. Keep the slight elbow bend.", pauseAfter: 2000 },
      { step: 3, phase: "peak", label: "Top", text: "Raise to shoulder height, no higher. Your arms should be parallel to the floor. Pinky finger slightly higher than thumb.", pauseAfter: 2000 },
      { step: 4, phase: "return", label: "Lower", text: "Lower slowly with control. Don't just drop the weight. Feel the tension in your side delts.", pauseAfter: 1500 },
      { step: 5, phase: "breathing", label: "Tip", text: "Don't shrug your shoulders. Keep them down and relaxed. If you're swinging, the weight is too heavy.", pauseAfter: 1500 },
    ],
  },
  "bicep curl": {
    exerciseName: "Bicep Curl",
    estimatedDuration: 18,
    cues: [
      { step: 1, phase: "setup", label: "Start", text: "Stand with dumbbells at your sides. Palms facing forward. Elbows pinned to your ribs.", pauseAfter: 1500 },
      { step: 2, phase: "execution", label: "Curl", text: "Curl the weights up by bending at the elbow only. Your upper arms should not move.", pauseAfter: 2000 },
      { step: 3, phase: "peak", label: "Squeeze", text: "Squeeze your biceps hard at the top. Hold for a brief moment.", pauseAfter: 1500 },
      { step: 4, phase: "return", label: "Lower", text: "Lower the weights slowly. Full extension at the bottom. Don't use momentum.", pauseAfter: 1500 },
    ],
  },
  "shoulder press": {
    exerciseName: "Shoulder Press",
    estimatedDuration: 22,
    cues: [
      { step: 1, phase: "setup", label: "Start", text: "Hold dumbbells at shoulder height. Palms facing forward. Elbows at 90 degrees.", pauseAfter: 1500 },
      { step: 2, phase: "breathing", label: "Brace", text: "Brace your core. Don't arch your lower back.", pauseAfter: 1000 },
      { step: 3, phase: "execution", label: "Press", text: "Press the weights straight up overhead. Your arms should end up next to your ears.", pauseAfter: 2000 },
      { step: 4, phase: "peak", label: "Lockout", text: "Fully extend your arms at the top. Biceps by your ears.", pauseAfter: 1500 },
      { step: 5, phase: "return", label: "Lower", text: "Lower the weights back to shoulder height with control. Don't drop them.", pauseAfter: 1500 },
    ],
  },
  "hip thrust": {
    exerciseName: "Hip Thrust",
    estimatedDuration: 22,
    cues: [
      { step: 1, phase: "setup", label: "Position", text: "Sit on the floor with your upper back against a bench. Roll the barbell over your hips. Feet flat, shoulder-width apart.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Feet", text: "Position your feet so your shins are vertical at the top of the movement.", pauseAfter: 1500 },
      { step: 3, phase: "execution", label: "Drive", text: "Drive through your heels. Push your hips up toward the ceiling. Squeeze your glutes hard.", pauseAfter: 2000 },
      { step: 4, phase: "peak", label: "Top", text: "At the top, your body should form a straight line from shoulders to knees. Hold and squeeze.", pauseAfter: 2000 },
      { step: 5, phase: "return", label: "Lower", text: "Lower your hips with control. Don't just drop down. Keep tension in your glutes.", pauseAfter: 1500 },
    ],
  },
  "barbell row": {
    exerciseName: "Barbell Row",
    estimatedDuration: 24,
    cues: [
      { step: 1, phase: "setup", label: "Hinge", text: "Hinge at the hips until your torso is about 45 degrees. Grip the bar shoulder-width apart.", pauseAfter: 2000 },
      { step: 2, phase: "setup", label: "Position", text: "Let the bar hang at arm's length. Engage your lats. Keep your back flat.", pauseAfter: 1500 },
      { step: 3, phase: "execution", label: "Row", text: "Pull the bar to your lower chest. Drive your elbows back, not up. Squeeze your shoulder blades together.", pauseAfter: 2500 },
      { step: 4, phase: "peak", label: "Squeeze", text: "Hold the contraction for a moment. Feel your back muscles working.", pauseAfter: 1500 },
      { step: 5, phase: "return", label: "Lower", text: "Lower the bar with control. Full arm extension at the bottom. Maintain your hip hinge throughout.", pauseAfter: 2000 },
    ],
  },
  "romanian deadlift": {
    exerciseName: "Romanian Deadlift",
    estimatedDuration: 24,
    cues: [
      { step: 1, phase: "setup", label: "Start", text: "Stand tall holding the bar at hip height. Feet hip-width apart. Slight bend in your knees.", pauseAfter: 1500 },
      { step: 2, phase: "execution", label: "Hinge", text: "Push your hips straight back. The bar slides down your thighs. Keep it close to your body.", pauseAfter: 2000 },
      { step: 3, phase: "execution", label: "Stretch", text: "Lower until you feel a strong stretch in your hamstrings. Your back stays flat the entire time.", pauseAfter: 2000 },
      { step: 4, phase: "peak", label: "Bottom", text: "The bar should be around mid-shin. Don't round your back to go lower.", pauseAfter: 1500 },
      { step: 5, phase: "return", label: "Drive", text: "Drive your hips forward to stand up. Squeeze your glutes at the top. The bar stays close to your legs.", pauseAfter: 2000 },
    ],
  },
  "plank": {
    exerciseName: "Plank",
    estimatedDuration: 18,
    cues: [
      { step: 1, phase: "setup", label: "Position", text: "Get on your forearms and toes. Elbows directly under your shoulders.", pauseAfter: 1500 },
      { step: 2, phase: "execution", label: "Body Line", text: "Create a straight line from your head to your heels. Don't let your hips sag or pike up.", pauseAfter: 2000 },
      { step: 3, phase: "execution", label: "Engage", text: "Squeeze your glutes. Brace your core like you're about to be punched. Pull your elbows toward your toes.", pauseAfter: 2000 },
      { step: 4, phase: "breathing", label: "Breathe", text: "Breathe normally. Don't hold your breath. Stay tight and hold the position.", pauseAfter: 1500 },
    ],
  },
  "lunge": {
    exerciseName: "Lunge",
    estimatedDuration: 22,
    cues: [
      { step: 1, phase: "setup", label: "Start", text: "Stand tall with feet hip-width apart. Hands on hips or holding dumbbells at your sides.", pauseAfter: 1500 },
      { step: 2, phase: "execution", label: "Step", text: "Take a big step forward. Your step should be long enough that both knees can reach 90 degrees.", pauseAfter: 2000 },
      { step: 3, phase: "peak", label: "Bottom", text: "Lower your back knee toward the floor. Front knee stays over your ankle, not past your toes. Torso stays upright.", pauseAfter: 2000 },
      { step: 4, phase: "return", label: "Push Back", text: "Push through your front heel to return to standing. Keep your core engaged throughout.", pauseAfter: 1500 },
    ],
  },
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get audio form cues for an exercise.
 */
export function getAudioCues(exerciseName: string): ExerciseAudioCues | null {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return AUDIO_CUES[norm] ?? null;
}

/**
 * Get all exercises that have audio cues.
 */
export function getExercisesWithAudioCues(): string[] {
  return Object.keys(AUDIO_CUES);
}

/**
 * Check if an exercise has audio cues.
 */
export function hasAudioCues(exerciseName: string): boolean {
  const norm = exerciseName.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  return norm in AUDIO_CUES;
}

/**
 * Speak a single form cue using text-to-speech.
 */
export async function speakCue(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      language: "en-US",
      pitch: 1.0,
      rate: Platform.OS === "ios" ? 0.52 : 0.9,
      onDone: () => resolve(),
      onError: () => resolve(),
      onStopped: () => resolve(),
    });
  });
}

/**
 * Stop any currently playing speech.
 */
export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * Check if speech is currently playing.
 */
export async function isSpeaking(): Promise<boolean> {
  return Speech.isSpeakingAsync();
}

/**
 * Get the total number of exercises with audio cues.
 */
export function getAudioCueCount(): number {
  return Object.keys(AUDIO_CUES).length;
}

/**
 * Get the phase color for visual indicators.
 */
export function getPhaseColor(phase: FormCue["phase"]): string {
  switch (phase) {
    case "setup": return UI.blue;
    case "execution": return "#D4AF37";
    case "peak": return UI.green;
    case "return": return UI.purple;
    case "breathing": return UI.gold;
    default: return "#9BA1A6";
  }
}

/**
 * Get the phase icon name for visual indicators.
 */
export function getPhaseIcon(phase: FormCue["phase"]): string {
  switch (phase) {
    case "setup": return "settings";
    case "execution": return "fitness-center";
    case "peak": return "star";
    case "return": return "replay";
    case "breathing": return "air";
    default: return "info";
  }
}
