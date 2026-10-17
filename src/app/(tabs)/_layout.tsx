import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LayoutDashboard, Swords, ShieldBan, Trophy } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../../store/useAppStore';
import { lightTheme, darkTheme } from '../../theme/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  // Tính toán chiều cao và đệm dưới chuẩn xác:
  // - Khi có Home Bar (iPhone tai thỏ / Dynamic Island, insets.bottom ~ 34pt):
  //   Chiều cao = 64 + insets.bottom (~98pt), padding dưới = insets.bottom
  // - Khi không có Home Bar (iPhone SE, web, simulator không có inset):
  //   Chiều cao = 72pt, padding dưới = 10pt (đủ không gian cho chữ hiển thị trọn vẹn, không bị cắt chân chữ)
  const hasBottomInset = insets.bottom > 0;
  const bottomPadding = hasBottomInset ? insets.bottom : 10;
  const tabHeight = hasBottomInset ? 62 + insets.bottom : 72;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          height: tabHeight,
          paddingTop: 6,
          paddingBottom: bottomPadding,
          elevation: 10,
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryLight }]}>
              <LayoutDashboard size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="quests"
        options={{
          title: 'Nhiệm vụ',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryLight }]}>
              <Swords size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="blocker"
        options={{
          title: 'Khóa & Shop',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryLight }]}>
              <ShieldBan size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thành tựu',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.iconWrapper, focused && { backgroundColor: colors.primaryLight }]}>
              <Trophy size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 2,
    marginBottom: 2,
  },
  iconWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
