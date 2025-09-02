import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Pressable, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useJournal } from '../context/JournalProvider';
import { useAuth } from '../context/AuthProvider';
import DefaultAvatar from '../../assets/default-avatar.png';

export default function ProfileScreen() {
  const { photos, profile, setProfile } = useJournal();
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name);
  
  useEffect(() => { 
    setName(profile.name); 
  }, [profile.name]);

  const stats = useMemo(() => {
    const days = new Set(photos.map(p => p.dateISO)).size;
    return { total: photos.length, days };
  }, [photos]);

  const changeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 1, 
      allowsEditing: true, 
      aspect: [1, 1] 
    });
    
    if (res.canceled || !res.assets?.[0]?.uri) return;
    
    const newAvatarUri = res.assets[0].uri;
    
    // Mettre à jour le profil local
    setProfile({ ...profile, avatarUri: newAvatarUri });
    
    // Mettre à jour le profil utilisateur
    try {
      await updateProfile({ avatarUri: newAvatarUri });
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil');
    }
  };

  const saveName = async () => {
    if (!name.trim()) {
      Alert.alert('Erreur', 'Le nom ne peut pas être vide');
      return;
    }

    // Mettre à jour le profil local
    setProfile({ ...profile, name: name.trim() });
    
    // Mettre à jour le profil utilisateur
    try {
      await updateProfile({ name: name.trim() });
      Alert.alert('Succès', 'Nom mis à jour !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le nom');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Déconnexion', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Profil</Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </Pressable>
      </View>

      <View style={styles.userInfo}>
        <Pressable onPress={changeAvatar} style={{ alignSelf: 'center' }}>
          <Image 
            source={profile.avatarUri ? { uri: profile.avatarUri } : DefaultAvatar} 
            style={styles.avatar} 
          />
          <Text style={styles.changeAvatarText}>Changer la photo</Text>
        </Pressable>

        {user && (
          <View style={styles.emailContainer}>
            <Text style={styles.emailLabel}>Email</Text>
            <Text style={styles.emailText}>{user.email}</Text>
          </View>
        )}
      </View>

      <View style={styles.nameSection}>
        <Text style={styles.inputLabel}>Nom</Text>
        <TextInput 
          value={name} 
          onChangeText={setName} 
          style={styles.input} 
          placeholder="Votre nom" 
        />
        <Pressable 
          style={styles.saveButton} 
          onPress={saveName}
        >
          <Text style={styles.saveButtonText}>Enregistrer le nom</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Statistiques</Text>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Photos :</Text>
          <Text style={styles.statValue}>{stats.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Jours couverts :</Text>
          <Text style={styles.statValue}>{stats.days}</Text>
        </View>
        {user && (
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Membre depuis :</Text>
            <Text style={styles.statValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 20, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  h1: { fontSize: 28, fontWeight: '800', color: '#1f2937' },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutButtonText: { color: 'white', fontWeight: '600', fontSize: 14 },
  userInfo: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e5e7eb' },
  changeAvatarText: { 
    textAlign: 'center', 
    marginTop: 12, 
    color: '#2563eb', 
    fontWeight: '600',
    fontSize: 16,
  },
  emailContainer: { marginTop: 16, alignItems: 'center' },
  emailLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  emailText: { fontSize: 16, color: '#374151', fontWeight: '600', marginTop: 4 },
  nameSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { 
    borderWidth: 1, 
    borderColor: '#d1d5db', 
    borderRadius: 12, 
    padding: 16, 
    backgroundColor: '#f9fafb',
    fontSize: 16,
  },
  saveButton: { 
    backgroundColor: '#2563eb', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  saveButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },
  card: { 
    backgroundColor: 'white',
    borderRadius: 16, 
    padding: 20, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  h2: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: '#1f2937' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: { fontSize: 16, color: '#6b7280' },
  statValue: { fontSize: 16, fontWeight: '600', color: '#374151' },
});