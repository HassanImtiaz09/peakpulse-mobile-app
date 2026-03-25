/**
 * UserProfileContext — manages local user profile data (photo, display name)
 * that persists across sessions via AsyncStorage.
 * Works for both authenticated and guest users.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PROFILE_PHOTO_KEY = "@peakpulse_profile_photo";
const DISPLAY_NAME_KEY = "@peakpulse_display_name";

interface UserProfileState {
  profilePhotoUri: string | null;
  displayName: string | null;
  loading: boolean;
  setProfilePhoto: (uri: string | null) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  clearProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileState>({
  profilePhotoUri: null,
  displayName: null,
  loading: true,
  setProfilePhoto: async () => {},
  setDisplayName: async () => {},
  clearProfile: async () => {},
});

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profilePhotoUri, setPhotoUri] = useState<string | null>(null);
  const [displayName, setName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const [photo, name] = await Promise.all([
        AsyncStorage.getItem(PROFILE_PHOTO_KEY),
        AsyncStorage.getItem(DISPLAY_NAME_KEY),
      ]);
      if (photo) setPhotoUri(photo);
      if (name) setName(name);
    } catch {
      // Silently fail — defaults are null
    }
    setLoading(false);
  }

  const setProfilePhoto = useCallback(async (uri: string | null) => {
    try {
      if (uri) {
        await AsyncStorage.setItem(PROFILE_PHOTO_KEY, uri);
      } else {
        await AsyncStorage.removeItem(PROFILE_PHOTO_KEY);
      }
      setPhotoUri(uri);
    } catch {
      // Silently fail
    }
  }, []);

  const setDisplayNameFn = useCallback(async (name: string) => {
    try {
      await AsyncStorage.setItem(DISPLAY_NAME_KEY, name);
      setName(name);
    } catch {
      // Silently fail
    }
  }, []);

  const clearProfile = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(PROFILE_PHOTO_KEY),
        AsyncStorage.removeItem(DISPLAY_NAME_KEY),
      ]);
      setPhotoUri(null);
      setName(null);
    } catch {
      // Silently fail
    }
  }, []);

  return (
    <UserProfileContext.Provider
      value={{
        profilePhotoUri,
        displayName,
        loading,
        setProfilePhoto,
        setDisplayName: setDisplayNameFn,
        clearProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  return useContext(UserProfileContext);
}
