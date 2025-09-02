import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useJournal } from '../context/JournalProvider';

type CityCoord = { latitude: number; longitude: number };

const NOMINATIM = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=';

// petite pause pour respecter la doc Nominatim (éviter le flood)
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

export default function MapScreen() {
  const { photos } = useJournal();

  // Regroupe les photos par ville
  const cities = useMemo(() => {
    const m = new Map<string, number>();
    photos.forEach(p => {
      if (p.locationName) m.set(p.locationName, (m.get(p.locationName) || 0) + 1);
    });
    return Array.from(m.entries()) as [string, number][];
  }, [photos]);

  // Cache mémoire { ville -> coords }
  const [coords, setCoords] = useState<Record<string, CityCoord>>({});
  const [loading, setLoading] = useState(false);
  const workingRef = useRef(false);

  // Géocodage via Nominatim pour les villes manquantes (1 req/s)
  useEffect(() => {
    if (workingRef.current) return;
    const missing = cities.map(([c]) => c).filter(c => c && !coords[c]);
    if (missing.length === 0) return;

    workingRef.current = true;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const next: Record<string, CityCoord> = { ...coords };

      for (let i = 0; i < missing.length; i++) {
        const city = missing[i];
        try {
          const url = NOMINATIM + encodeURIComponent(city);
          const res = await fetch(url, {
            headers: {
              // Nominatim recommande d’identifier l’app ; Referer accepté sur le web/Expo
              'Accept': 'application/json',
              'Referer': 'https://snack.expo.dev/',
            },
          });
          const data = await res.json();
          const first = Array.isArray(data) ? data[0] : null;
          if (first && !cancelled) {
            next[city] = {
              latitude: parseFloat(first.lat),
              longitude: parseFloat(first.lon),
            };
            setCoords({ ...next });
          }
        } catch {
          // ignore
        }
        // rate limit ~1 req/s
        if (i < missing.length - 1) await sleep(1100);
      }

      if (!cancelled) setLoading(false);
      workingRef.current = false;
    })();

    return () => { cancelled = true; };
  }, [cities, coords]);

  // Région initiale : première ville géocodée, sinon Paris
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
          return (
            <Marker
              key={city}
              coordinate={c}
              title={city}
              description={count > 1 ? `${count} photos` : '1 photo'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
