// src/services/firebaseAuthService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { User, LoginCredentials, RegisterCredentials } from '../types';

export class FirebaseAuthService {
  // 📧 Inscription
  async register(credentials: RegisterCredentials): Promise<User> {
    try {
      // Créer l'utilisateur dans Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      
      const firebaseUser = userCredential.user;
      
      // Mettre à jour le profil Firebase
      await updateProfile(firebaseUser, {
        displayName: credentials.name
      });
      
      // Créer le document utilisateur dans Firestore
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: credentials.name,
        createdAt: Date.now()
      };
      
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return userData;
      
    } catch (error: any) {
      // Traduire les erreurs Firebase
      throw new Error(this.translateFirebaseError(error.code));
    }
  }

  // 🔐 Connexion
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      
      const firebaseUser = userCredential.user;
      
      // Récupérer les données utilisateur depuis Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: userData.name || firebaseUser.displayName || 'Utilisateur',
          avatarUri: userData.avatarUri,
          createdAt: userData.createdAt?.toMillis() || Date.now()
        };
      } else {
        // Si le document n'existe pas, le créer
        const userData: User = {
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          name: firebaseUser.displayName || 'Utilisateur',
          createdAt: Date.now()
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return userData;
      }
      
    } catch (error: any) {
      throw new Error(this.translateFirebaseError(error.code));
    }
  }

  // 🚪 Déconnexion
  async logout(): Promise<void> {
    await signOut(auth);
  }

  // 👤 Mettre à jour le profil
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    try {
      // Mettre à jour Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });
      
      // Mettre à jour Firebase Auth si nécessaire
      const currentUser = auth.currentUser;
      if (currentUser && updates.name) {
        await updateProfile(currentUser, {
          displayName: updates.name
        });
      }
      
      // Récupérer le profil mis à jour
      const updatedDoc = await getDoc(userRef);
      const userData = updatedDoc.data()!;
      
      return {
        id: userId,
        email: userData.email,
        name: userData.name,
        avatarUri: userData.avatarUri,
        createdAt: userData.createdAt?.toMillis() || Date.now()
      };
      
    } catch (error: any) {
      throw new Error(`Erreur mise à jour profil: ${error.message}`);
    }
  }

  // 👂 Écouter les changements d'authentification
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Récupérer les données complètes depuis Firestore
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const user: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email!,
              name: userData.name || firebaseUser.displayName || 'Utilisateur',
              avatarUri: userData.avatarUri,
              createdAt: userData.createdAt?.toMillis() || Date.now()
            };
            callback(user);
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Erreur lors de la récupération du profil utilisateur:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  // 🌍 Traduire les erreurs Firebase
  private translateFirebaseError(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'Aucun compte trouvé avec cet email';
      case 'auth/wrong-password':
        return 'Mot de passe incorrect';
      case 'auth/email-already-in-use':
        return 'Un compte existe déjà avec cet email';
      case 'auth/weak-password':
        return 'Le mot de passe est trop faible';
      case 'auth/invalid-email':
        return 'Email invalide';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case 'auth/network-request-failed':
        return 'Erreur de connexion. Vérifiez votre connexion internet';
      default:
        return 'Une erreur est survenue lors de l\'authentification';
    }
  }

  // 🔍 Obtenir l'utilisateur actuel
  getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: firebaseUser.displayName || 'Utilisateur',
      createdAt: Date.now() // Sera mis à jour par onAuthStateChange
    };
  }

  // 🎫 Obtenir le token d'authentification
  async getAuthToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;
    
    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Erreur récupération token:', error);
      return null;
    }
  }
}