// src/styles/navigationStyles.ts
import { StyleSheet } from 'react-native';

export const navigationStyles = {
  tabBar: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  header: {
    backgroundColor: '#2563eb',
    height: 64, // légèrement plus haut pour centrer le titre
  },
  headerTitle: {
    fontWeight: 'bold',
    fontSize: 22, // titre plus gros
    color: 'white',
    textAlign: 'center', // horizontal
    alignSelf: 'center', // vertical sur Android
  },
};