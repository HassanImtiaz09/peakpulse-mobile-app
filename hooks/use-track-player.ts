/**
 * Hook to initialize react-native-track-player on app startup.
 *
 * Usage in _layout.tsx:
 *   useTrackPlayerInit();
 *
 * This hook:
 * 1. Registers the playback service (once, globally)
 * 2. Sets up the player with default config
 * 3. Returns the ready state for conditional rendering
 */
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

let isServiceRegistered = false;

/**
 * Initialize the track player. Safe to call multiple times —
 * registration and setup only happen once.
 *
 * Returns `true` when the player is ready to accept tracks.
 */
export function useTrackPlayerInit(): boolean {
  const [isReady, setIsReady] = useState(false);
  const hasSetup = useRef(false);

  useEffect(() => {
    // Track player is native-only — skip on web
    if (Platform.OS === "web") {
      return;
    }

    if (hasSetup.current) return;
    hasSetup.current = true;

    async function init() {
      try {
        // Dynamic import to avoid web bundling issues
        const TrackPlayer = (await import("react-native-track-player")).default;
        const { PlaybackService, setupTrackPlayer } = await import(
          "@/services/track-player-service"
        );

        // Register the background playback service (must be done once)
        if (!isServiceRegistered) {
          TrackPlayer.registerPlaybackService(() => PlaybackService);
          isServiceRegistered = true;
        }

        // Set up the player
        await setupTrackPlayer();
        setIsReady(true);
      } catch (error) {
        console.warn("[useTrackPlayerInit] Init failed:", error);
        // Non-fatal — the app works without audio
      }
    }

    init();
  }, []);

  return isReady;
}
