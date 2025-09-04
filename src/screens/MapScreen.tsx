import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
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
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";
import { useJournal } from "../context/JournalProvider";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");

type CityCoord = { latitude: number; longitude: number };

export default function MapScreen() {
  const { photos } = useJournal();
  const webViewRef = useRef<any>(null);

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

  // Compute average center
  const center = useMemo(() => {
    const coordsArray = Object.values(coords);
    if (coordsArray.length === 0) return { latitude: 48.8566, longitude: 2.3522 };
    const lat = coordsArray.reduce((s, c) => s + c.latitude, 0) / coordsArray.length;
    const lng = coordsArray.reduce((s, c) => s + c.longitude, 0) / coordsArray.length;
    return { latitude: lat, longitude: lng };
  }, [coords]);

  // HTML for WebView (depends on coords + cities → recalculated on change)
  const html = useMemo(() => {
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

    return `
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
          var map = L.map('map')
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          ${markersJS}

          var allCoords = [${Object.values(coords)
            .map((c) => `[${c.latitude}, ${c.longitude}]`)
            .join(",")}];
          if (allCoords.length > 0) {
            map.fitBounds(allCoords, { padding: [50, 50] });
          } else {
            map.setView([48.8566, 2.3522], 4); // fallback Paris
          }

          window.recenterMap = function(lat, lng) {
            if (allCoords.length > 0) {
              map.fitBounds(allCoords, { padding: [50, 50] });
            } else {
              map.setView([lat, lng], 4);
            }
          };
        </script>
      </body>
      </html>
    `;
  }, [cities, coords]);

  // Recenter handler
  const recenter = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.recenterMap(${center.latitude}, ${center.longitude});
        true;
      `);
    }
  };

  
    // Forcer le recalcul / recentrage à chaque ouverture
  useFocusEffect(
    useCallback(() => {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          window.recenterMap(${center.latitude}, ${center.longitude});
          true;
        `);
      }
    }, [center])
  );
  // Handle messages from WebView (when button clicked)
  const onMessage = useCallback((event: any) => {
    try {
      const city = decodeURIComponent(event.nativeEvent.data);
      if (city) setSelectedCity(city);
    } catch (e) {
      console.warn("Invalid city message", e);
    }
  }, []);

  const selectedPhotos = selectedCity
    ? cities.find(([c]) => c === selectedCity)?.[1].items || []
    : [];


  return (
    <View style={{ flex: 1 }}>
      <WebView
        ref={webViewRef}
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

      {/* Floating recenter button */}
      <TouchableOpacity style={styles.fab} onPress={recenter}>
        <Ionicons name="locate" size={20} color="white" />
      </TouchableOpacity>

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
  fab: {
    position: "absolute",
    bottom: 45,
    right: 20,
    backgroundColor: "#2563eb",
    borderRadius: 20,
    padding: 10,
    elevation: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
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

