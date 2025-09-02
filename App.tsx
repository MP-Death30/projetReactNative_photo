import * as React from 'react';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import AuthProvider, { useAuth } from './src/context/AuthProvider';
import JournalProvider from './src/context/JournalProvider';
import LoginScreen from './src/screens/LoginScreen';
import CameraScreen from './src/screens/CameraScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';

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
              tabBarStyle: {
                backgroundColor: 'white',
                borderTopWidth: 1,
                borderTopColor: '#e5e7eb',
                paddingTop: 8,
                paddingBottom: 8,
                height: 70,
              },
              tabBarActiveTintColor: '#2563eb',
              tabBarInactiveTintColor: '#6b7280',
            }}
          >
            <Tab.Screen 
              name="Caméra" 
              component={CameraScreen} 
              options={{ 
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>📷</Text>
                ),
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
              }} 
            />
            <Tab.Screen 
              name="Carte" 
              component={MapScreen} 
              options={{ 
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>🗺️</Text>
                ),
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
              }} 
            />
            <Tab.Screen 
              name="Calendrier" 
              component={CalendarScreen} 
              options={{ 
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>📅</Text>
                ),
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
              }} 
            />
            <Tab.Screen 
              name="Photos" 
              component={PhotosScreen} 
              options={{ 
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>🖼️</Text>
                ),
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
              }} 
            />
            <Tab.Screen 
              name="Profil" 
              component={ProfileScreen} 
              options={{ 
                tabBarIcon: ({ color }) => (
                  <Text style={{ fontSize: 24, color }}>👤</Text>
                ),
                headerStyle: { backgroundColor: '#2563eb' },
                headerTintColor: 'white',
                headerTitleStyle: { fontWeight: 'bold' },
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
 