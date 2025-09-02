import AsyncStorage from '@react-native-async-storage/async-storage';
import type { JournalPhoto, ProfileState } from './types';

const STORAGE_KEY = 'JOURNAL_PHOTOS_V2_EXPO';
const PROFILE_KEY = 'PROFILE_V1';

export async function loadAll(): Promise<JournalPhoto[]> {
  try { const raw = await AsyncStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}
export async function saveAll(items: JournalPhoto[]) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export async function loadProfile(): Promise<ProfileState> {
  try { const raw = await AsyncStorage.getItem(PROFILE_KEY); return raw ? JSON.parse(raw) : { name: 'Voyageur', avatarUri: null }; }
  catch { return { name: 'Voyageur', avatarUri: null }; }
}
export async function saveProfile(p: ProfileState) {
  try { await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}
