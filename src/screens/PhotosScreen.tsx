// src/screens/PhotosScreen.tsx - Version avec synchronisation
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  Alert,
  RefreshControl 
} from 'react-native';
import { JournalPhoto } from '../types';
import { useJournal } from '../context/JournalProvider';
import { PhotoRowWithSync } from '../Components/PhotoRowWithSync';
import { SyncStatusBar } from '../Components/SyncStatusBar';
import { SyncSettingsModal } from '../Components/SyncSettingsModal';
import { globalStyles, spacing, colors, borderRadius } from '../styles/globalStyles';

export default function PhotosScreen() {
  const { 
    photos, 
    removePhoto, 
    updatePhoto, 
    syncNow, 
    syncState,
    getSyncStatusText 
  } = useJournal();
  
  const [editing, setEditing] = useState<JournalPhoto | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const openEdit = (photo: JournalPhoto) => {
    setEditing(photo);
    setTitle(photo.title || '');
    setNote(photo.note || '');
  };

  const saveEdit = () => {
    if (!editing) return;
    updatePhoto(editing.id, { title, note });
    setEditing(null);
  };

  const confirmRemove = (id: string) => {
    Alert.alert(
      'Supprimer la photo', 
      'Cette photo sera supprimée de tous vos appareils lors de la prochaine synchronisation. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Supprimer', 
          style: 'destructive', 
          onPress: () => removePhoto(id) 
        }
      ]
    );
  };

  const handleRefresh = async () => {
    if (!syncState.isOnline) {
      Alert.alert('Hors ligne', 'Impossible de synchroniser sans connexion internet');
      return;
    }

    setRefreshing(true);
    try {
      const result = await syncNow();
      Alert.alert(
        'Synchronisation terminée',
        `${result.uploaded} envoyées, ${result.downloaded} reçues, ${result.conflicts} conflits`
      );
    } catch (error) {
      Alert.alert('Erreur', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConflictInfo = (photo: JournalPhoto) => {
    Alert.alert(
      'Conflit détecté',
      `Cette photo a été modifiée sur un autre appareil. Choisissez la version à conserver.`,
      [
        { text: 'Plus tard', style: 'cancel' },
        { 
          text: 'Résoudre', 
          onPress: () => {
            // Ici on pourrait ouvrir un modal de résolution de conflit
            console.log('Ouvrir résolution conflit pour:', photo.id);
          }
        }
      ]
    );
  };

  // Filtrer et trier les photos
  const sortedPhotos = photos
    .filter(photo => photo.syncStatus !== 'deleted') // Ne pas afficher les photos supprimées
    .sort((a, b) => {
      // Prioriser les conflits, puis les photos en attente, puis par date
      if (a.syncStatus === 'conflict' && b.syncStatus !== 'conflict') return -1;
      if (b.syncStatus === 'conflict' && a.syncStatus !== 'conflict') return 1;
      if (a.syncStatus === 'pending' && b.syncStatus === 'synced') return -1;
      if (b.syncStatus === 'pending' && a.syncStatus === 'synced') return 1;
      return b.timestamp - a.timestamp;
    });

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={globalStyles.h1}>Photos ({photos.length})</Text>
      <View style={styles.headerActions}>
        <Pressable 
          style={styles.headerButton}
          onPress={() => setShowSyncSettings(true)}
        >
          <Text style={styles.headerButtonText}>⚙️</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderSyncSummary = () => {
    const pendingCount = photos.filter(p => p.syncStatus === 'pending').length;
    const conflictCount = photos.filter(p => p.syncStatus === 'conflict').length;
    
    if (pendingCount === 0 && conflictCount === 0) return null;

    return (
      <View style={styles.syncSummary}>
        {pendingCount > 0 && (
          <Text style={styles.syncSummaryText}>
            ⏳ {pendingCount} photo{pendingCount > 1 ? 's' : ''} en attente de synchronisation
          </Text>
        )}
        {conflictCount > 0 && (
          <Text style={[styles.syncSummaryText, { color: colors.danger }]}>
            ⚠️ {conflictCount} conflit{conflictCount > 1 ? 's' : ''} à résoudre
          </Text>
        )}
      </View>
    );
  };

  const renderPhoto = ({ item: photo }: { item: JournalPhoto }) => (
    <View>
      <PhotoRowWithSync
        photo={photo}
        onPress={() => openEdit(photo)}
        onResolveConflict={() => handleConflictInfo(photo)}
      />
      <View style={styles.photoActions}>
        <Pressable 
          style={styles.actionButton} 
          onPress={() => openEdit(photo)}
        >
          <Text style={styles.actionButtonText}>✏️ Éditer</Text>
        </Pressable>
        <Pressable 
          style={[styles.actionButton, { backgroundColor: colors.danger }]} 
          onPress={() => confirmRemove(photo.id)}
        >
          <Text style={styles.actionButtonText}>🗑️ Supprimer</Text>
        </Pressable>
        {photo.syncStatus === 'conflict' && (
          <Pressable 
            style={[styles.actionButton, { backgroundColor: '#f59e0b' }]} 
            onPress={() => handleConflictInfo(photo)}
          >
            <Text style={styles.actionButtonText}>⚠️ Conflit</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <View style={globalStyles.container}>
      <SyncStatusBar />
      
      <FlatList
        data={sortedPhotos}
        keyExtractor={(item) => item.id}
        renderItem={renderPhoto}
        ListHeaderComponent={
          <View>
            {renderHeader()}
            {renderSyncSummary()}
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            title="Tirer pour synchroniser"
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📷</Text>
            <Text style={styles.emptyStateTitle}>Aucune photo</Text>
            <Text style={styles.emptyStateText}>
              Prenez votre première photo avec l'onglet Caméra
            </Text>
          </View>
        }
      />

      {/* Modal d'édition */}
      {editing && (
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <Text style={globalStyles.h2}>Éditer la photo</Text>
            <View style={styles.editorSyncInfo}>
              <Text style={styles.syncStatusText}>
                {getSyncStatusText(editing.syncStatus)}
              </Text>
            </View>
          </View>
          
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Titre</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={globalStyles.input}
              placeholder="Titre de la photo"
            />
          </View>
          
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Note</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              style={[globalStyles.input, styles.noteInput]}
              placeholder="Ajouter une note..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {editing.syncStatus === 'conflict' && (
            <View style={styles.conflictWarning}>
              <Text style={styles.conflictWarningIcon}>⚠️</Text>
              <Text style={styles.conflictWarningText}>
                Cette photo est en conflit. Vos modifications seront marquées comme version locale.
              </Text>
            </View>
          )}

          <View style={styles.editorActions}>
            <Pressable 
              style={[globalStyles.button, { backgroundColor: colors.gray }]} 
              onPress={() => setEditing(null)}
            >
              <Text style={globalStyles.buttonText}>Annuler</Text>
            </Pressable>
            <Pressable 
              style={[globalStyles.button, { backgroundColor: colors.success, flex: 1, marginLeft: spacing.s }]} 
              onPress={saveEdit}
            >
              <Text style={globalStyles.buttonText}>Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Modal des paramètres de sync */}
      <SyncSettingsModal
        visible={showSyncSettings}
        onClose={() => setShowSyncSettings(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
    backgroundColor: colors.white,
    borderRadius: borderRadius.l,
    marginBottom: spacing.s,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 18,
  },
  syncSummary: {
    backgroundColor: colors.white,
    padding: spacing.m,
    borderRadius: borderRadius.l,
    marginBottom: spacing.s,
  },
  syncSummaryText: {
    fontSize: 14,
    color: colors.dark,
    marginBottom: spacing.xs,
  },
  separator: {
    height: 1,
    backgroundColor: colors.lightGray,
    marginHorizontal: spacing.m,
  },
  photoActions: {
    flexDirection: 'row',
    gap: spacing.s,
    paddingHorizontal: spacing.m,
    paddingBottom: spacing.m,
    backgroundColor: colors.white,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.s,
  },
  actionButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.l,
    margin: spacing.m,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: spacing.m,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.s,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
  editor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.l,
    borderTopRightRadius: borderRadius.l,
    padding: spacing.m,
    elevation: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxHeight: '70%',
  },
  editorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.m,
  },
  editorSyncInfo: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.s,
    backgroundColor: colors.lightGray,
  },
  syncStatusText: {
    fontSize: 12,
    color: colors.gray,
    fontWeight: '500',
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: spacing.s,
    borderRadius: borderRadius.s,
    marginBottom: spacing.m,
  },
  conflictWarningIcon: {
    fontSize: 16,
    marginRight: spacing.s,
  },
  conflictWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  editorActions: {
    flexDirection: 'row',
    gap: spacing.s,
    marginTop: spacing.m,
  },
});