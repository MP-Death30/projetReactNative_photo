import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, Image, Pressable, Alert, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useJournal } from '../context/JournalProvider';
import { useAuth } from '../context/AuthProvider';
import DefaultAvatar from '../../assets/default-avatar.png';
import { globalStyles, spacing, borderRadius, colors, typography } from '../styles/globalStyles';

export default function ProfileScreen() {
  const { photos, profile, setProfile } = useJournal();
  const { user, logout, updateProfile } = useAuth();
  const [name, setName] = useState(profile.name);

  useEffect(() => setName(profile.name), [profile.name]);

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
      aspect: [1, 1],
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;

    const newAvatarUri = res.assets[0].uri;
    setProfile({ ...profile, avatarUri: newAvatarUri });

    try { await updateProfile({ avatarUri: newAvatarUri }); } 
    catch { Alert.alert('Erreur', 'Impossible de mettre à jour la photo de profil'); }
  };

  const saveName = async () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Le nom ne peut pas être vide'); return; }
    setProfile({ ...profile, name: name.trim() });

    try { await updateProfile({ name: name.trim() }); Alert.alert('Succès', 'Nom mis à jour !'); } 
    catch { Alert.alert('Erreur', 'Impossible de mettre à jour le nom'); }
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: async () => { try { await logout(); } catch { Alert.alert('Erreur', 'Impossible de se déconnecter'); } } },
    ]);
  };

  return (
    <ScrollView style={globalStyles.container}>
      <View style={[globalStyles.card, styles.header]}>
        <Text style={typography.h1}>Profil</Text>
        <Pressable style={[styles.logoutButton]} onPress={handleLogout}>
          <Text style={{ color: colors.white, fontWeight: '600' }}>Se déconnecter</Text>
        </Pressable>
      </View>

      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Pressable onPress={changeAvatar} style={{ alignSelf: 'center' }}>
          <Image source={profile.avatarUri ? { uri: profile.avatarUri } : DefaultAvatar} style={styles.avatar} />
          <Text style={{ textAlign: 'center', marginTop: spacing.s, color: colors.primary, fontWeight: '600' }}>Changer la photo</Text>
        </Pressable>

        {user && (
          <View style={{ marginTop: spacing.m, alignItems: 'center' }}>
            <Text style={{ fontSize: 14, color: colors.gray, fontWeight: '500' }}>Email</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', marginTop: 4 }}>{user.email}</Text>
          </View>
        )}
      </View>

      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: colors.dark, marginBottom: spacing.s }}>Nom</Text>
        <TextInput value={name} onChangeText={setName} style={globalStyles.input} placeholder="Votre nom" />
        <Pressable style={[globalStyles.button, { marginTop: spacing.s }]} onPress={saveName}>
          <Text style={globalStyles.buttonText}>Enregistrer le nom</Text>
        </Pressable>
      </View>

      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Text style={typography.h2}>Statistiques</Text>
        <View style={styles.statRow}><Text>Photos :</Text><Text>{stats.total}</Text></View>
        <View style={styles.statRow}><Text>Jours couverts :</Text><Text>{stats.days}</Text></View>
        {user && (
          <View style={styles.statRow}><Text>Membre depuis :</Text><Text>{new Date(user.createdAt).toLocaleDateString()}</Text></View>
        )}
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.m, // espace entre header et premier bloc
  },
  cardSpacing: {
    marginBottom: spacing.m, // espace identique entre tous les blocs
  },
  logoutButton: { 
    backgroundColor: colors.danger, 
    paddingHorizontal: spacing.m, 
    paddingVertical: spacing.s, 
    borderRadius: borderRadius.m 
  },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e5e7eb' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.s },
});