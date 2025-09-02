import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JournalPhoto, ProfileState } from './types';

// Clés de stockage par utilisateur
const getUserPhotosKey = (userId: string) => `journal_photos_${userId}`;
const getUserProfileKey = (userId: string) => `journal_profile_${userId}`;

// Stockage des photos par utilisateur
export const loadAll = async (userId: string): Promise<JournalPhoto[]> => {
  try {
    const data = await AsyncStorage.getItem(getUserPhotosKey(userId));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveAll = async (userId: string, photos: JournalPhoto[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(getUserPhotosKey(userId), JSON.stringify(photos));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des photos:', error);
  }
};

// Stockage du profil par utilisateur
export const loadProfile = async (userId: string): Promise<ProfileState> => {
  try {
    const data = await AsyncStorage.getItem(getUserProfileKey(userId));
    return data ? JSON.parse(data) : { name: 'Voyageur', avatarUri: null };
  } catch {
    return { name: 'Voyageur', avatarUri: null };
  }
};

export const saveProfile = async (userId: string, profile: ProfileState): Promise<void> => {
  try {
    await AsyncStorage.setItem(getUserProfileKey(userId), JSON.stringify(profile));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du profil:', error);
  }
};

// Fonction utilitaire pour migrer les données existantes vers un utilisateur spécifique
export const migrateDataToUser = async (userId: string): Promise<void> => {
  try {
    // Migrer les photos existantes
    const oldPhotos = await AsyncStorage.getItem('journal_photos');
    if (oldPhotos) {
      await AsyncStorage.setItem(getUserPhotosKey(userId), oldPhotos);
      await AsyncStorage.removeItem('journal_photos');
    }

    // Migrer le profil existant
    const oldProfile = await AsyncStorage.getItem('journal_profile');
    if (oldProfile) {
      await AsyncStorage.setItem(getUserProfileKey(userId), oldProfile);
      await AsyncStorage.removeItem('journal_profile');
    }
  } catch (error) {
    console.error('Erreur lors de la migration des données:', error);
  }
};