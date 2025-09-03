// src/context/JournalProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { JournalPhoto, ProfileState, SyncResult, SyncStatus } from '../types';
import { loadAll, saveAll, loadProfile, saveProfile, migrateDataToUser } from '../storage';
import { useAuth } from './AuthProvider';
import { saveImageToLocal } from '../fileManager';
import { createJournalPhoto, createInitialProfile } from '../types';
import { FirebaseSyncService } from '../services/firebaseSyncService';
import NetInfo from '@react-native-community/netinfo';


type SyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncProgress: string;
  pendingCount: number;
  conflictCount: number;
};

type JournalContextType = {
  photos: JournalPhoto[];
  profile: ProfileState;
  isLoading: boolean;

  addPhoto: (p: Omit<JournalPhoto, 'id' | 'version' | 'lastModified' | 'syncStatus'>) => Promise<void>;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, patch: Partial<JournalPhoto>) => void;
  setProfile: (p: Partial<ProfileState>) => void;

  syncState: SyncState;
  syncNow: () => Promise<SyncResult>;
  enableAutoSync: (enabled: boolean) => void;
  enableRealTimeSync: (enabled: boolean) => void;
  resolveConflict: (photoId: string, resolution: 'keepLocal' | 'keepServer') => Promise<void>;

  getSyncIcon: (photo: JournalPhoto) => string;
  getSyncStatusText: (status: SyncStatus) => string;
};

const JournalContext = createContext<JournalContextType | null>(null);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal must be used within JournalProvider');
  return context;
};

export default function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();

  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [profile, setProfileState] = useState<ProfileState>(createInitialProfile());
  const [isLoading, setIsLoading] = useState(false);

  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    syncProgress: '',
    pendingCount: 0,
    conflictCount: 0,
  });

  const [firebaseSyncService, setFirebaseSyncService] = useState<FirebaseSyncService | null>(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [realtimeSyncEnabled, setRealtimeSyncEnabled] = useState(false);

  // Suivi réseau
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    setSyncState(prev => ({ ...prev, isOnline: !!state.isConnected }));
  });

  // Vérif initial
  NetInfo.fetch().then(state => {
    setSyncState(prev => ({ ...prev, isOnline: !!state.isConnected }));
  });

  return () => unsubscribe();
}, []);


  // Initialisation Firebase
  useEffect(() => {
    if (isAuthenticated && user) {
      const service = new FirebaseSyncService({ userId: user.id });
      setFirebaseSyncService(service);
      enableAutoSync(true);
    } else {
      setFirebaseSyncService(null);
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      setAutoSyncInterval(null);
    }
  }, [user, isAuthenticated]);

  // Charger données locales
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      Promise.all([loadAll(user.id), loadProfile(user.id)]).then(([userPhotos, userProfile]) => {
        setPhotos(userPhotos.map(p => ({ syncStatus: 'synced', ...p })));
        setProfileState({ syncStatus: 'synced', ...userProfile });
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
      migrateDataToUser(user.id).catch(console.error);
    } else {
      setPhotos([]);
      setProfileState(createInitialProfile());
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Sauvegarde automatique
  useEffect(() => {
    if (isAuthenticated && user) saveAll(user.id, photos);
  }, [photos, user, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) saveProfile(user.id, profile);
  }, [profile, user, isAuthenticated]);

  const updateSyncStats = useCallback((currentPhotos: JournalPhoto[], currentProfile: ProfileState) => {
    const pendingPhotos = currentPhotos.filter(p => p.syncStatus === 'pending' || p.syncStatus === 'error').length;
    const conflictPhotos = currentPhotos.filter(p => p.syncStatus === 'conflict').length;
    const profilePending = currentProfile.syncStatus === 'pending' || currentProfile.syncStatus === 'error';
    setSyncState(prev => ({
      ...prev,
      pendingCount: pendingPhotos + (profilePending ? 1 : 0),
      conflictCount: conflictPhotos,
    }));
  }, []);

  // Fonctions add/update/remove photo
  const addPhoto = useCallback(async (photoData: Omit<JournalPhoto, 'id' | 'version' | 'lastModified' | 'syncStatus'>) => {
    if (!isAuthenticated || !user) return;
    const localPath = await saveImageToLocal(photoData.uri);
    if (!localPath) return;
    const newPhoto: JournalPhoto = { ...createJournalPhoto(localPath, photoData.locationName), ...photoData, syncStatus: 'pending' };
    setPhotos(prev => [newPhoto, ...prev]);
  }, [isAuthenticated, user]);

  const removePhoto = useCallback(async (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePhoto = useCallback((id: string, patch: Partial<JournalPhoto>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...patch, syncStatus: 'pending' } : p));
  }, []);

  const setProfile = useCallback((profileUpdates: Partial<ProfileState>) => {
    setProfileState(prev => ({ ...prev, ...profileUpdates, syncStatus: 'pending' }));
  }, []);

  // Sync manuelle (optionnel)
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!firebaseSyncService) throw new Error('Service Firebase non disponible');
    setSyncState(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await firebaseSyncService.syncPhotos();
      const syncedProfile = await firebaseSyncService.syncProfile();
      setProfileState(syncedProfile);
      const updatedPhotos = await loadAll(user!.id);
      setPhotos(updatedPhotos);
      setSyncState(prev => ({ ...prev, isSyncing: false, lastSync: new Date() }));
      return result;
    } catch (error: any) {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      throw error;
    }
  }, [firebaseSyncService, user]);

  // Auto sync
  const enableAutoSync = useCallback((enabled: boolean) => {
    if (!enabled && autoSyncInterval) {
      clearInterval(autoSyncInterval);
      setAutoSyncInterval(null);
    } else if (enabled && !autoSyncInterval) {
      const interval = setInterval(() => {
        if (!syncState.isSyncing) syncNow().catch(console.error);
      }, 15 * 60 * 1000);
      setAutoSyncInterval(interval);
    }
  }, [autoSyncInterval, syncNow, syncState.isSyncing]);

  const enableRealTimeSync = useCallback((enabled: boolean) => {
    setRealtimeSyncEnabled(enabled);
    // TODO: implémenter Firestore real-time listeners
  }, []);

  const resolveConflict = useCallback(async (photoId: string, resolution: 'keepLocal' | 'keepServer') => {
    if (!firebaseSyncService) return;
    // TODO: appliquer résolution
    const updatedPhotos = await loadAll(user!.id);
    setPhotos(updatedPhotos);
  }, [firebaseSyncService, user]);

  const getSyncIcon = useCallback((photo: JournalPhoto) => {
    switch (photo.syncStatus) {
      case 'synced': return '✅';
      case 'pending': return '⏳';
      case 'error': return '❌';
      case 'conflict': return '⚠️';
      default: return '';
    }
  }, []);

  const getSyncStatusText = useCallback((status: SyncStatus) => {
    switch (status) {
      case 'synced': return 'Synchronisé';
      case 'pending': return 'En attente';
      case 'error': return 'Erreur';
      case 'conflict': return 'Conflit';
      default: return '';
    }
  }, []);

  // Mise à jour stats à chaque changement
  useEffect(() => updateSyncStats(photos, profile), [photos, profile, updateSyncStats]);

  return (
    <JournalContext.Provider value={{
      photos, profile, isLoading,
      addPhoto, removePhoto, updatePhoto, setProfile,
      syncState, syncNow, enableAutoSync, enableRealTimeSync, resolveConflict,
      getSyncIcon, getSyncStatusText,
    }}>
      {children}
    </JournalContext.Provider>
  );
}
