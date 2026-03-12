/**
 * GuestAuthContext — allows users to use the app without a Google/OAuth account.
 * Stores a local guest profile in AsyncStorage.
 * When a real OAuth user is present, guest mode is ignored.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface GuestProfile {
  mode: "guest" | "email";
  name: string;
  email?: string;
  createdAt: string;
}

interface GuestAuthState {
  guestProfile: GuestProfile | null;
  isGuest: boolean;
  loading: boolean;
  enterGuestMode: (name?: string) => Promise<void>;
  enterEmailMode: (email: string, name: string) => Promise<void>;
  clearGuest: () => Promise<void>;
}

const GuestAuthContext = createContext<GuestAuthState>({
  guestProfile: null,
  isGuest: false,
  loading: true,
  enterGuestMode: async () => {},
  enterEmailMode: async () => {},
  clearGuest: async () => {},
});

const GUEST_KEY = "@peakpulse_guest_profile";

export function GuestAuthProvider({ children }: { children: React.ReactNode }) {
  const [guestProfile, setGuestProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuest();
  }, []);

  async function loadGuest() {
    try {
      const raw = await AsyncStorage.getItem(GUEST_KEY);
      if (raw) setGuestProfile(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }

  async function enterGuestMode(name = "Athlete") {
    const profile: GuestProfile = {
      mode: "guest",
      name,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
    setGuestProfile(profile);
  }

  async function enterEmailMode(email: string, name: string) {
    const profile: GuestProfile = {
      mode: "email",
      name,
      email,
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(GUEST_KEY, JSON.stringify(profile));
    setGuestProfile(profile);
  }

  async function clearGuest() {
    await AsyncStorage.removeItem(GUEST_KEY);
    setGuestProfile(null);
  }

  return (
    <GuestAuthContext.Provider
      value={{
        guestProfile,
        isGuest: guestProfile !== null,
        loading,
        enterGuestMode,
        enterEmailMode,
        clearGuest,
      }}
    >
      {children}
    </GuestAuthContext.Provider>
  );
}

export function useGuestAuth() {
  return useContext(GuestAuthContext);
}
