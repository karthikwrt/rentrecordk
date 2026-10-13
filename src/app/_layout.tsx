import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { DATABASE_NAME, migrateDb } from '@/db/schema';
import { AppStateProvider } from '@/state/app-state';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDb}>
        <AppStateProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ presentation: 'modal' }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="property-form" options={{ title: 'Property' }} />
            <Stack.Screen name="person-form" options={{ title: 'Person' }} />
            <Stack.Screen name="tenancy-form" options={{ title: 'Tenancy' }} />
            <Stack.Screen name="payment-form" options={{ title: 'Payment' }} />
          </Stack>
        </AppStateProvider>
      </SQLiteProvider>
    </ThemeProvider>
  );
}
