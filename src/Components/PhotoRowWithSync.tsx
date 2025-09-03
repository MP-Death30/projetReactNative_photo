// src/Components/PhotoRowWithSync.tsx
import React from 'react';
import { View, Image, Text, Pressable, StyleSheet } from 'react-native';
import type { JournalPhoto } from '../types';
import { useJournal } from '../context/JournalProvider';
import { colors, spacing, borderRadius } from '../styles/globalStyles';

interface PhotoRowWithSyncProps {
  photo: JournalPhoto;
  onPress?: () => void;
  onResolveConflict?: () => void;
}

export function PhotoRowWithSync({ photo, onPress, onResolveConflict }: PhotoRowWithSyncProps) {
  const { getSyncIcon, getSyncStatusText, resolveConflict } = useJournal();

  const handleConflictResolve = () => {
    if (onResolveConflict) {
      onResolveConflict();
    }
  };

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <Image source={{ uri: photo.uri }} style={styles.thumbnail} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{photo.title || 'Sans titre'}</Text>
          <View style={styles.syncIndicator}>
            <Text style={styles.syncIcon}>{getSyncIcon(photo)}</Text>
          </View>
        </View>
        
        <Text style={styles.subtitle}>
          {new Date(photo.timestamp).toLocaleString()}
          {photo.locationName ? ` — ${photo.locationName}` : ''}
        </Text>
        
        <Text style={[styles.syncStatus, { 
          color: photo.syncStatus === 'conflict' ? colors.danger : colors.gray 
        }]}>
          {getSyncStatusText(photo.syncStatus)}
        </Text>
        
        {photo.syncStatus === 'conflict' && (
          <View style={styles.conflictActions}>
            <Pressable 
              style={[styles.conflictButton, { backgroundColor: colors.primary }]}
              onPress={() => resolveConflict(photo.id, 'keepLocal')}
            >
              <Text style={styles.conflictButtonText}>Garder local</Text>
            </Pressable>
            <Pressable 
              style={[styles.conflictButton, { backgroundColor: colors.success }]}
              onPress={() => resolveConflict(photo.id, 'keepServer')}
            >
              <Text style={styles.conflictButtonText}>Garder serveur</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.m,
    backgroundColor: colors.white,
    marginBottom: 1,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.m,
    backgroundColor: colors.lightGray,
  },
  content: {
    flex: 1,
    marginLeft: spacing.m,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.dark,
    flex: 1,
  },
  syncIndicator: {
    marginLeft: spacing.s,
  },
  syncIcon: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 2,
  },
  syncStatus: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  conflictActions: {
    flexDirection: 'row',
    marginTop: spacing.s,
    gap: spacing.s,
  },
  conflictButton: {
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: borderRadius.s,
  },
  conflictButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
});