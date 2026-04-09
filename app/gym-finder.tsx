import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView, Text, View, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform, ImageBackground} from "react-native";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";

import { GOLDEN_PRIMARY, GOLDEN_OVERLAY_STYLE } from "@/constants/golden-backgrounds";
import { a11yButton, a11yHeader, a11yImage, a11yProgress, a11ySwitch, A11Y_LABELS } from "@/lib/accessibility";
import { ScreenErrorBoundary } from "@/components/error-boundary";
import { UI } from "@/constants/ui-colors";
// Lazy-load react-native-maps only on native platforms to avoid web bundling errors
let MapView: any = null;
let Marker: any = null;
if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
}

interface Gym {
  id: number;
  name: string;
  lat: number;
  lon: number;
  address?: string;
  phone?: string;
  website?: string;
  opening_hours?: string;
  distance?: number;
}

export default function GymFinderScreen() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [radius, setRadius] = useState(2000);

  useEffect(() => {
    requestLocation();
  }, []);

  async function requestLocation() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Location access is needed to find nearby gyms.");
        setLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lon: loc.coords.longitude };
      setLocation(coords);
      await fetchNearbyGyms(coords, radius);
    } catch (e: any) {
      Alert.alert("Location Error", e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNearbyGyms(coords: { lat: number; lon: number }, searchRadius: number) {
    setLoading(true);
    try {
      const query = `
        [out:json][timeout:25];
        (
          node["leisure"="fitness_centre"](around:${searchRadius},${coords.lat},${coords.lon});
          way["leisure"="fitness_centre"](around:${searchRadius},${coords.lat},${coords.lon});
          node["sport"="fitness"](around:${searchRadius},${coords.lat},${coords.lon});
          way["sport"="fitness"](around:${searchRadius},${coords.lat},${coords.lon});
        );
        out body;
        >;
        out skel qt;
      `;
      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const data = await response.json();
      const gymList: Gym[] = data.elements
        .filter((el: any) => el.lat && el.lon)
        .map((el: any) => {
          const dist = getDistance(coords.lat, coords.lon, el.lat, el.lon);
          return {
            id: el.id,
            name: el.tags?.name ?? "Fitness Center",
            lat: el.lat,
            lon: el.lon,
            address: [el.tags?.["addr:street"], el.tags?.["addr:housenumber"], el.tags?.["addr:city"]].filter(Boolean).join(", "),
            phone: el.tags?.phone,
            website: el.tags?.website,
            opening_hours: el.tags?.opening_hours,
            distance: dist,
          };
        })
        .sort((a: Gym, b: Gym) => (a.distance ?? 0) - (b.distance ?? 0))
        .slice(0, 20);
      setGyms(gymList);
    } catch (e: any) {
      Alert.alert("Search Error", "Could not fetch nearby gyms. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  function formatDistance(meters: number): string {
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  }

  function openDirections(gym: Gym) {
    const url = Platform.OS === "ios"
      ? `maps://app?daddr=${gym.lat},${gym.lon}`
      : `geo:${gym.lat},${gym.lon}?q=${encodeURIComponent(gym.name)}`;
    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${gym.lat},${gym.lon}`);
    });
  }

  const initialRegion = location ? {
    latitude: location.lat,
    longitude: location.lon,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  } : undefined;

  return (
    <ScreenErrorBoundary screenName="gym-finder">
    <ImageBackground source={{ uri: GOLDEN_PRIMARY }} style={{ flex: 1 }} resizeMode="cover">
    <ScreenContainer edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: UI.surface, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: UI.fg, fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: UI.fg, fontSize: 22, fontFamily: "BebasNeue_400Regular" }}>Nearby Gyms</Text>
          <Text style={{ color: UI.secondaryLight, fontSize: 12 }}>
            {gyms.length > 0 ? `${gyms.length} gyms found` : "Finding gyms near you..."}
          </Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: UI.goldAlpha10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={() => location && fetchNearbyGyms(location, radius)}
          disabled={loading}
        >
          {loading ? <ActivityIndicator size="small" color={UI.gold2} /> : <Text style={{ color: UI.gold2, fontFamily: "DMSans_700Bold", fontSize: 12 }}>🔄 Refresh</Text>}
        </TouchableOpacity>
      </View>

      {/* Radius Selector */}
      <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 8 }}>
        {[1000, 2000, 5000, 10000].map(r => (
          <TouchableOpacity
            key={r}
            style={{ flex: 1, paddingVertical: 6, borderRadius: 10, alignItems: "center", backgroundColor: radius === r ? UI.gold : UI.surface, borderWidth: 1, borderColor: radius === r ? UI.gold : UI.goldAlpha10 }}
            onPress={() => { setRadius(r); if (location) fetchNearbyGyms(location, r); }}
          >
            <Text style={{ color: radius === r ? UI.fg : UI.secondaryLight, fontFamily: "DMSans_700Bold", fontSize: 11 }}>
              {r >= 1000 ? `${r / 1000}km` : `${r}m`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Map — native only */}
      {Platform.OS !== "web" && MapView && initialRegion ? (
        <View style={{ height: 260, marginHorizontal: 20, borderRadius: 16, overflow: "hidden", marginBottom: 12 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton
          >
            {Marker && gyms.map(gym => (
              <Marker
                key={gym.id}
                coordinate={{ latitude: gym.lat, longitude: gym.lon }}
                title={gym.name}
                description={gym.address}
                pinColor={selectedGym?.id === gym.id ? UI.gold : UI.secondaryLight}
                onPress={() => setSelectedGym(gym)}
              />
            ))}
          </MapView>
        </View>
      ) : (
        <View style={{ height: 100, marginHorizontal: 20, borderRadius: 16, backgroundColor: UI.surface, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: UI.goldAlpha10 }}>
          <Text style={{ fontSize: 28, marginBottom: 4 }}>🗺️</Text>
          <Text style={{ color: UI.secondaryLight, fontSize: 12 }}>Interactive map available on iOS & Android</Text>
        </View>
      )}

      {/* Selected Gym Detail */}
      {selectedGym && (
        <View style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: UI.surface, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: UI.borderGold3 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 15 }}>{selectedGym.name}</Text>
              {selectedGym.address ? <Text style={{ color: UI.secondaryLight, fontSize: 12, marginTop: 2 }}>📍 {selectedGym.address}</Text> : null}
              {selectedGym.opening_hours ? <Text style={{ color: UI.secondaryLight, fontSize: 12, marginTop: 2 }}>🕐 {selectedGym.opening_hours}</Text> : null}
              {selectedGym.distance ? <Text style={{ color: UI.gold3, fontSize: 12, marginTop: 2 }}>📏 {formatDistance(selectedGym.distance)} away</Text> : null}
            </View>
            <TouchableOpacity onPress={() => setSelectedGym(null)}>
              <Text style={{ color: UI.secondaryLight, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: UI.gold, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
              onPress={() => openDirections(selectedGym)}
            >
              <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 12 }}>🗺️ Directions</Text>
            </TouchableOpacity>
            {selectedGym.website ? (
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: UI.goldAlpha10, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
                onPress={() => Linking.openURL(selectedGym.website!)}
              >
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_700Bold", fontSize: 12 }}>🌐 Website</Text>
              </TouchableOpacity>
            ) : null}
            {selectedGym.phone ? (
              <TouchableOpacity
                style={{ flex: 1, backgroundColor: UI.goldAlpha10, borderRadius: 10, paddingVertical: 8, alignItems: "center" }}
                onPress={() => Linking.openURL(`tel:${selectedGym.phone}`)}
              >
                <Text style={{ color: UI.secondaryLight, fontFamily: "DMSans_700Bold", fontSize: 12 }}>📞 Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Gym List */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {loading && gyms.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <ActivityIndicator size="large" color={UI.gold} />
            <Text style={{ color: UI.secondaryLight, fontSize: 13, marginTop: 12 }}>Finding gyms near you...</Text>
          </View>
        ) : gyms.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏋️</Text>
            <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 16, marginBottom: 6 }}>No Gyms Found</Text>
            <Text style={{ color: UI.secondaryLight, fontSize: 13, textAlign: "center" }}>Try a larger radius or check location settings.</Text>
          </View>
        ) : (
          gyms.map((gym) => (
            <TouchableOpacity
              key={gym.id}
              style={{ backgroundColor: UI.surface, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: selectedGym?.id === gym.id ? UI.gold : UI.goldAlpha10 }}
              onPress={() => {
                setSelectedGym(gym);
                if (mapRef.current && Platform.OS !== "web") {
                  mapRef.current.animateToRegion({ latitude: gym.lat, longitude: gym.lon, latitudeDelta: 0.01, longitudeDelta: 0.01 }, 500);
                }
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: UI.goldAlpha10, alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 20 }}>🏋️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: UI.fg, fontFamily: "DMSans_700Bold", fontSize: 14 }} numberOfLines={1}>{gym.name}</Text>
                  {gym.address ? (
                    <Text style={{ color: UI.secondaryLight, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{gym.address}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {gym.distance ? (
                    <Text style={{ color: UI.gold3, fontFamily: "DMSans_700Bold", fontSize: 12 }}>{formatDistance(gym.distance)}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={{ backgroundColor: UI.goldAlpha10, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 }}
                    onPress={() => openDirections(gym)}
                  >
                    <Text style={{ color: UI.gold2, fontSize: 10, fontFamily: "DMSans_700Bold" }}>Directions</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
    </ImageBackground>
    </ScreenErrorBoundary>
  );
}
