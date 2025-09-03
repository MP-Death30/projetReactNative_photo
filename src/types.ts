export interface JournalPhoto {
  id: string;
  uri: string;
  timestamp: number;
  dateISO: string;
  locationName?: string | null;
  title?: string;
  note?: string;
}

export interface ProfileState {
  name: string;
  avatarUri?: string | null;
}

export const todayISO = () => new Date().toISOString().split('T')[0];


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

