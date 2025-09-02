// src/styles/globalStyles.ts
import { StyleSheet, TextStyle, ViewStyle, TextInputProps } from 'react-native';

// ✅ Couleurs principales
export const colors = {
  primary: '#2563eb',
  success: '#10b981',
  danger: '#ef4444',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  dark: '#334155',
  white: '#ffffff',
  black: '#000000',
};

// ✅ Espacements
export const spacing = {
  xs: 4,
  s: 8,
  m: 16,
  l: 24,
  xl: 32,
};

// ✅ Rayons de bordure
export const borderRadius = {
  s: 4,
  m: 8,
  l: 16,
};

// ✅ Typographie
export const typography = {
  h1: { fontSize: 28, fontWeight: '800', color: colors.black } as TextStyle,
  h2: { fontSize: 20, fontWeight: '700', color: colors.black } as TextStyle,
  body: { fontSize: 16, color: colors.black } as TextStyle,
  bodySmall: { fontSize: 14, color: colors.gray } as TextStyle,
};

// ✅ Styles globaux réutilisables
export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.m,
    backgroundColor: colors.lightGray,
  } as ViewStyle,

  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.l,
    padding: spacing.m,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  inputGroup: {
    marginBottom: spacing.m,
  } as ViewStyle,

  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: borderRadius.m,
    padding: spacing.m,
    backgroundColor: colors.lightGray,
    fontSize: 16,
  } as TextStyle,

  label: {
    marginBottom: spacing.s,
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray,
  } as TextStyle,

  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.m,
    borderRadius: borderRadius.m,
    alignItems: 'center',
  } as ViewStyle,

  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  } as TextStyle,

  h1: typography.h1,
  h2: typography.h2,
  bodySmall: typography.bodySmall,
});
