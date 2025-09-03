// src/Components/SyncSettingsModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Switch,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useJournal } from '../context/JournalProvider';
import { colors, spacing, borderRadius, globalStyles } from '../styles/globalStyles';

interface SyncSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SyncSettingsModal({ visible, onClose }: SyncSettingsModalProps) {
  const { syncState, enableAutoSync, syncNow } = useJournal();
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [wifiOnlySync, setWifiOnlySync] = useState(false);

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    enableAutoSync(enabled);
  };

  const handleForceSyncPress = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Erreur sync forcée:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={globalStyles.h1}>Paramètres de sync</Text>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {/* État de la sync */}
          <View style={globalStyles.card}>
            <Text style={styles.sectionTitle}>État actuel</Text>
            <View style={styles.statRow}>
              <Text>Connexion :</Text>
              <Text style={[styles.statValue, { 
                color: syncState.isOnline ? colors.success : colors.danger 
              }]}>
                {syncState.isOnline ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text>En attente :</Text>
              <Text style={styles.statValue}>{syncState.pendingCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text>Conflits :</Text>
              <Text style={[styles.statValue, { 
                color: syncState.conflictCount > 0 ? colors.danger : colors.gray 
              }]}>
                {syncState.conflictCount}
              </Text>
            </View>
            {syncState.lastSync && (
              <View style={styles.statRow}>
                <Text>Dernière sync :</Text>
                <Text style={styles.statValue}>
                  {syncState.lastSync.toLocaleString()}
                </Text>
              </View>
            )}
          </View>

          {/* Paramètres */}
          <View style={globalStyles.card}>
            <Text style={styles.sectionTitle}>Paramètres</Text>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Synchronisation automatique</Text>
              <Switch
                value={autoSyncEnabled}
                onValueChange={handleAutoSyncToggle}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
              />
            </View>
            
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Wi-Fi uniquement</Text>
              <Switch
                value={wifiOnlySync}
                onValueChange={setWifiOnlySync}
                trackColor={{ false: colors.lightGray, true: colors.primary }}
              />
            </View>
          </View>

          {/* Actions */}
          <View style={globalStyles.card}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            <Pressable
              style={[globalStyles.button, { 
                backgroundColor: syncState.isSyncing ? colors.gray : colors.primary,
                marginBottom: spacing.s 
              }]}
              onPress={handleForceSyncPress}
              disabled={syncState.isSyncing || !syncState.isOnline}
            >
              <Text style={globalStyles.buttonText}>
                {syncState.isSyncing ? 'Synchronisation...' : 'Forcer la synchronisation'}
              </Text>
            </Pressable>
            
            <Text style={styles.helpText}>
              La synchronisation force l'envoi de tous les changements en attente 
              et récupère les dernières données du serveur.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.lightGray,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.dark,
  },
  content: {
    flex: 1,
    padding: spacing.m,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.dark,
    marginBottom: spacing.m,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.s,
  },
  statValue: {
    fontWeight: '600',
    color: colors.dark,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.m,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.dark,
  },
  helpText: {
    fontSize: 14,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 20,
  },
});