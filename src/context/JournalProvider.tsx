import React, { createContext, useContext, useEffect, useState } from 'react';
import type { JournalPhoto, ProfileState } from '../types';
import { loadAll, saveAll, loadProfile, saveProfile } from '../storage';

type Ctx = {
  photos: JournalPhoto[];
  addPhoto: (p: JournalPhoto) => void;
  removePhoto: (id: string) => void;
  updatePhoto: (id: string, patch: Partial<JournalPhoto>) => void;
  profile: ProfileState;
  setProfile: (p: ProfileState) => void;
};

const Context = createContext<Ctx | null>(null);
export const useJournal = () => {
  const v = useContext(Context);
  if (!v) throw new Error('useJournal must be used within JournalProvider');
  return v;
};

export default function JournalProvider({ children }: { children: React.ReactNode }) {
  const [photos, setPhotos] = useState<JournalPhoto[]>([]);
  const [profile, setProfile] = useState<ProfileState>({ name: 'Voyageur', avatarUri: null });

  useEffect(() => { loadAll().then(setPhotos); loadProfile().then(setProfile); }, []);
  useEffect(() => { saveAll(photos); }, [photos]);
  useEffect(() => { saveProfile(profile); }, [profile]);

  const addPhoto = (p: JournalPhoto) => setPhotos(prev => [p, ...prev]);
  const removePhoto = (id: string) => setPhotos(prev => prev.filter(x => x.id !== id));
  const updatePhoto = (id: string, patch: Partial<JournalPhoto>) =>
    setPhotos(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <Context.Provider value={{ photos, addPhoto, removePhoto, updatePhoto, profile, setProfile }}>
      {children}
    </Context.Provider>
  );
}
