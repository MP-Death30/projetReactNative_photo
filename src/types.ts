// src/types.ts - Version avec synchronisation
export interface JournalPhoto {
  id: string;
  uri: string;
  timestamp: number;
  dateISO: string;
  locationName?: string | null;
  title?: string;
  note?: string;
  
  // 🆕 Champs de synchronisation
  serverId?: string;           // ID sur le serveur
  version: number;             // Version pour détecter les conflits
  lastModified: number;        // Timestamp de dernière modification
  syncStatus: SyncStatus;      // État de synchronisation
  needsUpload?: boolean;       // Flag pour upload d'image
}

export type SyncStatus = 
  | 'synced'      // Synchronisé avec le serveur
  | 'pending'     // En attente de synchronisation
  | 'conflict'    // Conflit détecté
  | 'error'       // Erreur de synchronisation
  | 'uploading'   // Upload en cours
  | 'downloading';// Download en cours

export interface ProfileState {
  name: string;
  avatarUri?: string | null;
  
  // 🆕 Champs de synchronisation
  version: number;
  lastModified: number;
  syncStatus: SyncStatus;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUri?: string;
  createdAt: number;
}

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
}

// 🆕 Types pour la synchronisation
export interface SyncResult {
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  duration: number;
}

export interface SyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  wifiOnlySync: boolean;
  maxRetries: number;
}

export interface ConflictResolution {
  photoId: string;
  strategy: 'keepLocal' | 'keepServer' | 'merge';
  resolvedPhoto: JournalPhoto;
}

export interface NetworkStatus {
  isConnected: boolean;
  connectionType: 'wifi' | 'cellular' | 'unknown';
}

// 🆕 Helper pour créer une nouvelle photo
export const createJournalPhoto = (
  uri: string, 
  locationName?: string | null
): JournalPhoto => ({
  id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  uri,
  timestamp: Date.now(),
  dateISO: new Date().toISOString().split('T')[0],
  locationName,
  version: 1,
  lastModified: Date.now(),
  syncStatus: 'pending',
  needsUpload: true,
});

// 🆕 Helper pour créer un profil initial
export const createInitialProfile = (name: string = 'Voyageur'): ProfileState => ({
  name,
  avatarUri: null,
  version: 1,
  lastModified: Date.now(),
  syncStatus: 'pending',
});

export const todayISO = () => new Date().toISOString().split('T')[0];