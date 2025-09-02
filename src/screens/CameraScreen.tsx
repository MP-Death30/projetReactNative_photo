import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Button from '../Components/Button';
import { todayISO, JournalPhoto } from '../types';
import { useJournal } from '../context/JournalProvider';

export default function CameraScreen() {
  const { addPhoto } = useJournal(); // ✅ on récupère addPhoto du provider
  const [preview, setPreview] = useState<string | null>(null);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Caméra', 'Autorise la caméra.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const uri = result.assets[0].uri;
    setPreview(uri);

    let locationName: string | null = null;
    const loc = await Location.requestForegroundPermissionsAsync();
    if (loc.status === 'granted') {
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const rev = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const first = rev?.[0];
        locationName =
          first?.city || first?.subregion || first?.region || null;
      } catch {}
    }

    const item: JournalPhoto = {
      id: `${Date.now()}`,
      uri,
      timestamp: Date.now(),
      dateISO: todayISO(),
      locationName,
    };

    addPhoto(item); // ✅ mise à jour du state global + stockage
    Alert.alert('OK', 'Photo ajoutée !');
  };

  return (
    <View style={styles.container}>
      <Button title="📷 Prendre une photo" onPress={takePhoto} />
      {preview && (
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Image
            source={{ uri: preview }}
            style={{ width: 240, height: 240, borderRadius: 16 }}
          />
          <Text style={{ marginTop: 8, color: '#6b7280' }}>
            Dernier aperçu
          </Text>
        </View>
      )}
      {Platform.OS === 'web' && (
        <Text style={{ marginTop: 10, color: '#6b7280' }}>
          (Sur web, dépend du navigateur)
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
});
