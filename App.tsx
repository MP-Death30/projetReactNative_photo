import * as React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthProvider, { useAuth } from './src/auth/AuthProvider';
import LoginScreen from './src/auth/LoginScreen';
import RegisterScreen from './src/auth/RegisterScreen';

import JournalProvider from './src/context/JournalProvider';
import CameraScreen from './src/screens/CameraScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function AppTabs() {
  return (
    <JournalProvider>
      <Tab.Navigator screenOptions={{ headerShown: true }}>
        <Tab.Screen name="Caméra" component={CameraScreen} options={{ tabBarIcon: () => <Text>📷</Text> }} />
        <Tab.Screen name="Carte" component={MapScreen} options={{ tabBarIcon: () => <Text>🗺️</Text> }} />
        <Tab.Screen name="Calendrier" component={CalendarScreen} options={{ tabBarIcon: () => <Text>📅</Text> }} />
        <Tab.Screen name="Photos" component={PhotosScreen} options={{ tabBarIcon: () => <Text>🖼️</Text> }} />
        <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: () => <Text>👤</Text> }} />
      </Tab.Navigator>
    </JournalProvider>
  );
}

function RootNavigator() {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? (
        <AppTabs />
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
