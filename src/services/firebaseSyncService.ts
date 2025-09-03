// src/services/firebaseSyncService.ts
import { 
  doc, getDoc, setDoc, collection, getDocs, query, where, orderBy, serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import * as FileSystem from "expo-file-system";
import { db, storage, auth } from "../config/firebase";
import type { JournalPhoto, ProfileState, SyncResult } from "../types";
import * as localStorage from "../storage";
import NetInfo from "@react-native-community/netinfo";

interface FirebaseSyncConfig {
  userId: string;
}

export class FirebaseSyncService {
  private config: FirebaseSyncConfig;

  constructor(config: FirebaseSyncConfig) {
    this.config = config;
  }

  /** Vérifier si l’utilisateur est connecté */
  private checkAuth() {
    if (!auth.currentUser || auth.currentUser.uid !== this.config.userId) {
      throw new Error("Utilisateur non authentifié");
    }
  }

  /** Vérifier la connexion réseau */
  async getNetworkStatus(): Promise<{ isConnected: boolean }> {
    try {
      const state = await NetInfo.fetch();
      return { isConnected: !!state.isConnected };
    } catch {
      return { isConnected: false };
    }
  }

  /** Synchroniser les photos */
  async syncPhotos(): Promise<SyncResult> {
    this.checkAuth();

    const localPhotos = await localStorage.loadAll(this.config.userId);

    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
    };

    const start = Date.now();

    try {
      // --- Upload local → cloud
      for (const photo of localPhotos) {
        if (photo.syncStatus === "pending" || photo.syncStatus === "error") {
          try {
            let downloadUrl = photo.uri;
            let storagePath = photo.storagePath;

            if (photo.uri.startsWith("file://")) {
              const uploadResult = await this.uploadImage(photo.uri, photo.id);
              downloadUrl = uploadResult.downloadUrl;
              storagePath = uploadResult.storagePath;
            }

            await setDoc(doc(db, "photos", photo.id), {
              ...photo,
              uri: downloadUrl,
              storagePath,
              userId: this.config.userId,
              syncStatus: "synced",
              updatedAt: serverTimestamp(),
              lastModified: photo.lastModified,
              version: (photo.version ?? 0) + 1,
            });

            result.uploaded++;
          } catch (err: any) {
            result.errors.push(`Erreur upload ${photo.id}: ${err.message}`);
          }
        }
      }

      // --- Download cloud → local
      const photosQuery = query(
        collection(db, "photos"),
        where("userId", "==", this.config.userId),
        orderBy("updatedAt", "desc")
      );
      const snapshot = await getDocs(photosQuery);

      for (const docSnap of snapshot.docs) {
        const serverPhoto = { id: docSnap.id, ...docSnap.data() } as any;
        const localPhoto = localPhotos.find((p) => p.id === serverPhoto.id);

        if (!localPhoto) {
          const localUri = await this.downloadImage(serverPhoto.uri, serverPhoto.id);
          const newPhoto: JournalPhoto = {
            ...serverPhoto,
            uri: localUri,
            syncStatus: "synced",
          };
          await localStorage.addPhoto(this.config.userId, newPhoto);
          result.downloaded++;
        } else {
          // Conflits
          if (localPhoto.lastModified > serverPhoto.lastModified) {
            try {
              let downloadUrl = localPhoto.uri;
              let storagePath = localPhoto.storagePath;

              if (localPhoto.uri.startsWith("file://")) {
                const uploadResult = await this.uploadImage(localPhoto.uri, localPhoto.id);
                downloadUrl = uploadResult.downloadUrl;
                storagePath = uploadResult.storagePath;
              }

              await setDoc(doc(db, "photos", localPhoto.id), {
                ...localPhoto,
                uri: downloadUrl,
                storagePath,
                userId: this.config.userId,
                syncStatus: "synced",
                updatedAt: serverTimestamp(),
                lastModified: localPhoto.lastModified,
                version: (localPhoto.version ?? 0) + 1,
              });

              result.conflicts++;
            } catch (err: any) {
              result.errors.push(`Erreur résolution conflit ${localPhoto.id}: ${err.message}`);
            }
          } else if (serverPhoto.lastModified > localPhoto.lastModified) {
            const localUri = await this.downloadImage(serverPhoto.uri, serverPhoto.id);
            const updatedPhoto: JournalPhoto = {
              ...serverPhoto,
              uri: localUri,
              syncStatus: "synced",
            };
            await this.replaceLocalPhoto(updatedPhoto);
            result.downloaded++;
          }
        }
      }

      result.duration = Date.now() - start;
      return result;
    } catch (err: any) {
      result.errors.push(`Erreur générale: ${err.message}`);
      result.duration = Date.now() - start;
      return result;
    }
  }

  /** Synchroniser le profil local ↔ cloud */
  async syncProfile(): Promise<ProfileState> {
    this.checkAuth();

    const localProfile = await localStorage.loadProfile(this.config.userId);

    try {
      const profileRef = doc(db, "profiles", this.config.userId);
      const snap = await getDoc(profileRef);

      if (!snap.exists() || localProfile.lastModified > (snap.data()?.lastModified ?? 0)) {
        // Upload local
        const newProfile = {
          ...localProfile,
          userId: this.config.userId,
          lastModified: Date.now(),
          version: (localProfile.version ?? 0) + 1,
          updatedAt: serverTimestamp(),
        };
        await setDoc(profileRef, newProfile);
        await localStorage.saveProfile(this.config.userId, { ...newProfile, syncStatus: "synced" });
        return { ...newProfile, syncStatus: "synced" };
      }

      // Cloud plus récent
      const serverProfile = snap.data() as ProfileState;
      if (serverProfile.version > (localProfile.version ?? 0)) {
        await localStorage.saveProfile(this.config.userId, { ...serverProfile, syncStatus: "synced" });
        return { ...serverProfile, syncStatus: "synced" };
      }

      return localProfile;
    } catch (err: any) {
      console.error("Erreur sync profil:", err);
      return { ...localProfile, syncStatus: "error" };
    }
  }

  /** Upload image dans Firebase Storage */
  private async uploadImage(localUri: string, photoId: string) {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const storagePath = `photos/${this.config.userId}/${photoId}.jpg`;
    const imageRef = ref(storage, storagePath);

    await uploadBytes(imageRef, blob);
    const downloadUrl = await getDownloadURL(imageRef);

    return { downloadUrl, storagePath };
  }

  /** Télécharger une image depuis Firebase Storage */
  private async downloadImage(storageUrl: string, photoId: string): Promise<string> {
    const fileName = `photo_${photoId}_${Date.now()}.jpg`;
    const localPath = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.downloadAsync(storageUrl, localPath);
    return localPath;
  }

  /** Remplacer une photo en local */
  private async replaceLocalPhoto(photo: JournalPhoto) {
    const photos = await localStorage.loadAll(this.config.userId);
    const updated = photos.map((p) => (p.id === photo.id ? photo : p));
    await localStorage.saveAll(this.config.userId, updated);
  }

  /** Supprimer une photo */
  async deletePhoto(photoId: string, storagePath?: string): Promise<void> {
    this.checkAuth();
    await deleteDoc(doc(db, "photos", photoId));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch (e) {
        console.warn("Suppression storage échouée:", e);
      }
    }
    const localPhotos = await localStorage.loadAll(this.config.userId);
    const updated = localPhotos.filter((p) => p.id !== photoId);
    await localStorage.saveAll(this.config.userId, updated);
  }
}
