// src/Components/SyncStatusBar.tsx
import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useJournal } from '../context/JournalProvider';
import { colors, spacing } from '../styles/globalStyles';

export function SyncStatusBar() {
  const { syncState, syncNow } = useJournal();
  
  const getStatusColor = () => {
    if (syncState.isSyncing) return colors.primary;
    if (!syncState.isOnline) return colors.danger;
    if (syncState.pendingCount > 0) return '#f59e0b'; // Orange
    if (syncState.conflictCount > 0) return colors.danger;
    return colors.success;
  };

  const getStatusText = () => {
    if (syncState.isSyncing) return syncState.syncProgress;
    if (!syncState.isOnline) return 'Hors ligne';
    if (syncState.conflictCount > 0) return `${syncState.conflictCount} conflit(s)`;
    if (syncState.pendingCount > 0) return `${syncState.pendingCount} en attente`;
    if (syncState.lastSync) return `Dernière sync: ${syncState.lastSync.toLocaleTimeString()}`;
    return 'Prêt à synchroniser';
  };

  const handleSyncPress = async () => {
    if (syncState.isSyncing || !syncState.isOnline) return;
    
    try {
      await syncNow();
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getStatusColor() }]}>
      <View style={styles.content}>
        <View style={styles.statusInfo}>
          {syncState.isSyncing ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.statusIcon}>
              {syncState.isOnline ? '🌐' : '📴'}
            </Text>
          )}
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
        
        {!syncState.isSyncing && syncState.isOnline && (
          <Pressable 
            style={styles.syncButton} 
            onPress={handleSyncPress}
          >
            <Text style={styles.syncButtonText}>🔄</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.s,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 16,
    marginRight: spacing.s,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    padding: spacing.s,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  syncButtonText: {
    fontSize: 18,
  },
});