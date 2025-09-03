import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useJournal } from "../context/JournalProvider";
import { Dimensions } from "react-native"; 

const { width, height } = Dimensions.get("window");

type CityCoord = { latitude: number; longitude: number };

export default function MapScreen() {
  const { photos } = useJournal();

  // Group photos by city
  const cities = useMemo(() => {
    const map = new Map<string, { count: number; items: typeof photos }>();
    photos.forEach((p) => {
      if (p.locationName) {
        const entry =
          map.get(p.locationName) || { count: 0, items: [] as typeof photos };
        entry.count++;
        entry.items.push(p);
        map.set(p.locationName, entry);
      }
    });
    return Array.from(map.entries()) as [
      string,
      { count: number; items: typeof photos }
    ][];
  }, [photos]);

  const [coords, setCoords] = useState<Record<string, CityCoord>>({});
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  // Geocode missing cities
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
          // ignore errors
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

  // Generate JS for markers (popup sends city name encoded)
  const markersJS = cities
    .map(([city, data]) => {
      const c = coords[city];
      if (!c) return "";
      return `
        L.marker([${c.latitude}, ${c.longitude}]).addTo(map)
          .bindPopup("<b>${city}</b><br>${data.count} photo${
        data.count > 1 ? "s" : ""
      }<br><button onclick=\\"window.ReactNativeWebView.postMessage('${encodeURIComponent(
        city
      )}')\\">Voir photos</button>");
      `;
    })
    .join("\n");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0">
      <style>
        html, body, #map { height:100%; margin:0; padding:0; }
        button {
          margin-top:6px; padding:4px 8px; border:none;
          border-radius:4px; background:#2563eb; color:white;
          font-size:12px; cursor:pointer;
        }
      </style>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map').setView([48.8566, 2.3522], 3);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        ${markersJS}
      </script>
    </body>
    </html>
  `;

  // Handle messages from WebView (when button clicked)
  const onMessage = useCallback((event: any) => {
    try {
      const city = decodeURIComponent(event.nativeEvent.data);
      console.log("WebView sent city:", city);
      if (city) setSelectedCity(city);
    } catch (e) {
      console.warn("Invalid city message", e);
    }
  }, []);

  const selectedPhotos = selectedCity
    ? cities.find(([c]) => c === selectedCity)?.[1].items || []
    : [];

  useEffect(() => {
    if (selectedCity) {
      console.log("Selected city:", selectedCity);
      console.log("Found photos:", selectedPhotos.length);
    }
  }, [selectedCity, selectedPhotos]);

  return (
    <View style={{ flex: 1 }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={{ flex: 1 }}
        onMessage={onMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        mixedContentMode="always"
      />

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator />
          <Text style={{ marginLeft: 8 }}>Géocodage des villes…</Text>
        </View>
      )}

      {/* Fullscreen gallery */}
      <Modal visible={!!selectedCity} transparent={true}>
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeArea}
            onPress={() => setSelectedCity(null)}
          >
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>

          <FlatList
            data={selectedPhotos}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            renderItem={({ item }) => (
              <View style={{ width, height, justifyContent: "center", alignItems: "center" }}>
                <Image
                  source={{ uri: item.uri }}
                  style={{ width: width, height: height, resizeMode: "contain", backgroundColor: "black" }}
                />
              </View>
            )}
          />
        </View>
      </Modal>
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
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeArea: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  closeText: {
    color: "white",
    fontSize: 28,
    fontWeight: "bold",
  },
});