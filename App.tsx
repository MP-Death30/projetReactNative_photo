import * as React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { getStatusBarHeight } from 'react-native-status-bar-height';

import AuthProvider, { useAuth } from './src/context/AuthProvider';
import JournalProvider from './src/context/JournalProvider';
import LoginScreen from './src/screens/LoginScreen';
import CameraScreen from './src/screens/CameraScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';

import { colors } from './src/styles/globalStyles'; // ✅ import styles navigation
import { navigationStyles } from './src/styles/navigationStyles';

const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#2563eb" />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );
}

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <JournalProvider>
      <NavigationContainer>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <Tab.Navigator
            screenOptions={{
              headerShown: true,
              headerStyle: {
                backgroundColor: colors.primary,
                height: 64 + getStatusBarHeight(), // ajuste le rectangle bleu avec la Safe Area
                shadowColor: 'transparent',
                elevation: 0,
              },
              headerTintColor: colors.white,
              headerTitleAlign: 'center',
              headerTitleStyle: navigationStyles.headerTitle,
              tabBarStyle: navigationStyles.tabBar,
              tabBarActiveTintColor: colors.primary,
              tabBarInactiveTintColor: colors.gray,
            }}
          >
            <Tab.Screen
              name="Caméra"
              component={CameraScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>📷</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Carte"
              component={MapScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>🗺️</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Calendrier"
              component={CalendarScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>📅</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Photos"
              component={PhotosScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>🖼️</Text>
                ),
              }}
            />
            <Tab.Screen
              name="Profil"
              component={ProfileScreen}
              options={{
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>👤</Text>
                ),
              }}
            />
          </Tab.Navigator>
        </SafeAreaView>
      </NavigationContainer>
    </JournalProvider>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000ff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
});