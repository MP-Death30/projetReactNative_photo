// src/services/firebaseSyncService.ts
import {
  doc,
  collection,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { db, storage } from '../config/firebase';
import { JournalPhoto, ProfileState, SyncResult, SyncStatus, NetworkStatus } from '../types';

interface FirebaseSyncConfig {
  userId: string;
}

export class FirebaseSyncService {
  private config: FirebaseSyncConfig;
  private listeners: Map<string, () => void> = new Map();

  constructor(config: FirebaseSyncConfig) {
    this.config = config;
  }

  // 🌐 Vérification de la connectivité
  async getNetworkStatus(): Promise<NetworkStatus> {
    try {
      // Test simple de connectivité Firebase
      const testDoc = doc(db, 'connectivity', 'test');
      await getDoc(testDoc);
      return {
        isConnected: true,
        connectionType: 'unknown'
      };
    } catch (error) {
      return {
        isConnected: false,
        connectionType: 'unknown'
      };
    }
  }

  // 📸 Synchronisation des photos
  async syncPhotos(localPhotos: JournalPhoto[]): Promise<SyncResult> {
    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      duration: 0
    };

    const startTime = Date.now();

    try {
      // 1. Upload des photos en attente
      const uploadResult = await this.uploadPendingPhotos(localPhotos);
      result.uploaded = uploadResult.count;
      result.errors.push(...uploadResult.errors);

      // 2. Download des nouvelles photos
      const downloadResult = await this.downloadNewPhotos(localPhotos);
      result.downloaded = downloadResult.count;
      result.errors.push(...downloadResult.errors);

      // 3. Résolution des conflits
      const conflictResult = await this.resolveConflicts(localPhotos);
      result.conflicts = conflictResult.count;
      result.errors.push(...conflictResult.errors);

      result.duration = Date.now() - startTime;
      return result;
    } catch (error) {
      result.errors.push(`Erreur générale: ${error.message}`);
      result.duration = Date.now() - startTime;
      throw error;
    }
  }

  // ⬆️ Upload des photos en attente
  private async uploadPendingPhotos(localPhotos: JournalPhoto[]): Promise<{ count: number; errors: string[] }> {
    const pendingPhotos = localPhotos.filter(photo => 
      photo.syncStatus === 'pending' || photo.syncStatus === 'error'
    );
    
    const errors: string[] = [];
    let count = 0;
    const batch = writeBatch(db);

    for (const photo of pendingPhotos) {
      try {
        let imageUrl = photo.uri;
        
        // Upload de l'image si nécessaire
        if (photo.needsUpload && photo.uri.startsWith('file://')) {
          imageUrl = await this.uploadImageToStorage(photo.uri, photo.id);
        }

        // Préparer les données pour Firestore
        const photoData = {
          localId: photo.id,
          uri: imageUrl,
          timestamp: photo.timestamp,
          dateISO: photo.dateISO,
          locationName: photo.locationName || null,
          title: photo.title || '',
          note: photo.note || '',
          version: photo.version,
          lastModified: photo.lastModified,
          userId: this.config.userId,
          syncStatus: 'synced',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        // Utiliser l'ID local comme ID Firestore
        const docRef = doc(db, 'photos', photo.id);
        batch.set(docRef, photoData);
        count++;

      } catch (error) {
        errors.push(`Erreur upload photo ${photo.id}: ${error.message}`);
      }
    }

    // Exécuter le batch
    if (count > 0) {
      await batch.commit();
    }

    return { count, errors };
  }

  // ⬇️ Download des nouvelles photos
  private async downloadNewPhotos(localPhotos: JournalPhoto[]): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    try {
      // Récupérer les photos du serveur pour cet utilisateur
      const photosQuery = query(
        collection(db, 'photos'),
        where('userId', '==', this.config.userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(photosQuery);
      const localPhotoIds = new Set(localPhotos.map(p => p.id));

      for (const docSnapshot of querySnapshot.docs) {
        const serverPhoto = { id: docSnapshot.id, ...docSnapshot.data() };
        
        if (!localPhotoIds.has(serverPhoto.id)) {
          // Nouvelle photo du serveur
          try {
            await this.downloadPhotoFromServer(serverPhoto);
            count++;
          } catch (error) {
            errors.push(`Erreur download photo ${serverPhoto.id}: ${error.message}`);
          }
        } else {
          // Vérifier les conflits
          const localPhoto = localPhotos.find(p => p.id === serverPhoto.id);
          if (localPhoto && this.hasConflict(localPhoto, serverPhoto)) {
            // Marquer comme conflit - sera géré par resolveConflicts
            await this.markAsConflict(localPhoto.id);
          }
        }
      }

    } catch (error) {
      errors.push(`Erreur générale download: ${error.message}`);
    }

    return { count, errors };
  }

  // 🔄 Résolution des conflits
  private async resolveConflicts(localPhotos: JournalPhoto[]): Promise<{ count: number; errors: string[] }> {
    const conflictPhotos = localPhotos.filter(photo => photo.syncStatus === 'conflict');
    const errors: string[] = [];
    let count = 0;

    for (const conflictPhoto of conflictPhotos) {
      try {
        // Stratégie: la dernière modification gagne
        const serverDocRef = doc(db, 'photos', conflictPhoto.id);
        const serverDoc = await getDoc(serverDocRef);
        
        if (serverDoc.exists()) {
          const serverData = serverDoc.data();
          
          if (conflictPhoto.lastModified > serverData.lastModified) {
            // Version locale plus récente
            await updateDoc(serverDocRef, {
              title: conflictPhoto.title,
              note: conflictPhoto.note,
              version: conflictPhoto.version,
              lastModified: conflictPhoto.lastModified,
              updatedAt: serverTimestamp()
            });
          }
          // Sinon, la version serveur est plus récente et sera récupérée
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
    try {
      const profileRef = doc(db, 'profiles', this.config.userId);
      
      if (localProfile.syncStatus === 'pending' || localProfile.syncStatus === 'error') {
        // Upload du profil
        const profileData = {
          name: localProfile.name,
          avatarUri: localProfile.avatarUri || null,
          version: localProfile.version,
          lastModified: localProfile.lastModified,
          userId: this.config.userId,
          updatedAt: serverTimestamp()
        };
        
        await setDoc(profileRef, profileData, { merge: true });
        
        return {
          ...localProfile,
          syncStatus: 'synced'
        };
      } else {
        // Vérifier les mises à jour serveur
        const serverDoc = await getDoc(profileRef);
        if (serverDoc.exists()) {
          const serverData = serverDoc.data();
          if (serverData.version > localProfile.version) {
            return {
              name: serverData.name,
              avatarUri: serverData.avatarUri,
              version: serverData.version,
              lastModified: serverData.lastModified,
              syncStatus: 'synced'
            };
          }
        }
      }
      
      return localProfile;
    } catch (error) {
      console.error('Erreur sync profil:', error);
      return {
        ...localProfile,
        syncStatus: 'error'
      };
    }
  }

  // 🖼️ Upload d'image vers Firebase Storage
  private async uploadImageToStorage(localUri: string, photoId: string): Promise<string> {
    try {
      // Lire le fichier local
      const response = await fetch(localUri);
      const blob = await response.blob();
      
      // Créer une référence unique
      const imageRef = ref(storage, `photos/${this.config.userId}/${photoId}.jpg`);
      
      // Upload
      await uploadBytes(imageRef, blob);
      
      // Récupérer l'URL de download
      const downloadUrl = await getDownloadURL(imageRef);
      return downloadUrl;
      
    } catch (error) {
      throw new Error(`Erreur upload image: ${error.message}`);
    }
  }

  // ⬇️ Download d'image depuis Firebase Storage
  private async downloadImageFromStorage(storageUrl: string, localId: string): Promise<string> {
    try {
      const fileName = `photo_${localId}_${Date.now()}.jpg`;
      const localUri = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.downloadAsync(storageUrl, localUri);
      return localUri;
      
    } catch (error) {
      throw new Error(`Erreur download image: ${error.message}`);
    }
  }

  // 📥 Download complet d'une photo depuis le serveur
  private async downloadPhotoFromServer(serverPhoto: any): Promise<void> {
    // Cette méthode sera appelée par le contexte pour ajouter la photo
    // On émet un événement ou on utilise un callback
    console.log('Nouvelle photo à télécharger:', serverPhoto);
  }

  // 🔍 Détection de conflit
  private hasConflict(localPhoto: JournalPhoto, serverPhoto: any): boolean {
    return localPhoto.syncStatus === 'pending' && 
           serverPhoto.lastModified > localPhoto.lastModified;
  }

  // ⚠️ Marquer comme conflit
  private async markAsConflict(photoId: string): Promise<void> {
    // Cette logique sera gérée par le contexte
    console.log('Conflit détecté pour:', photoId);
  }

  // 🗑️ Supprimer une photo
  async deletePhoto(photoId: string, storageUrl?: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Supprimer de Firestore
    const photoRef = doc(db, 'photos', photoId);
    batch.delete(photoRef);
    
    await batch.commit();
    
    // Supprimer de Storage si nécessaire
    if (storageUrl) {
      try {
        const imageRef = ref(storage, storageUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.warn('Impossible de supprimer l\'image du storage:', error);
      }
    }
  }

  // 👂 Écouter les changements en temps réel
  subscribeToPhotos(callback: (photos: any[]) => void): () => void {
    const photosQuery = query(
      collection(db, 'photos'),
      where('userId', '==', this.config.userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(photosQuery, (snapshot) => {
      const photos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(photos);
    });

    this.listeners.set('photos', unsubscribe);
    return unsubscribe;
  }

  subscribeToProfile(callback: (profile: any) => void): () => void {
    const profileRef = doc(db, 'profiles', this.config.userId);

    const unsubscribe = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      }
    });

    this.listeners.set('profile', unsubscribe);
    return unsubscribe;
  }

  // 🧹 Nettoyage
  cleanup(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // 🔧 Utilitaires
  async markPhotoForSync(photo: JournalPhoto): Promise<JournalPhoto> {
    return {
      ...photo,
      version: photo.version + 1,
      lastModified: Date.now(),
      syncStatus: 'pending'
    };
  }

  async markProfileForSync(profile: ProfileState): Promise<ProfileState> {
    return {
      ...profile,
      version: profile.version + 1,
      lastModified: Date.now(),
      syncStatus: 'pending'
    };
  }
}