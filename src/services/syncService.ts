// src/services/syncService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { JournalPhoto, ProfileState, SyncResult, SyncStatus, NetworkStatus } from '../types';

interface SyncConfig {
  apiUrl: string;
  userId: string;
  authToken: string;
}

class JournalSyncService {
  private config: SyncConfig;
  private syncInProgress = false;
  private networkListeners: Set<(status: NetworkStatus) => void> = new Set();

  constructor(config: SyncConfig) {
    this.config = config;
  }

  // 🌐 Vérification de la connectivité
  async getNetworkStatus(): Promise<NetworkStatus> {
    // Simulation - remplacez par react-native-netinfo
    try {
      const response = await fetch(`${this.config.apiUrl}/health`, { 
        method: 'HEAD',
        timeout: 5000 
      });
      return {
        isConnected: response.ok,
        connectionType: 'unknown'
      };
    } catch {
      return {
        isConnected: false,
        connectionType: 'unknown'
      };
    }
  }

  // 📸 Synchronisation des photos
  async syncPhotos(localPhotos: JournalPhoto[]): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Synchronisation déjà en cours');
    }

    const networkStatus = await this.getNetworkStatus();
    if (!networkStatus.isConnected) {
      throw new Error('Pas de connexion internet');
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    const result: SyncResult = { 
      uploaded: 0, 
      downloaded: 0, 
      conflicts: 0, 
      errors: [],
      duration: 0 
    };

    try {
      // 1. Upload des photos en attente
      const uploadResult = await this.uploadPendingPhotos(localPhotos);
      result.uploaded = uploadResult.count;
      result.errors.push(...uploadResult.errors);

      // 2. Download des nouvelles photos du serveur
      const downloadResult = await this.downloadServerPhotos();
      result.downloaded = downloadResult.count;
      result.errors.push(...downloadResult.errors);

      // 3. Résolution des conflits
      const conflictResult = await this.resolvePhotoConflicts(localPhotos);
      result.conflicts = conflictResult.count;
      result.errors.push(...conflictResult.errors);

      // 4. Mise à jour du timestamp de dernière sync
      await this.updateLastSyncTime('photos');

      result.duration = Date.now() - startTime;
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  // ⬆️ Upload des photos en attente
  private async uploadPendingPhotos(localPhotos: JournalPhoto[]): Promise<{ count: number; errors: string[] }> {
    const pendingPhotos = localPhotos.filter(photo => 
      photo.syncStatus === 'pending' || photo.syncStatus === 'error'
    );
    
    const errors: string[] = [];
    let count = 0;

    for (const photo of pendingPhotos) {
      try {
        // Upload de l'image si nécessaire
        let imageUrl = photo.uri;
        if (photo.needsUpload && photo.uri.startsWith('file://')) {
          imageUrl = await this.uploadPhotoFile(photo.uri);
        }

        // Upload des métadonnées
        const serverPhoto = await this.uploadPhotoMetadata({
          ...photo,
          uri: imageUrl,
        });

        // Mise à jour de la photo locale avec les infos serveur
        const updatedPhoto: JournalPhoto = {
          ...photo,
          serverId: serverPhoto.id,
          version: serverPhoto.version,
          syncStatus: 'synced',
          needsUpload: false,
        };

        // Sauvegarder la mise à jour
        await this.updateLocalPhoto(photo.id, updatedPhoto);
        count++;

      } catch (error) {
        errors.push(`Erreur upload photo ${photo.id}: ${error.message}`);
        // Marquer comme erreur pour retry plus tard
        await this.updateLocalPhoto(photo.id, { 
          ...photo, 
          syncStatus: 'error' 
        });
      }
    }

    return { count, errors };
  }

  // ⬇️ Download des photos du serveur
  private async downloadServerPhotos(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      const lastSync = await this.getLastSyncTime('photos');
      const serverPhotos = await this.fetchServerPhotos(lastSync);

      for (const serverPhoto of serverPhotos) {
        // Vérifier si on a déjà cette photo localement
        const existingPhoto = await this.findLocalPhotoByServerId(serverPhoto.id);
        
        if (!existingPhoto) {
          // Nouvelle photo du serveur
          await this.downloadAndSavePhoto(serverPhoto);
          count++;
        } else if (existingPhoto.version < serverPhoto.version) {
          // Mise à jour depuis le serveur
          if (existingPhoto.syncStatus === 'pending') {
            // Conflit détecté !
            await this.markPhotoAsConflict(existingPhoto, serverPhoto);
          } else {
            await this.updateLocalPhotoFromServer(existingPhoto, serverPhoto);
            count++;
          }
        }
      }
    } catch (error) {
      errors.push(`Erreur download photos: ${error.message}`);
    }

    return { count, errors };
  }

  // 🔄 Résolution des conflits
  private async resolvePhotoConflicts(localPhotos: JournalPhoto[]): Promise<{ count: number; errors: string[] }> {
    const conflictPhotos = localPhotos.filter(photo => photo.syncStatus === 'conflict');
    const errors: string[] = [];
    let count = 0;

    for (const conflictPhoto of conflictPhotos) {
      try {
        // Stratégie simple: la dernière modification gagne
        const serverVersion = await this.getServerPhoto(conflictPhoto.serverId!);
        
        if (conflictPhoto.lastModified > serverVersion.lastModified) {
          // Version locale plus récente, on l'envoie au serveur
          await this.forceUploadPhoto(conflictPhoto);
        } else {
          // Version serveur plus récente, on la récupère
          await this.updateLocalPhotoFromServer(conflictPhoto, serverVersion);
        }
        
        count++;
      } catch (error) {
        errors.push(`Erreur résolution conflit ${conflictPhoto.id}: ${error.message}`);
      }
    }

    return { count, errors };
  }

  // 👤 Synchronisation du profil
  async syncProfile(localProfile: ProfileState): Promise<ProfileState> {
    const networkStatus = await this.getNetworkStatus();
    if (!networkStatus.isConnected) {
      throw new Error('Pas de connexion internet');
    }

    try {
      if (localProfile.syncStatus === 'pending' || localProfile.syncStatus === 'error') {
        // Upload du profil local
        const serverProfile = await this.uploadProfile(localProfile);
        return {
          ...localProfile,
          version: serverProfile.version,
          syncStatus: 'synced',
        };
      } else {
        // Vérifier s'il y a des mises à jour sur le serveur
        const serverProfile = await this.fetchServerProfile();
        if (serverProfile.version > localProfile.version) {
          return {
            ...serverProfile,
            syncStatus: 'synced',
          };
        }
      }
      
      return localProfile;
    } catch (error) {
      console.error('Erreur sync profil:', error);
      return {
        ...localProfile,
        syncStatus: 'error',
      };
    }
  }

  // 🔧 Méthodes utilitaires privées
  private async uploadPhotoFile(localUri: string): Promise<string> {
    const formData = new FormData();
    formData.append('photo', {
      uri: localUri,
      type: 'image/jpeg',
      name: `photo_${Date.now()}.jpg`,
    } as any);

    const response = await fetch(`${this.config.apiUrl}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.url;
  }

  private async uploadPhotoMetadata(photo: JournalPhoto): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/photos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        localId: photo.id,
        uri: photo.uri,
        timestamp: photo.timestamp,
        dateISO: photo.dateISO,
        locationName: photo.locationName,
        title: photo.title,
        note: photo.note,
        version: photo.version,
        lastModified: photo.lastModified,
        userId: this.config.userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async fetchServerPhotos(since: number): Promise<any[]> {
    const response = await fetch(
      `${this.config.apiUrl}/photos?userId=${this.config.userId}&since=${since}`,
      {
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  private async downloadAndSavePhoto(serverPhoto: any): Promise<void> {
    // Download de l'image
    const localUri = await this.downloadImageToLocal(serverPhoto.uri);
    
    // Créer la photo locale
    const localPhoto: JournalPhoto = {
      id: `server_${serverPhoto.id}`,
      serverId: serverPhoto.id,
      uri: localUri,
      timestamp: serverPhoto.timestamp,
      dateISO: serverPhoto.dateISO,
      locationName: serverPhoto.locationName,
      title: serverPhoto.title,
      note: serverPhoto.note,
      version: serverPhoto.version,
      lastModified: serverPhoto.lastModified,
      syncStatus: 'synced',
      needsUpload: false,
    };

    // Sauvegarder localement (cette méthode doit être implémentée)
    await this.saveLocalPhoto(localPhoto);
  }

  private async downloadImageToLocal(imageUrl: string): Promise<string> {
    const fileName = `downloaded_${Date.now()}.jpg`;
    const localUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.downloadAsync(imageUrl, localUri);
    return localUri;
  }

  // 📱 Interface publique pour marquer les changements
  async markPhotoForSync(photo: JournalPhoto): Promise<JournalPhoto> {
    return {
      ...photo,
      version: photo.version + 1,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };
  }

  async markProfileForSync(profile: ProfileState): Promise<ProfileState> {
    return {
      ...profile,
      version: profile.version + 1,
      lastModified: Date.now(),
      syncStatus: 'pending',
    };
  }

  // ⚙️ Configuration et état
  private async getLastSyncTime(type: 'photos' | 'profile'): Promise<number> {
    const key = `last_sync_${type}_${this.config.userId}`;
    const stored = await AsyncStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  }

  private async updateLastSyncTime(type: 'photos' | 'profile'): Promise<void> {
    const key = `last_sync_${type}_${this.config.userId}`;
    await AsyncStorage.setItem(key, Date.now().toString());
  }

  // 🔄 Auto-sync
  startAutoSync(intervalMinutes: number = 15): () => void {
    const interval = setInterval(async () => {
      try {
        const networkStatus = await this.getNetworkStatus();
        if (networkStatus.isConnected && !this.syncInProgress) {
          // Auto-sync silencieuse (pas d'erreurs lancées)
          console.log('🔄 Début auto-sync...');
          // Cette méthode devra être appelée depuis le contexte
        }
      } catch (error) {
        console.log('⚠️ Auto-sync échoué:', error.message);
      }
    }, intervalMinutes * 60 * 1000);

    // Retourner une fonction pour arrêter l'auto-sync
    return () => clearInterval(interval);
  }

  // 📊 Statistiques
  async getSyncStats(): Promise<{
    pendingPhotos: number;
    conflictPhotos: number;
    lastSyncPhotos: number;
    lastSyncProfile: number;
  }> {
    return {
      pendingPhotos: 0, // À implémenter avec les données réelles
      conflictPhotos: 0,
      lastSyncPhotos: await this.getLastSyncTime('photos'),
      lastSyncProfile: await this.getLastSyncTime('profile'),
    };
  }

  // 🚨 Méthodes à implémenter selon votre storage existant
  private async updateLocalPhoto(localId: string, photo: JournalPhoto): Promise<void> {
    // À connecter avec votre système de storage existant
    console.log('TODO: Implémenter updateLocalPhoto', localId, photo);
  }

  private async findLocalPhotoByServerId(serverId: string): Promise<JournalPhoto | null> {
    // À connecter avec votre système de storage existant
    console.log('TODO: Implémenter findLocalPhotoByServerId', serverId);
    return null;
  }

  private async saveLocalPhoto(photo: JournalPhoto): Promise<void> {
    // À connecter avec votre système de storage existant
    console.log('TODO: Implémenter saveLocalPhoto', photo);
  }

  private async markPhotoAsConflict(localPhoto: JournalPhoto, serverPhoto: any): Promise<void> {
    await this.updateLocalPhoto(localPhoto.id, {
      ...localPhoto,
      syncStatus: 'conflict'
    });
  }

  private async updateLocalPhotoFromServer(localPhoto: JournalPhoto, serverPhoto: any): Promise<void> {
    const updatedPhoto: JournalPhoto = {
      ...localPhoto,
      title: serverPhoto.title,
      note: serverPhoto.note,
      version: serverPhoto.version,
      lastModified: serverPhoto.lastModified,
      syncStatus: 'synced',
    };
    
    await this.updateLocalPhoto(localPhoto.id, updatedPhoto);
  }

  private async getServerPhoto(serverId: string): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/photos/${serverId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
      },
    });
    return response.json();
  }

  private async forceUploadPhoto(photo: JournalPhoto): Promise<void> {
    // Forcer l'upload d'une photo en conflit
    await this.uploadPhotoMetadata(photo);
  }

  private async uploadProfile(profile: ProfileState): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/profile`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: profile.name,
        avatarUri: profile.avatarUri,
        version: profile.version,
        lastModified: profile.lastModified,
        userId: this.config.userId,
      }),
    });
    return response.json();
  }

  private async fetchServerProfile(): Promise<ProfileState> {
    const response = await fetch(`${this.config.apiUrl}/profile?userId=${this.config.userId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
      },
    });
    return response.json();
  }
}

export default JournalSyncService;