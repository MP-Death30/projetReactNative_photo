// src/Components/PhotoRowWithFirebase.tsx
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { JournalPhoto } from '../types';
import { useJournal } from '../context/JournalProvider';
import { colors, spacing, borderRadius } from '../styles/globalStyles';

interface PhotoRowWithFirebaseProps {
  photo: JournalPhoto;
  onPress?: () => void;
  onResolveConflict?: () => void;
}

export function PhotoRowWithFirebase({ photo, onPress, onResolveConflict }: PhotoRowWithFirebaseProps) {
  const { getSyncIcon, getSyncStatusText } = useJournal();

  const getSyncStatusColor = () => {
    switch (photo.syncStatus) {
      case 'synced': return colors.success;
      case 'pending': return '#f59e0b'; // Orange
      case 'uploading': return colors.primary;
      case 'downloading': return colors.primary;
      case 'conflict': return colors.danger;
      case 'error': return colors.danger;
      default: return colors.gray;
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isCloudImage = (uri: string) => {
    return uri.startsWith('http') || uri.startsWith('https');
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <View style={styles.content}>
        {/* Image avec indicateur de source */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: photo.uri }} style={styles.image} />
          <View style={[styles.sourceIndicator, { 
            backgroundColor: isCloudImage(photo.uri) ? colors.primary : colors.gray 
          }]}>
            <Text style={styles.sourceIcon}>
              {isCloudImage(photo.uri) ? '☁️' : '📱'}
            </Text>
          </View>
        </View>

        {/* Informations principales */}
        <View style={styles.info}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {photo.title || 'Photo sans titre'}
            </Text>
            <View style={styles.syncInfo}>
              <View style={[styles.syncBadge, { backgroundColor: getSyncStatusColor() }]}>
                <Text style={styles.syncIcon}>{getSyncIcon(photo)}</Text>
              </View>
            </View>
          </View>

          {/* Localisation et date */}
          <View style={styles.details}>
            <Text style={styles.location}>
              📍 {photo.locationName || 'Lieu inconnu'}
            </Text>
            <Text style={styles.date}>
              🕒 {formatDate(photo.timestamp)}
            </Text>
          </View>

          {/* Note */}
          {photo.note && (
            <Text style={styles.note} numberOfLines={2}>
              {photo.note}
            </Text>
          )}

          {/* Statut de synchronisation détaillé */}
          <View style={styles.syncDetails}>
            <Text style={[styles.syncStatus, { color: getSyncStatusColor() }]}>
              {getSyncStatusText(photo.syncStatus)}
            </Text>
            
            {photo.syncStatus === 'pending' && (
              <Text style={styles.syncNote}>
                • En attente d'envoi vers Firebase
              </Text>
            )}
            
            {photo.syncStatus === 'conflict' && (
              <Pressable style={styles.conflictButton} onPress={onResolveConflict}>
                <Text style={styles.conflictButtonText}>Résoudre le conflit</Text>
              </Pressable>
            )}
            
            {photo.syncStatus === 'error' && (
              <Text style={styles.syncNote}>
                • Erreur de synchronisation - Retry automatique
              </Text>
            )}
          </View>

          {/* Métadonnées techniques (mode debug) */}
          {__DEV__ && (
            <View style={styles.debugInfo}>
              <Text style={styles.debugText}>ID: {photo.id}</Text>
              <Text style={styles.debugText}>Version: {photo.version}</Text>
              {photo.serverId && (
                <Text style={styles.debugText}>Server ID: {photo.serverId}</Text>
              )}
              <Text style={styles.debugText}>
                Modifié: {new Date(photo.lastModified).toLocaleTimeString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.m,
    marginVertical: spacing.s,
    borderRadius: borderRadius.l,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    padding: spacing.m,
  },
  imageContainer: {
    position: 'relative',
    marginRight: spacing.m,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.m,
    backgroundColor: colors.lightGray,
  },
  sourceIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sourceIcon: {
    fontSize: 10,
  },
  info: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
    marginRight: spacing.s,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncIcon: {
    fontSize: 12,
    color: colors.white,
  },
  details: {
    marginBottom: spacing.s,
  },
  location: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 2,
  },
  date: {
    fontSize: 14,
    color: colors.gray,
  },
  note: {
    fontSize: 14,
    color: colors.dark,
    fontStyle: 'italic',
    marginBottom: spacing.s,
    lineHeight: 18,
  },
  syncDetails: {
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.lightGray,
  },
  syncStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  syncNote: {
    fontSize: 11,
    color: colors.gray,
    fontStyle: 'italic',
  },
  conflictButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.s,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  conflictButtonText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  debugInfo: {
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  debugText: {
    fontSize: 10,
    color: '#6b7280',
    fontFamily: 'monospace',
  },
});