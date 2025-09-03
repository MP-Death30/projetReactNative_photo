// src/context/JournalProvider.tsx - Version Firebase
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { JournalPhoto, ProfileState, SyncResult, SyncStatus } from '../types';
import { loadAll, saveAll, loadProfile, saveProfile, migrateDataToUser } from '../storage';
import { useAuth } from './AuthProvider';
import { saveImageToLocal } from '../fileManager';
import { FirebaseSyncService } from '../services/firebaseSyncService';
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
  
  // 🆕 Fonctionnalités de sync Firebase
  syncState: SyncState;
  syncNow: () => Promise<SyncResult>;
  enableAutoSync: (enabled: boolean) => void;
  enableRealTimeSync: (enabled: boolean) => void;
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
  
  // 🆕 État de synchronisation Firebase
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: false,
    isSyncing: false,
    lastSync: null,
    syncProgress: '',
    pendingCount: 0,
    conflictCount: 0,
  });
  
  // 🆕 Service de sync Firebase
  const [firebaseSyncService, setFirebaseSyncService] = useState<FirebaseSyncService | null>(null);
  const [autoSyncInterval, setAutoSyncInterval] = useState<NodeJS.Timeout | null>(null);
  const [realtimeSyncEnabled, setRealtimeSyncEnabled] = useState(false);

  // Initialiser le service Firebase quand l'utilisateur se connecte
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔥 Initialisation Firebase Sync Service pour:', user.email);
      
      const service = new FirebaseSyncService({
        userId: user.id,
      });
      setFirebaseSyncService(service);
      
      // Activer l'auto-sync par défaut
      enableAutoSync(true);
      
    } else {
      console.log('🔥 Nettoyage Firebase Sync Service');
      
      // Nettoyer les services
      if (firebaseSyncService) {
        firebaseSyncService.cleanup();
        setFirebaseSyncService(null);
      }
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        setAutoSyncInterval(null);
      }
    }

    return () => {
      if (firebaseSyncService) {
        firebaseSyncService.cleanup();
      }
    };
  }, [user, isAuthenticated]);

  // Charger les données locales au démarrage
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      console.log('📂 Chargement des données locales...');
      
      Promise.all([
        loadAll(user.id),
        loadProfile(user.id)
      ]).then(([userPhotos, userProfile]) => {
        console.log(`📸 ${userPhotos.length} photos chargées`);
        setPhotos(userPhotos);
        setProfileState(userProfile);
        
        updateSyncStats(userPhotos, userProfile);
        setIsLoading(false);
        
        // Synchronisation initiale automatique
        if (firebaseSyncService) {
          setTimeout(() => {
            syncNow().catch(error => 
              console.log('⚠️ Sync initiale échouée:', error.message)
            );
          }, 1000);
        }
        
      }).catch((error) => {
        console.error('❌ Erreur chargement données:', error);
        setIsLoading(false);
      });

      // Migration des anciennes données si nécessaire
      migrateDataToUser(user.id).catch(console.error);
      
    } else {
      setPhotos([]);
      setProfileState(createInitialProfile());
      setSyncState(prev => ({ ...prev, pendingCount: 0, conflictCount: 0 }));
      setIsLoading(false);
    }
  }, [user, isAuthenticated, firebaseSyncService]);

  // Sauvegarder automatiquement les changements
  useEffect(() => {
    if (isAuthenticated && user && photos.length >= 0) {
      saveAll(user.id, photos);
      updateSyncStats(photos, profile);
    }
  }, [photos, user, isAuthenticated, profile]);

  useEffect(() => {
    if (isAuthenticated && user) {
      saveProfile(user.id, profile);
      updateSyncStats(photos, profile);
    }
  }, [profile, user, isAuthenticated, photos]);

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

  // 🆕 Synchronisation manuelle avec Firebase
  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!firebaseSyncService || !isAuthenticated || !user) {
      throw new Error('Service de synchronisation Firebase non disponible');
    }

    if (syncState.isSyncing) {
      throw new Error('Synchronisation déjà en cours');
    }

    console.log('🔄 Début synchronisation Firebase...');
    setSyncState(prev => ({ ...prev, isSyncing: true, syncProgress: 'Connexion...' }));

    try {
      // Vérifier la connexion
      const networkStatus = await firebaseSyncService.getNetworkStatus();
      setSyncState(prev => ({ ...prev, isOnline: networkStatus.isConnected }));
      
      if (!networkStatus.isConnected) {
        throw new Error('Pas de connexion à Firebase');
      }

      // Synchroniser les photos
      setSyncState(prev => ({ ...prev, syncProgress: 'Synchronisation des photos...' }));
      const photoResult = await firebaseSyncService.syncPhotos(photos);
      
      // Synchroniser le profil
      setSyncState(prev => ({ ...prev, syncProgress: 'Synchronisation du profil...' }));
      const syncedProfile = await firebaseSyncService.syncProfile(profile);
      setProfileState(syncedProfile);

      // Recharger les données après sync
      setSyncState(prev => ({ ...prev, syncProgress: 'Finalisation...' }));
      const updatedPhotos = await loadAll(user.id);
      setPhotos(updatedPhotos);

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        syncProgress: 'Terminé',
      }));

      updateSyncStats(updatedPhotos, syncedProfile);
      console.log('✅ Synchronisation Firebase terminée:', photoResult);

      return photoResult;

    } catch (error: any) {
      console.error('❌ Erreur synchronisation Firebase:', error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncProgress: `Erreur: ${error.message}`,
      }));
      throw error;
    }
  }, [firebaseSyncService, isAuthenticated, user, photos, profile, updateSyncStats, syncState.isSyncing]);

  // Actions modifiées pour Firebase
  const addPhoto = useCallback(async (photoData: Omit<JournalPhoto, 'id' | 'version' | 'lastModified' | 'syncStatus'>) => {
    if (!isAuthenticated || !user) return;
    
    console.log('📸 Ajout nouvelle photo...');
    
    // Copier l'image localement
    const localPath = await saveImageToLocal(photoData.uri);
    if (!localPath) {
      console.error('❌ Impossible de sauvegarder l\'image localement');
      return;
    }

    // Créer la photo avec les métadonnées de sync
    const newPhoto = createJournalPhoto(localPath, photoData.locationName);
    
    const completePhoto: JournalPhoto = {
      ...newPhoto,
      timestamp: photoData.timestamp,
      dateISO: photoData.dateISO,
      title: photoData.title,
      note: photoData.note,
    };

    // Marquer pour synchronisation Firebase
    let syncedPhoto = completePhoto;
    if (firebaseSyncService) {
      syncedPhoto = await firebaseSyncService.markPhotoForSync(completePhoto);
    }

    setPhotos(prev => [syncedPhoto, ...prev]);
    
    // Synchronisation automatique si activée
    if (realtimeSyncEnabled && firebaseSyncService) {
      setTimeout(() => {
        syncNow().catch(error => 
          console.log('⚠️ Auto-sync après ajout échouée:', error.message)
        );
      }, 500);
    }
  }, [isAuthenticated, user, firebaseSyncService, realtimeSyncEnabled, syncNow]);

  const removePhoto = useCallback(async (id: string) => {
    if (!isAuthenticated || !firebaseSyncService) return;
    
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    console.log('🗑️ Suppression photo:', id);
    
    try {
      // Supprimer de Firebase si elle existe sur le serveur
      if (photo.serverId || !photo.uri.startsWith('file://')) {
        await firebaseSyncService.deletePhoto(id, photo.uri);
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression Firebase:', error);
    }
    
    // Supprimer localement
    setPhotos(prev => prev.filter(p => p.id !== id));
    
  }, [isAuthenticated, firebaseSyncService, photos]);

  const updatePhoto = useCallback(async (id: string, patch: Partial<JournalPhoto>) => {
    if (!isAuthenticated) return;
    
    setPhotos(prev => prev.map(photo => {
      if (photo.id === id) {
        const updatedPhoto = { ...photo, ...patch };
        
        // Marquer pour sync Firebase si on modifie le contenu
        if (firebaseSyncService && (patch.title !== undefined || patch.note !== undefined)) {
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

    // Synchronisation automatique si activée
    if (realtimeSyncEnabled && firebaseSyncService) {
      setTimeout(() => {
        syncNow().catch(error => 
          console.log('⚠️ Auto-sync après modification échouée:', error.message)
        );
      }, 1000);
    }
  }, [isAuthenticated, firebaseSyncService, realtimeSyncEnabled, syncNow]);

  const setProfile = useCallback(async (profileUpdates: Partial<ProfileState>) => {
    if (!isAuthenticated || !firebaseSyncService) return;
    
    setProfileState(prev => {
      const updatedProfile = { ...prev, ...profileUpdates };
      
      // Marquer pour sync Firebase
      return {
        ...updatedProfile,
        version: updatedProfile.version + 1,
        lastModified: Date.now(),
        syncStatus: 'pending' as SyncStatus,
      };
    });

    // Synchronisation automatique si activée
    if (realtimeSyncEnabled) {
      setTimeout(() => {
        syncNow().catch(error => 
          console.log('⚠️ Auto-sync profil échouée:', error.message)
        );
      }, 1000);
    }
  }, [isAuthenticated, firebaseSyncService, realtimeSyncEnabled, syncNow]);

  // 🆕 Gestion de l'auto-sync
  const enableAutoSync = useCallback((enabled: boolean) => {
    if (!firebaseSyncService) return;
    
    console.log('🔄 Auto-sync:', enabled ? 'activé' : 'désactivé');
    
    if (enabled && !autoSyncInterval) {
      const interval = setInterval(async () => {
        if (!syncState.isSyncing) {
          try {
            await syncNow();
          } catch (error) {
            console.log('⚠️ Auto-sync échouée:', error.message);
          }
        }
      }, 15 * 60 * 1000); // 15 minutes
      
      setAutoSyncInterval(interval);
    } else if (!enabled && autoSyncInterval) {
      clearInterval(autoSyncInterval);
      setAutoSyncInterval(null);
    }
  }, [firebaseSyncService, autoSyncInterval, syncState.isSyncing, syncNow]);

  // 🆕 Gestion du sync temps réel
  const enableRealTimeSync = useCallback((enabled: boolean) => {
    console.log('⚡ Sync temps réel:', enabled ? 'activé' : 'désactivé');
    setRealtimeSyncEnabled(enabled);
    
    if (enabled && firebaseSyncService) {
      // Écouter les changements en temps réel
      const unsubscribePhotos = firebaseSyncService.subscribeToPhotos((serverPhotos) => {
        console.log('📡 Nouvelles photos reçues du serveur:', serverPhotos.length);
        // Logique pour merger avec les données locales
        // Cette partie nécessiterait une logique plus complexe pour éviter les boucles
      });
      
      const unsubscribeProfile = firebaseSyncService.subscribeToProfile((serverProfile) => {
        console.log('📡 Nouveau profil reçu du serveur');
        // Merger avec le profil local si la version serveur est plus récente
      });
    }
  }, [firebaseSyncService]);

  // 🆕 Résolution de conflit
  const resolveConflict = useCallback(async (photoId: string, resolution: 'keepLocal' | 'keepServer') => {
    if (!firebaseSyncService || !isAuthenticated) return;
    
    const photo = photos.find(p => p.id === photoId);
    if (!photo || photo.syncStatus !== 'conflict') return;

    console.log('⚠️ Résolution conflit:', photoId, 'stratégie:', resolution);

    try {
      if (resolution === 'keepLocal') {
        // Forcer l'upload de la version locale
        const resolvedPhoto = await firebaseSyncService.markPhotoForSync(photo);
        updatePhoto(photoId, { ...resolvedPhoto, syncStatus: 'pending' });
        
        // Synchroniser immédiatement
        await syncNow();
      } else {
        // Récupérer et appliquer la version serveur
        setSyncState(prev => ({ ...prev, syncProgress: 'Résolution du conflit...' }));
        
        // Re-synchroniser pour récupérer la version serveur
        await syncNow();
      }
      
      console.log('✅ Conflit résolu');
    } catch (error) {
      console.error('❌ Erreur résolution conflit:', error);
    }
  }, [firebaseSyncService, isAuthenticated, photos, updatePhoto, syncNow]);

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

  // Vérifier périodiquement la connectivité Firebase
  useEffect(() => {
    if (!firebaseSyncService) return;

    const checkConnectivity = async () => {
      try {
        const networkStatus = await firebaseSyncService.getNetworkStatus();
        setSyncState(prev => ({ ...prev, isOnline: networkStatus.isConnected }));
      } catch {
        setSyncState(prev => ({ ...prev, isOnline: false }));
      }
    };

    // Vérifier immédiatement puis toutes les 30 secondes
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 30000);

    return () => clearInterval(interval);
  }, [firebaseSyncService]);

  // Nettoyage à la déconnexion
  useEffect(() => {
    return () => {
      if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
      }
    };
  }, [autoSyncInterval]);

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
    
    // 🆕 Fonctionnalités de sync Firebase
    syncState,
    syncNow,
    enableAutoSync,
    enableRealTimeSync: enableRealTimeSync,
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