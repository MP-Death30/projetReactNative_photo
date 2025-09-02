import * as React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import JournalProvider from './src/context/JournalProvider';
import CameraScreen from './src/screens/CameraScreen';
import CalendarScreen from './src/screens/CalendarScreen';
import PhotosScreen from './src/screens/PhotosScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import MapScreen from './src/screens/MapScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <JournalProvider>
      <NavigationContainer>
        <Tab.Navigator screenOptions={{ headerShown: true }}>
          <Tab.Screen name="Caméra" component={CameraScreen} options={{ tabBarIcon: () => <Text>📷</Text> }} />
          <Tab.Screen name="Carte" component={MapScreen} options={{ tabBarIcon: () => <Text>🗺️</Text> }} />
          <Tab.Screen name="Calendrier" component={CalendarScreen} options={{ tabBarIcon: () => <Text>📅</Text> }} />
          <Tab.Screen name="Photos" component={PhotosScreen} options={{ tabBarIcon: () => <Text>🖼️</Text> }} />
          <Tab.Screen name="Profil" component={ProfileScreen} options={{ tabBarIcon: () => <Text>👤</Text> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </JournalProvider>
  );
}
