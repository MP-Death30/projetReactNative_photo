// src/context/JournalProvider.tsx - Version avec synchronisation
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { JournalPhoto, ProfileState, SyncResult, SyncStatus } from '../types';
import { loadAll, saveAll, loadProfile, saveProfile, migrateDataToUser } from '../storage';
import { useAuth } from './AuthProvider';
import { saveImageToLocal } from '../fileManager';
import JournalSyncService from '../services/syncService';
import { createJournalPhoto, createInitialProfile } from '../types';

type SyncState = {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  syncProgress: string;
  pendingCount: number;
  conflictCount: number;
};

type JournalContextType = {
  // État existant
  photos: JournalPhoto[];
  profile: ProfileState;
  isLoading: boolean;
  
  // Actions existantes
  addPhoto: (p: Omit<JournalPhoto, 'id' | 'version' | 'lastModified' | 'syncStatus'>) => Promise<void>;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, patch: Partial<JournalPhoto>) => void;
  setProfile: (p: Partial<ProfileState>) => void;
  
  // 🆕 Fonctionnalités de sync
  syncState: SyncState;
  syncNow: () => Promise<SyncResult>;
  enableAutoSync: (enabled: boolean) => void;
  resolveConflict: (photoId: string, resolution: 'keepLocal' | 'keepServer') => Promise<void>;
  
  // 🆕 Indicateurs visuels
  getSyncIcon: (photo: JournalPhoto) => string;
  getSyncStatusText: (status: SyncStatus) => string;
};

const JournalContext = createContext<JournalContextType | null>(null);

export const useJournal = () => {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within JournalProvider');
  }
  return context;
};

export default function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  
  // État existant
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [profile, setProfileState] = useState<ProfileState>(createInitialProfile());
  const [isLoading, setIsLoading] = useState(false);
  
  // 🆕 État de synchronisation
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    syncProgress: '',
    pendingCount: 0,
    conflictCount: 0,
  });
  
  // 🆕 Service de sync
  const [syncService, setSyncService] = useState<JournalSyncService | null>(null);
  const [autoSyncStopFunction, setAutoSyncStopFunction] = useState<(() => void) | null>(null);

  // Initialiser le service de sync quand l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && user) {
      const service = new JournalSyncService({
        apiUrl: 'https://your-api-url.com/api', // À remplacer
        userId: user.id,
        authToken: 'user-auth-token', // À récupérer depuis le contexte d'auth
      });
      setSyncService(service);
      
      // Démarrer l'auto-sync par défaut
      const stopAutoSync = service.startAutoSync(15); // Toutes les 15 minutes
      setAutoSyncStopFunction(() => stopAutoSync);
    } else {
      setSyncService(null);
      if (autoSyncStopFunction) {
        autoSyncStopFunction();
        setAutoSyncStopFunction(null);
      }
    }
  }, [user, isAuthenticated]);

  // Charger les données locales
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      
      Promise.all([
        loadAll(user.id),
        loadProfile(user.id)
      ]).then(([userPhotos, userProfile]) => {
        setPhotos(userPhotos);
        setProfileState(userProfile);
        
        // Calculer les statistiques de sync
        updateSyncStats(userPhotos, userProfile);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Erreur lors du chargement des données:', error);
        setIsLoading(false);
      });

      // Migration des anciennes données
      migrateDataToUser(user.id).catch(console.error);
    } else {
      setPhotos([]);
      setProfileState(createInitialProfile());
      setSyncState(prev => ({ ...prev, pendingCount: 0, conflictCount: 0 }));
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Sauvegarder automatiquement les changements
  useEffect(() => {
    if (isAuthenticated && user && photos.length >= 0) {
      saveAll(user.id, photos);
      updateSyncStats(photos, profile);
    }
  }, [photos, user, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      saveProfile(user.id, profile);
      updateSyncStats(photos, profile);
    }
  }, [profile, user, isAuthenticated]);

  // 🆕 Calculer les statistiques de sync
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

  // 🆕 Synchronisation manuelle
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!syncService || !isAuthenticated || !user) {
      throw new Error('Service de synchronisation non disponible');
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, syncProgress: 'Démarrage...' }));

    try {
      // Vérifier la connexion
      const networkStatus = await syncService.getNetworkStatus();
      setSyncState(prev => ({ ...prev, isOnline: networkStatus.isConnected }));
      
      if (!networkStatus.isConnected) {
        throw new Error('Pas de connexion internet');
      }

      // Synchroniser les photos
      setSyncState(prev => ({ ...prev, syncProgress: 'Synchronisation des photos...' }));
      const photoResult = await syncService.syncPhotos(photos);
      
      // Synchroniser le profil
      setSyncState(prev => ({ ...prev, syncProgress: 'Synchronisation du profil...' }));
      const syncedProfile = await syncService.syncProfile(profile);
      setProfileState(syncedProfile);

      // Recharger les données après sync
      setSyncState(prev => ({ ...prev, syncProgress: 'Finalisation...' }));
      const updatedPhotos = await loadAll(user.id);
      setPhotos(updatedPhotos);

      const result: SyncResult = {
        ...photoResult,
        duration: photoResult.duration,
      };

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        syncProgress: 'Terminé',
      }));

      // Mettre à jour les stats après sync
      updateSyncStats(updatedPhotos, syncedProfile);

      return result;

    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: `Erreur: ${error.message}`,
      }));
      throw error;
    }
  }, [syncService, isAuthenticated, user, photos, profile, updateSyncStats]);

  // Actions existantes modifiées pour le sync
  const addPhoto = useCallback(async (photoData: Omit<JournalPhoto, 'id' | 'version' | 'lastModified' | 'syncStatus'>) => {
    if (!isAuthenticated || !user) return;
    
    // Copier l'image localement
    const localPath = await saveImageToLocal(photoData.uri);
    if (!localPath) return;

    // Créer la photo avec les métadonnées de sync
    const newPhoto = createJournalPhoto(localPath, photoData.locationName);
    
    // Ajouter les autres propriétés
    const completePhoto: JournalPhoto = {
      ...newPhoto,
      timestamp: photoData.timestamp,
      dateISO: photoData.dateISO,
      title: photoData.title,
      note: photoData.note,
    };

    // Marquer pour synchronisation si on a le service
    let syncedPhoto = completePhoto;
    if (syncService) {
      syncedPhoto = await syncService.markPhotoForSync(completePhoto);
    }

    setPhotos(prev => [syncedPhoto, ...prev]);
  }, [isAuthenticated, user, syncService]);

  const removePhoto = useCallback((id: string) => {
    if (!isAuthenticated) return;
    
    setPhotos(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo && syncService) {
        // Si la photo existe sur le serveur, marquer pour suppression
        if (photo.serverId) {
          // Marquer comme supprimée plutôt que de la retirer complètement
          return prev.map(p => p.id === id ? { ...p, syncStatus: 'pending' as SyncStatus } : p);
        }
      }
      // Sinon, supprimer localement
      return prev.filter(p => p.id !== id);
    });
  }, [isAuthenticated, syncService]);

  const updatePhoto = useCallback((id: string, patch: Partial<JournalPhoto>) => {
    if (!isAuthenticated) return;
    
    setPhotos(prev => prev.map(photo => {
      if (photo.id === id) {
        const updatedPhoto = { ...photo, ...patch };
        
        // Marquer pour sync si on modifie le contenu
        if (syncService && (patch.title !== undefined || patch.note !== undefined)) {
          return {
            ...updatedPhoto,
            version: updatedPhoto.version + 1,
            lastModified: Date.now(),
            syncStatus: 'pending' as SyncStatus,
          };
        }
        
        return updatedPhoto;
      }
      return photo;
    }));
  }, [isAuthenticated, syncService]);

  const setProfile = useCallback((profileUpdates: Partial<ProfileState>) => {
    if (!isAuthenticated || !syncService) return;
    
    setProfileState(prev => {
      const updatedProfile = { ...prev, ...profileUpdates };
      
      // Marquer pour sync
      return {
        ...updatedProfile,
        version: updatedProfile.version + 1,
        lastModified: Date.now(),
        syncStatus: 'pending' as SyncStatus,
      };
    });
  }, [isAuthenticated, syncService]);

  // 🆕 Gestion de l'auto-sync
  const enableAutoSync = useCallback((enabled: boolean) => {
    if (!syncService) return;
    
    if (enabled && !autoSyncStopFunction) {
      const stopFn = syncService.startAutoSync(15);
      setAutoSyncStopFunction(() => stopFn);
    } else if (!enabled && autoSyncStopFunction) {
      autoSyncStopFunction();
      setAutoSyncStopFunction(null);
    }
  }, [syncService, autoSyncStopFunction]);

  // 🆕 Résolution de conflit
  const resolveConflict = useCallback(async (photoId: string, resolution: 'keepLocal' | 'keepServer') => {
    if (!syncService || !isAuthenticated) return;
    
    const photo = photos.find(p => p.id === photoId);
    if (!photo || photo.syncStatus !== 'conflict') return;

    try {
      if (resolution === 'keepLocal') {
        // Forcer l'upload de la version locale
        const resolvedPhoto = await syncService.markPhotoForSync(photo);
        updatePhoto(photoId, resolvedPhoto);
      } else {
        // Récupérer la version serveur
        // Cette logique dépend de votre implémentation serveur
        setSyncState(prev => ({ ...prev, syncProgress: 'Résolution du conflit...' }));
        
        // Simuler la récupération de la version serveur
        const serverPhoto = { ...photo, syncStatus: 'synced' as SyncStatus };
        updatePhoto(photoId, serverPhoto);
      }
    } catch (error) {
      console.error('Erreur lors de la résolution du conflit:', error);
    }
  }, [syncService, isAuthenticated, photos, updatePhoto]);

  // 🆕 Helpers pour l'interface
  const getSyncIcon = useCallback((photo: JournalPhoto): string => {
    switch (photo.syncStatus) {
      case 'synced': return '✅';
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'downloading': return '📥';
      case 'conflict': return '⚠️';
      case 'error': return '❌';
      default: return '❔';
    }
  }, []);

  const getSyncStatusText = useCallback((status: SyncStatus): string => {
    switch (status) {
      case 'synced': return 'Synchronisé';
      case 'pending': return 'En attente';
      case 'uploading': return 'Upload en cours';
      case 'downloading': return 'Téléchargement';
      case 'conflict': return 'Conflit détecté';
      case 'error': return 'Erreur de sync';
      default: return 'État inconnu';
    }
  }, []);

  // Vérifier périodiquement la connectivité
  useEffect(() => {
    if (!syncService) return;

    const checkConnectivity = async () => {
      try {
        const networkStatus = await syncService.getNetworkStatus();
        setSyncState(prev => ({ ...prev, isOnline: networkStatus.isConnected }));
      } catch {
        setSyncState(prev => ({ ...prev, isOnline: false }));
      }
    };

    // Vérifier immédiatement puis toutes les 30 secondes
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);

    return () => clearInterval(interval);
  }, [syncService]);

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      if (autoSyncStopFunction) {
        autoSyncStopFunction();
      }
    };
  }, [autoSyncStopFunction]);

  const contextValue: JournalContextType = {
    // État existant
    photos,
    profile,
    isLoading,
    
    // Actions existantes
    addPhoto,
    removePhoto,
    updatePhoto,
    setProfile,
    
    // 🆕 Fonctionnalités de sync
    syncState,
    syncNow,
    enableAutoSync,
    resolveConflict,
    getSyncIcon,
    getSyncStatusText,
  };

  return (
    <JournalContext.Provider value={contextValue}>
      {children}
    </JournalContext.Provider>
  );
}