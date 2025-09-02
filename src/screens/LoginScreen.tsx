import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { validatePassword } from '../utils/passwordValidator';
import { globalStyles, colors } from '../styles/globalStyles';

export default function LoginScreen() {
  const { login, register, isLoading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (!isLoginMode && !name)) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    // Validation de complexité uniquement en création de compte
    if (!isLoginMode) {
      const { valid, errors } = validatePassword(password);
      if (!valid) {
        Alert.alert(
          'Mot de passe invalide',
          `Le mot de passe doit respecter les règles suivantes :\n\n• ${errors.join('\n• ')}`
        );
        return;
      }
    }

    try {
      if (isLoginMode) {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Une erreur est survenue'
      );
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <KeyboardAvoidingView 
      style={globalStyles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={globalStyles.card}>
          {/* Titre */}
          <Text style={globalStyles.h1}>
            {isLoginMode ? 'Connexion' : 'Créer un compte'}
          </Text>

          {/* Sous-titre */}
          <Text style={globalStyles.bodySmall}>
            {isLoginMode 
              ? 'Connectez-vous à votre journal de voyage' 
              : 'Créez votre journal de voyage personnel'
            }
          </Text>

          {/* Nom (création compte) */}
          {!isLoginMode && (
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Nom</Text>
              <TextInput
                style={globalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Votre nom"
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Email</Text>
            <TextInput
              style={globalStyles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Mot de passe */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Mot de passe</Text>
            <TextInput
              style={globalStyles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Votre mot de passe"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Bouton principal */}
          <Pressable 
            style={[globalStyles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={globalStyles.buttonText}>
              {isLoading 
                ? 'Chargement...' 
                : isLoginMode 
                  ? 'Se connecter' 
                  : 'Créer le compte'
              }
            </Text>
          </Pressable>

          {/* Basculer mode login / création compte */}
          <Pressable style={styles.switchButton} onPress={toggleMode}>
            <Text style={styles.switchButtonText}>
              {isLoginMode 
                ? 'Pas encore de compte ? Créer un compte' 
                : 'Déjà un compte ? Se connecter'
              }
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  switchButton: {
    marginTop: 24,
    paddingVertical: 12,
  },
  switchButtonText: {
    color: colors.primary,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});
