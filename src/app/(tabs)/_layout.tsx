import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LayoutDashboard, Swords, ShieldBan, Trophy } from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { lightTheme, darkTheme } from '../../theme/colors';

export default function TabLayout() {
  const { themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
        ],
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
              <LayoutDashboard size={size ?? 20} color={color} />
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
              <Swords size={size ?? 20} color={color} />
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
              <ShieldBan size={size ?? 20} color={color} />
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
              <Trophy size={size ?? 20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconWrapper: {
    padding: 4,
    borderRadius: 8,
  },
});
