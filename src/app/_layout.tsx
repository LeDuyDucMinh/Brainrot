import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';

export default function RootLayout() {
  const { checkAndExpireUnlocks, resetDailyStatsIfNeeded } = useAppStore();

  useEffect(() => {
    // Reset daily stats nếu qua ngày mới
    resetDailyStatsIfNeeded();

    // Check expire unlocks mỗi 5 giây
    const interval = setInterval(() => {
      checkAndExpireUnlocks();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0F172A' },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});
