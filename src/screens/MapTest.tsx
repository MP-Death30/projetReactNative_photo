import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useJournal } from "../context/JournalProvider";
import { Ionicons } from "@expo/vector-icons";

// Petit type interne pour le cache de géocodage
type CityCoord = { latitude: number; longitude: number };

export default function MapScreen() {
  const { photos } = useJournal();

  // on regroupe par ville (locationName); on ignore les entrées sans ville
  const cities = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach((p) => {
      if (p.locationName)
        map.set(p.locationName, (map.get(p.locationName) || 0) + 1);
    });
    return Array.from(map.entries()) as [string, number][];
  }, [photos]);

  const [coords, setCoords] = useState<Record<string, CityCoord>>({});
  const [loading, setLoading] = useState(false);

  const mapRef = useRef<MapView>(null);

  // géocodage à la volée des villes manquantes
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const missing = cities
        .map(([city]) => city)
        .filter((city) => city && !coords[city]);

      if (missing.length === 0) return;

      setLoading(true);
      const next: Record<string, CityCoord> = { ...coords };

      for (const city of missing) {
        try {
          const res = await Location.geocodeAsync(city);
          if (res[0] && !cancelled) {
            next[city] = {
              latitude: res[0].latitude,
              longitude: res[0].longitude,
            };
          }
        } catch {
          // ignore villes non trouvées
        }
      }
      if (!cancelled) {
        setCoords(next);
        setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [cities, coords]);

  // centrer automatiquement à l'ouverture
  useEffect(() => {
    recenterOnPhotos();
  }, [coords, photos]);

  const recenterOnPhotos = () => {
    const coordsArray = photos
      .map((p) => p.locationName && coords[p.locationName])
      .filter(Boolean) as CityCoord[];

    if (coordsArray.length > 0 && mapRef.current) {
      mapRef.current.fitToCoordinates(coordsArray, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  };

  // région fallback si aucune photo
  const fallbackRegion = {
    latitude: 48.8566,
    longitude: 2.3522,
    latitudeDelta: 5,
    longitudeDelta: 5,
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={fallbackRegion}>
        {cities.map(([city, count]) => {
          const c = coords[city];
          if (!c) return null;
          return (
            <Marker
              key={city}
              coordinate={c}
              title={city}
              description={count > 1 ? `${count} photos` : "1 photo"}
            />
          );
        })}
      </MapView>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={{ marginLeft: 8 }}>Géocodage des villes…</Text>
        </View>
      )}

      {/* Bouton flottant pour recentrer */}
      <TouchableOpacity style={styles.fab} onPress={recenterOnPhotos}>
        <Ionicons name="map-outline" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 36,
    right: 20,
    backgroundColor: "#ff0000ff",
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
