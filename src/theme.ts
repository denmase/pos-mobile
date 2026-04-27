import { MD3LightTheme } from 'react-native-paper';

export const appTheme = {
  ...MD3LightTheme,
  roundness: 5,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#0f6b5f',
    onPrimary: '#ffffff',
    primaryContainer: '#d8f3ec',
    onPrimaryContainer: '#093d36',
    secondary: '#5b6477',
    tertiary: '#9a5c1f',
    surface: '#ffffff',
    surfaceVariant: '#eef2f6',
    background: '#f4f7f8',
    outline: '#d7dde5',
    outlineVariant: '#e8edf2',
    error: '#b42318',
  },
};
