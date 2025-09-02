import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthProvider';
import { globalStyles, colors, spacing, borderRadius, typography } from '../styles/globalStyles';

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

    try {
      if (isLoginMode) {
        await login({ email, password });
      } else {
        await register({ email, password, name });
      }
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
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
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[globalStyles.card, styles.form]}>
          <Text style={[globalStyles.h1, styles.title]}>
            {isLoginMode ? 'Connexion' : 'Créer un compte'}
          </Text>
          <Text style={[globalStyles.bodySmall, styles.subtitle]}>
            {isLoginMode 
              ? 'Connectez-vous à votre journal de voyage' 
              : 'Créez votre journal de voyage personnel'
            }
          </Text>

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