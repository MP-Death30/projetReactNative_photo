import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JournalPhoto, ProfileState } from '../types';
import { loadAll, saveAll, loadProfile, saveProfile, migrateDataToUser } from '../storage';
import { useAuth } from './AuthProvider';
import { saveImageToLocal } from '../fileManager';

type Ctx = {
  photos: JournalPhoto[];
  addPhoto: (p: JournalPhoto) => void;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, patch: Partial<JournalPhoto>) => void;
  profile: ProfileState;
  setProfile: (p: ProfileState) => void;
  isLoading: boolean;
};

const Context = createContext<Ctx | null>(null);

export const useJournal = () => {
  const v = useContext(Context);
  if (!v) throw new Error('useJournal must be used within JournalProvider');
  return v;
};

export default function JournalProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [profile, setProfile] = useState<ProfileState>({ name: 'Voyageur', avatarUri: null });
  const [isLoading, setIsLoading] = useState(false);

  // Charger les données de l'utilisateur connecté
  useEffect(() => {
    if (isAuthenticated && user) {
      setIsLoading(true);
      
      // Charger les données de l'utilisateur
      Promise.all([
        loadAll(user.id),
        loadProfile(user.id)
      ]).then(([userPhotos, userProfile]) => {
        setPhotos(userPhotos);
        
        // Synchroniser le profil avec les données utilisateur
        const syncedProfile = {
          name: user.name || userProfile.name,
          avatarUri: user.avatarUri || userProfile.avatarUri,
        };
        setProfile(syncedProfile);
        setIsLoading(false);
      }).catch((error) => {
        console.error('Erreur lors du chargement des données:', error);
        setIsLoading(false);
      });

      // Migration des anciennes données si c'est un nouvel utilisateur
      migrateDataToUser(user.id).catch(console.error);
    } else {
      // Réinitialiser les données si pas d'utilisateur connecté
      setPhotos([]);
      setProfile({ name: 'Voyageur', avatarUri: null });
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  // Sauvegarder les photos quand elles changent
  useEffect(() => {
    if (isAuthenticated && user && photos.length >= 0) {
      saveAll(user.id, photos);
    }
  }, [photos, user, isAuthenticated]);

  // Sauvegarder le profil quand il change
  useEffect(() => {
    if (isAuthenticated && user) {
      saveProfile(user.id, profile);
    }
  }, [profile, user, isAuthenticated]);

  const addPhoto = async (p: JournalPhoto) => {
    if (!isAuthenticated || !user) return;
    // Copier l'image dans un chemin persistant
    const localPath = await saveImageToLocal(p.uri);
    if (!localPath) return;

    const newPhoto = { ...p, uri: localPath };
    setPhotos(prev => [newPhoto, ...prev]);
  };

  const removePhoto = (id: string) => {
    if (!isAuthenticated) return;
    setPhotos(prev => prev.filter(x => x.id !== id));
  };

  const updatePhoto = (id: string, patch: Partial<JournalPhoto>) => {
    if (!isAuthenticated) return;
    setPhotos(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)));
  };

  const handleSetProfile = (p: ProfileState) => {
    if (!isAuthenticated) return;
    setProfile(p);
  };

  return (
    <Context.Provider value={{ 
      photos, 
      addPhoto, 
      removePhoto, 
      updatePhoto, 
      profile, 
      setProfile: handleSetProfile,
      isLoading 
    }}>
      {children}
    </Context.Provider>
  );
}