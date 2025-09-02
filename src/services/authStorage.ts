import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, LoginCredentials } from '../types';

const USERS_KEY = 'journal_users';
const CURRENT_USER_KEY = 'journal_current_user';

interface StoredUser extends User {
  passwordHash: string;
}

// Hash simple pour le mot de passe (à remplacer par bcrypt en production)
const simpleHash = (password: string): string => {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

export const authStorage = {
  // Récupérer tous les utilisateurs
  async getAllUsers(): Promise<StoredUser[]> {
    try {
      const data = await AsyncStorage.getItem(USERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  // Sauvegarder tous les utilisateurs
  async saveAllUsers(users: StoredUser[]): Promise<void> {
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // Créer un nouvel utilisateur
  async createUser(email: string, password: string, name: string): Promise<User> {
    const users = await this.getAllUsers();
    
    // Vérifier si l'email existe déjà
    if (users.find(u => u.email === email)) {
      throw new Error('Un compte avec cet email existe déjà');
    }

    const newUser: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      email,
      name,
      passwordHash: simpleHash(password),
      createdAt: Date.now(),
    };

    users.push(newUser);
    await this.saveAllUsers(users);

    // Retourner l'utilisateur sans le hash du mot de passe
    const { passwordHash, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  },

  // Authentifier un utilisateur
  async authenticateUser(credentials: LoginCredentials): Promise<User> {
    const users = await this.getAllUsers();
    const user = users.find(u => 
      u.email === credentials.email && 
      u.passwordHash === simpleHash(credentials.password)
    );

    if (!user) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Retourner l'utilisateur sans le hash du mot de passe
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },

  // Sauvegarder l'utilisateur actuel
  async saveCurrentUser(user: User | null): Promise<void> {
    if (user) {
      await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(CURRENT_USER_KEY);
    }
  },

  // Récupérer l'utilisateur actuel
  async getCurrentUser(): Promise<User | null> {
    try {
      const data = await AsyncStorage.getItem(CURRENT_USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // Mettre à jour le profil utilisateur
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const users = await this.getAllUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new Error('Utilisateur non trouvé');
    }

    // Mettre à jour l'utilisateur stocké
    users[userIndex] = { ...users[userIndex], ...updates };
    await this.saveAllUsers(users);

    // Mettre à jour l'utilisateur courant si c'est le même
    const currentUser = await this.getCurrentUser();
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...updates };
      await this.saveCurrentUser(updatedUser);
      return updatedUser;
    }

    const { passwordHash, ...userWithoutPassword } = users[userIndex];
    return userWithoutPassword;
  },

  // Déconnexion
  async logout(): Promise<void> {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
  },
};