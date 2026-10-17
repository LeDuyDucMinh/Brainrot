import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Dumbbell,
  Brain,
  Flame,
  Coins,
  Sparkles,
  BookOpen,
  Heart,
  ShieldCheck,
} from 'lucide-react-native';
import { useAppStore } from '../../store/useAppStore';
import { PushupCounter } from '../../components/PushupCounter';
import { DeepWorkTimer } from '../../components/DeepWorkTimer';
import { GymTracker } from '../../components/GymTracker';
import { ReadingTracker } from '../../components/ReadingTracker';
import { MeditationTracker } from '../../components/MeditationTracker';
import { lightTheme, darkTheme } from '../../theme/colors';

type ActiveQuestTab = 'pushup' | 'deepwork' | 'gym' | 'reading' | 'meditation';

export default function QuestsScreen() {
  const { coins, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const [activeTab, setActiveTab] = useState<ActiveQuestTab>('pushup');

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>TRUNG TÂM CÀY NHIỆM VỤ</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Đổ mồ hôi · Nhận Coins · Cứu vớt bộ não
          </Text>
        </View>
        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={16} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>{coins}</Text>
        </View>
      </View>

      {/* Quest Switcher Horizontal Scroll */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {/* 1. Hít Đất */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
              activeTab === 'pushup' && [styles.tabActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('pushup')}
            activeOpacity={0.8}
          >
            <Dumbbell size={16} color={activeTab === 'pushup' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'pushup' ? colors.primary : colors.textMuted }]}>
              Hít Đất
            </Text>
          </TouchableOpacity>

          {/* 2. Deep Work */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
              activeTab === 'deepwork' && [styles.tabActive, { backgroundColor: colors.secondaryLight, borderColor: colors.secondary }],
            ]}
            onPress={() => setActiveTab('deepwork')}
            activeOpacity={0.8}
          >
            <Brain size={16} color={activeTab === 'deepwork' ? colors.secondary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'deepwork' ? colors.secondary : colors.textMuted }]}>
              Deep Work
            </Text>
          </TouchableOpacity>

          {/* 3. Tập Gym */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
              activeTab === 'gym' && [styles.tabActive, { backgroundColor: colors.warningLight, borderColor: colors.warning }],
            ]}
            onPress={() => setActiveTab('gym')}
            activeOpacity={0.8}
          >
            <Flame size={16} color={activeTab === 'gym' ? colors.warning : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'gym' ? colors.warning : colors.textMuted }]}>
              Tập Gym
            </Text>
          </TouchableOpacity>

          {/* 4. Đọc Sách */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
              activeTab === 'reading' && [styles.tabActive, { backgroundColor: colors.infoLight, borderColor: colors.info }],
            ]}
            onPress={() => setActiveTab('reading')}
            activeOpacity={0.8}
          >
            <BookOpen size={16} color={activeTab === 'reading' ? colors.info : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'reading' ? colors.info : colors.textMuted }]}>
              Đọc Sách
            </Text>
          </TouchableOpacity>

          {/* 5. Thiền Định */}
          <TouchableOpacity
            style={[
              styles.tabButton,
              { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
              activeTab === 'meditation' && [styles.tabActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
            ]}
            onPress={() => setActiveTab('meditation')}
            activeOpacity={0.8}
          >
            <Heart size={16} color={activeTab === 'meditation' ? colors.primary : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'meditation' ? colors.primary : colors.textMuted }]}>
              Thiền Định
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Quest Content */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'pushup' && <PushupCounter />}
        {activeTab === 'deepwork' && <DeepWorkTimer />}
        {activeTab === 'gym' && <GymTracker />}
        {activeTab === 'reading' && <ReadingTracker />}
        {activeTab === 'meditation' && <MeditationTracker />}

        {/* Motivational Tip Box */}
        <View style={[styles.tipBox, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
          <Sparkles size={16} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.primary }]}>
            Tip: Mỗi nhiệm vụ hoàn thành sẽ ngay lập tức hồi sinh tế bào não bộ và tăng khả năng kháng cám dỗ mạng xã hội!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  coinPillText: {
    fontSize: 15,
    fontWeight: '800',
  },
  tabsWrapper: {
    borderBottomWidth: 1,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  tabActive: {
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    marginTop: 6,
  },
  tipText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    flex: 1,
  },
});
