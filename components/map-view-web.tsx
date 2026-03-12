// Web stub for react-native-maps — used automatically on web platform
import React from "react";
import { View, Text } from "react-native";

export const Marker = (_props: any) => null;

export default function MapView({ children, style, ...props }: any) {
  return (
    <View style={[{ backgroundColor: "#13131F", alignItems: "center", justifyContent: "center" }, style]}>
      <Text style={{ fontSize: 32, marginBottom: 6 }}>🗺️</Text>
      <Text style={{ color: "#9CA3AF", fontSize: 12 }}>Map available on iOS & Android</Text>
    </View>
  );
}
