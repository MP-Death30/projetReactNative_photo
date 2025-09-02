import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useJournal } from '../context/JournalProvider';
import { colors, spacing, borderRadius } from '../styles/globalStyles';

type CityCoord = { latitude: number; longitude: number };

export default function MapScreen() {
  const { photos } = useJournal();
  const cities = useMemo(() => {
    const map = new Map<string, number>();
    photos.forEach(p => { if (p.locationName) map.set(p.locationName, (map.get(p.locationName) || 0) + 1); });
    return Array.from(map.entries()) as [string, number][];
  }, [photos]);

  const [coords, setCoords] = useState<Record<string, CityCoord>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const missing = cities.map(([city]) => city).filter(city => city && !coords[city]);
      if (missing.length === 0) return;

      setLoading(true);
      const next: Record<string, CityCoord> = { ...coords };
      for (const city of missing) {
        try {
          const res = await Location.geocodeAsync(city);
          if (res[0] && !cancelled) { next[city] = { latitude: res[0].latitude, longitude: res[0].longitude }; }
        } catch {}
      }
      if (!cancelled) { setCoords(next); setLoading(false); }
    }
    run();
    return () => { cancelled = true; };
  }, [cities, coords]);

  const firstCity = cities.find(([name]) => coords[name]);
  const initialRegion: Region = useMemo(() => {
    if (firstCity) {
      const c = coords[firstCity[0]];
      return { latitude: c.latitude, longitude: c.longitude, latitudeDelta: 3, longitudeDelta: 3 };
    }
    return { latitude: 48.8566, longitude: 2.3522, latitudeDelta: 5, longitudeDelta: 5 };
  }, [firstCity, coords]);

  return (
    <View style={{ flex: 1 }}>
      <MapView style={{ flex: 1 }} initialRegion={initialRegion}>
        {cities.map(([city, count]) => {
          const c = coords[city];
          if (!c) return null;
          return <Marker key={city} coordinate={c} title={city} description={count > 1 ? `${count} photos` : '1 photo'} />;
        })}
      </MapView>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={{ marginLeft: spacing.s }}>Géocodage des villes…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute', top: spacing.m, left: spacing.m, backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: spacing.m, paddingVertical: spacing.s, borderRadius: borderRadius.m, flexDirection: 'row', alignItems: 'center',
  },
});
