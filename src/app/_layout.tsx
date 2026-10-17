import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';

export default function RootLayout() {
  const { checkAndExpireUnlocks, resetDailyStatsIfNeeded, themeMode } = useAppStore();

  useEffect(() => {
    // 1. Kiểm tra qua ngày mới ngay khi mở app
    resetDailyStatsIfNeeded();
    checkAndExpireUnlocks();

    // 2. Lắng nghe sự kiện chuyển đổi trạng thái ứng dụng (AppState: active/background)
    // Khi user quay lại app từ màn hình khác hoặc từ hôm trước sang hôm sau -> kiểm tra và reset ngay lập tức
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resetDailyStatsIfNeeded();
        checkAndExpireUnlocks();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // 3. Chu kỳ định kỳ mỗi 5 giây:
    // Tự động hết hạn unlock và tự động phát hiện chuyển sang ngày mới lúc 00:00 thời gian thực
    const interval = setInterval(() => {
      resetDailyStatsIfNeeded();
      checkAndExpireUnlocks();
    }, 5000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const isDark = themeMode === 'dark';

  return (
    <SafeAreaProvider>
      <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
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
  },
});
