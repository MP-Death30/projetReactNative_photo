// src/screens/ProfileScreen.tsx - Version avec synchronisation
import React, { useMemo, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Image, 
  Pressable, 
  Alert, 
  ScrollView, 
  StyleSheet,
  Switch 
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useJournal } from '../context/JournalProvider';
import { useAuth } from '../context/AuthProvider';
import { SyncStatusBar } from '../Components/SyncStatusBar';
import { SyncSettingsModal } from '../Components/SyncSettingsModal';
import DefaultAvatar from '../../assets/default-avatar.png';
import { globalStyles, spacing, borderRadius, colors, typography } from '../styles/globalStyles';

export default function ProfileScreen() {
  const { 
    photos, 
    profile, 
    setProfile,
    syncState,
    syncNow,
    getSyncStatusText,
  } = useJournal();
  const { user, logout, updateProfile } = useAuth();
  
  const [name, setName] = useState(profile.name);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  useEffect(() => setName(profile.name), [profile.name]);

  // Statistiques des photos
  const photoStats = useMemo(() => {
    const total = photos.length;
    const days = new Set(photos.map(p => p.dateISO)).size;
    const synced = photos.filter(p => p.syncStatus === 'synced').length;
    const pending = photos.filter(p => p.syncStatus === 'pending').length;
    const conflicts = photos.filter(p => p.syncStatus === 'conflict').length;
    const errors = photos.filter(p => p.syncStatus === 'error').length;
    
    return { total, days, synced, pending, conflicts, errors };
  }, [photos]);

  // Statistiques de sync
  const syncStats = useMemo(() => {
    const totalItems = photoStats.total + 1; // +1 pour le profil
    const syncedItems = photoStats.synced + (profile.syncStatus === 'synced' ? 1 : 0);
    const syncPercentage = totalItems > 0 ? Math.round((syncedItems / totalItems) * 100) : 100;
    
    return {
      syncPercentage,
      totalItems,
      syncedItems,
      isFullySynced: syncPercentage === 100 && photoStats.conflicts === 0,
    };
  }, [photoStats, profile.syncStatus]);

  const changeAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission requise', 'Autorisez l\'accès à la galerie pour changer votre photo de profil');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: true,
      aspect: [1, 1],
    });
    
    if (result.canceled || !result.assets?.[0]?.uri) return;

    const newAvatarUri = result.assets[0].uri;
    setProfile({ avatarUri: newAvatarUri });

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
    
    setProfile({ name: name.trim() });

    try {
      await updateProfile({ name: name.trim() });
      Alert.alert('✅ Succès', 'Nom mis à jour et marqué pour synchronisation !');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le nom');
    }
  };

  const handleManualSync = async () => {
    if (!syncState.isOnline) {
      Alert.alert('Hors ligne', 'Connexion internet requise pour synchroniser');
      return;
    }

    try {
      const result = await syncNow();
      Alert.alert(
        'Synchronisation terminée',
        `✅ ${result.uploaded} éléments envoyés\n` +
        `📥 ${result.downloaded} éléments reçus\n` +
        `⚠️ ${result.conflicts} conflits détectés\n` +
        `⏱️ Durée: ${Math.round(result.duration / 1000)}s`
      );
    } catch (error) {
      Alert.alert('Erreur de synchronisation', error.message);
    }
  };

  const handleLogout = () => {
    const pendingCount = photoStats.pending + (profile.syncStatus === 'pending' ? 1 : 0);
    
    let message = 'Êtes-vous sûr de vouloir vous déconnecter ?';
    if (pendingCount > 0) {
      message += `\n\n⚠️ Attention: ${pendingCount} élément${pendingCount > 1 ? 's' : ''} non synchronisé${pendingCount > 1 ? 's' : ''} ${pendingCount > 1 ? 'seront' : 'sera'} ${pendingCount > 1 ? 'perdus' : 'perdu'}.`;
    }
    
    Alert.alert('Déconnexion', message, [
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
    ]);
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'synced': return colors.success;
      case 'pending': return '#f59e0b';
      case 'conflict': return colors.danger;
      case 'error': return colors.danger;
      default: return colors.gray;
    }
  };

  return (
    <ScrollView style={globalStyles.container}>
      <SyncStatusBar />

      {/* En-tête avec bouton de déconnexion */}
      <View style={[globalStyles.card, styles.header]}>
        <Text style={typography.h1}>Profil</Text>
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </Pressable>
      </View>

      {/* Photo de profil et informations utilisateur */}
      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Pressable onPress={changeAvatar} style={styles.avatarContainer}>
          <Image 
            source={profile.avatarUri ? { uri: profile.avatarUri } : DefaultAvatar} 
            style={styles.avatar} 
          />
          <Text style={styles.changePhotoText}>Changer la photo</Text>
          <View style={[styles.syncIndicator, { backgroundColor: getSyncStatusColor(profile.syncStatus) }]}>
            <Text style={styles.syncIndicatorText}>
              {profile.syncStatus === 'synced' ? '✓' : '⏳'}
            </Text>
          </View>
        </Pressable>

        {user && (
          <View style={styles.userInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Profil</Text>
              <Text style={[styles.infoValue, { color: getSyncStatusColor(profile.syncStatus) }]}>
                {getSyncStatusText(profile.syncStatus)}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Édition du nom */}
      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        <View style={globalStyles.inputGroup}>
          <Text style={globalStyles.label}>Nom</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={globalStyles.input}
            placeholder="Votre nom"
          />
        </View>
        <Pressable 
          style={[globalStyles.button, { marginTop: spacing.s }]} 
          onPress={saveName}
        >
          <Text style={globalStyles.buttonText}>Enregistrer le nom</Text>
        </Pressable>
      </View>

      {/* Statistiques de synchronisation */}
      <View style={[globalStyles.card, styles.cardSpacing]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>État de synchronisation</Text>
          <View style={[styles.syncBadge, { 
            backgroundColor: syncStats.isFullySynced ? colors.success : '#f59e0b' 
          }]}>
            <Text style={styles.syncBadgeText}>
              {syncStats.syncPercentage}% sync
            </Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{syncStats.syncedItems}/{syncStats.totalItems}</Text>
            <Text style={styles.statLabel}>Synchronisés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: photoStats.pending > 0 ? '#f59e0b' : colors.gray }]}>
              {photoStats.pending}
            </Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: photoStats.conflicts > 0 ? colors.danger : colors.gray }]}>
              {photoStats.conflicts}
            </Text>
            <Text style={styles.statLabel}>Conflits</Text>
          </View>
        </View>

        {syncState.lastSync && (
          <Text style={styles.lastSyncText}>
            Dernière sync: {syncState.lastSync.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Actions de synchronisation */}
      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Text style={styles.sectionTitle}>Synchronisation</Text>
        
        <Pressable
          style={[globalStyles.button, { 
            backgroundColor: syncState.isSyncing ? colors.gray : colors.primary,
            marginBottom: spacing.s 
          }]}
          onPress={handleManualSync}
          disabled={syncState.isSyncing || !syncState.isOnline}
        >
          <Text style={globalStyles.buttonText}>
            {syncState.isSyncing ? 'Synchronisation...' : '🔄 Synchroniser maintenant'}
          </Text>
        </Pressable>

        <Pressable
          style={[globalStyles.button, { backgroundColor: colors.dark }]}
          onPress={() => setShowSyncSettings(true)}
        >
          <Text style={globalStyles.buttonText}>⚙️ Paramètres de sync</Text>
        </Pressable>

        {!syncState.isOnline && (
          <View style={styles.offlineWarning}>
            <Text style={styles.offlineWarningText}>
              📴 Hors ligne - La synchronisation se fera automatiquement lors de la reconnexion
            </Text>
          </View>
        )}
      </View>

      {/* Statistiques générales */}
      <View style={[globalStyles.card, styles.cardSpacing]}>
        <Text style={styles.sectionTitle}>Statistiques du journal</Text>
        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Photos totales :</Text>
          <Text style={styles.statRowValue}>{photoStats.total}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statRowLabel}>Jours couverts :</Text>
          <Text style={styles.statRowValue}>{photoStats.days}</Text>
        </View>
        {user && (
          <View style={styles.statRow}>
            <Text style={styles.statRowLabel}>Membre depuis :</Text>
            <Text style={styles.statRowValue}>
              {new Date(user.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Modal des paramètres de sync */}
      <SyncSettingsModal
        visible={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.m,
  },
  cardSpacing: {
    marginBottom: spacing.m,
  },
  logoutButton: { 
    backgroundColor: colors.danger, 
    paddingHorizontal: spacing.m, 
    paddingVertical: spacing.s, 
    borderRadius: borderRadius.m 
  },
  logoutButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  avatarContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  avatar: { 
    width: 120, 
    height: 120, 
    borderRadius: 60, 
    backgroundColor: colors.lightGray 
  },
  changePhotoText: {
    textAlign: 'center',
    marginTop: spacing.s,
    color: colors.primary,
    fontWeight: '600',
  },
  syncIndicator: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  syncIndicatorText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  userInfo: {
    marginTop: spacing.l,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.s,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  syncBadge: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.s,
  },
  syncBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.m,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.dark,
  },
  statLabel: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  lastSyncText: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineWarning: {
    backgroundColor: '#fef3c7',
    padding: spacing.s,
    borderRadius: borderRadius.s,
    marginTop: spacing.s,
  },
  offlineWarningText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  statRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: spacing.s 
  },
  statRowLabel: {
    color: colors.gray,
  },
  statRowValue: {
    fontWeight: '600',
    color: colors.dark,
  },
});