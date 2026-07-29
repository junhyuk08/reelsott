import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { SessionProvider, useSession } from '@/hooks/use-session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <SessionProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <RootLayoutContent />
      </ThemeProvider>
    </SessionProvider>
  );
}

function RootLayoutContent() {
  const { loading } = useSession();
  return (
    <>
      <AnimatedSplashOverlay ready={!loading} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="drama/[id]" />
        <Stack.Screen name="watch/[dramaId]" />
        <Stack.Screen name="favorites" options={{ headerShown: true, title: '찜한 작품' }} />
        <Stack.Screen name="watch-history" options={{ headerShown: true, title: '시청기록' }} />
        <Stack.Screen name="new-dramas" options={{ headerShown: true, title: '새로운 드라마' }} />
      </Stack>
    </>
  );
}
