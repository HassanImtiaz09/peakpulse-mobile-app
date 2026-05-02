/**
 * Track Player Service — Background audio event handler
 *
 * This service runs in the background and handles remote control events
 * (lock screen controls, notification media controls, headphone buttons).
 *
 * Registered once at app startup via TrackPlayer.registerPlaybackService().
 * Must be a top-level registration (not inside a component).
 *
 * Used by: Workout Audio (M6) — MiniMax-generated workout music
 */
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  RepeatMode,
} from "react-native-track-player";

/**
 * Setup the track player with default configuration.
 * Call this once during app initialization.
 */
export async function setupTrackPlayer(): Promise<boolean> {
  try {
    await TrackPlayer.setupPlayer({
      // Buffer size in seconds — balance between responsiveness and data usage
      minBuffer: 30,
      maxBuffer: 120,
      playBuffer: 5,
      backBuffer: 30,
    });

    await TrackPlayer.updateOptions({
      // Capabilities shown in the notification / lock screen
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      // Compact capabilities shown in the small notification view (Android)
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // Keep playing when the app is killed (Android)
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      // Notification channel name (Android)
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });

    // Default to repeat the queue (workout playlists loop)
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);

    return true;
  } catch (error) {
    // Player may already be set up (e.g., after hot reload)
    console.warn("[TrackPlayer] Setup warning:", error);
    return false;
  }
}

/**
 * The playback service that handles remote control events.
 * This function is called by TrackPlayer.registerPlaybackService().
 */
export async function PlaybackService(): Promise<void> {
  // Remote play (lock screen, notification, headphone button)
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  // Remote pause
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  // Remote stop
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  // Skip to next track
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  // Skip to previous track
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  // Seek to position (scrubbing on lock screen)
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  // Handle audio ducking (lower volume during phone calls, navigation, etc.)
  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    if (event.permanent) {
      // Audio focus permanently lost (e.g., another music app started)
      await TrackPlayer.pause();
    } else if (event.paused) {
      // Temporarily paused (e.g., phone call) — duck volume
      await TrackPlayer.setVolume(0.3);
    } else {
      // Ducking ended — restore volume
      await TrackPlayer.setVolume(1.0);
    }
  });

  // Track ended naturally — auto-advance is handled by RepeatMode.Queue
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (_event) => {
    // Could be used for analytics or UI updates
  });

  // Playback error
  TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
    console.error("[TrackPlayer] Playback error:", event);
  });
}

/**
 * Volume ducking utility for rest timer integration.
 * Lowers music volume during rest timer countdown,
 * restores when rest period ends.
 */
export async function duckVolumeForRest(duck: boolean): Promise<void> {
  try {
    if (duck) {
      await TrackPlayer.setVolume(0.2); // 20% during rest timer chime
    } else {
      await TrackPlayer.setVolume(1.0); // Full volume during workout
    }
  } catch {
    // Player may not be initialized yet — safe to ignore
  }
}

/**
 * Check if the track player is initialized.
 */
export async function isPlayerReady(): Promise<boolean> {
  try {
    await TrackPlayer.getActiveTrack();
    return true;
  } catch {
    return false;
  }
}
