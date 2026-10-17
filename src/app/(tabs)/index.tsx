import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Coins,
  ShieldAlert,
  Flame,
  Clock,
  Dumbbell,
  Brain,
  Lock,
  Unlock,
  ChevronRight,
  Sparkles,
  Trophy,
  Target,
  LockKeyhole,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAppStore, RestrictedApp } from '../../store/useAppStore';
import { HardLockModal } from '../../components/HardLockModal';
import { BrainHealthWidget } from '../../components/BrainHealthWidget';
import { hapticService } from '../../utils/haptics';
import { lightTheme, darkTheme } from '../../theme/colors';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    coins,
    restrictedApps,
    dailyStats,
    questHistory,
    currentStreak,
    settings,
    checkAndExpireUnlocks,
    getUserRank,
    lockAppImmediately,
    themeMode,
    toggleTheme,
  } = useAppStore();

  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [refreshing, setRefreshing] = useState(false);
  const [selectedMockApp, setSelectedMockApp] = useState<RestrictedApp | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const rank = getUserRank();

  // Cập nhật timer mỗi giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      checkAndExpireUnlocks();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    checkAndExpireUnlocks();
    hapticService.light();
    setTimeout(() => setRefreshing(false), 500);
  };

  const restrictedList = restrictedApps.filter((a) => a.isRestricted);
  const activeUnlocks = restrictedApps.filter(
    (a) => a.isRestricted && a.unlockedUntil && a.unlockedUntil > currentTime
  );
  const lockedApps = restrictedApps.filter(
    (a) => a.isRestricted && (!a.unlockedUntil || a.unlockedUntil <= currentTime)
  );

  const formatRemainingTime = (expiresAt: number): string => {
    const diff = Math.max(0, expiresAt - currentTime);
    const totalSecs = Math.floor(diff / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleSimulateAppOpen = (app: RestrictedApp) => {
    setSelectedMockApp(app);
    setModalVisible(true);
    hapticService.warning();
  };

  // Tính phần trăm mục tiêu ngày
  const pushupProgress = Math.min(1, dailyStats.pushupCount / (settings.dailyGoals.pushups || 30));
  const deepWorkProgress = Math.min(1, dailyStats.deepWorkMinutes / (settings.dailyGoals.deepWorkMins || 45));
  const gymProgress = Math.min(1, dailyStats.gymSessions / (settings.dailyGoals.gymSessions || 1));
  const readingProgress = Math.min(1, dailyStats.readingMinutes / (settings.dailyGoals.readingMins || 30));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Top Header */}
        <View style={styles.topHeader}>
          <View>
            <Text style={[styles.appName, { color: colors.text }]}>EARN YOUR TIME</Text>
            <View style={[styles.rankBadgeHeader, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
              <Trophy size={12} color={colors.warning} />
              <Text style={[styles.rankBadgeText, { color: colors.warning }]}>
                LV.{rank.level} · {rank.title}
              </Text>
            </View>
          </View>

          <View style={styles.headerRightRow}>
            {/* Theme Toggle Button */}
            <TouchableOpacity
              style={[styles.themePill, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
              onPress={toggleTheme}
            >
              {themeMode === 'light' ? (
                <Moon size={15} color={colors.textMuted} />
              ) : (
                <Sun size={15} color="#FBBF24" />
              )}
            </TouchableOpacity>

            {/* Streak Pill */}
            <View style={[styles.streakPill, { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }]}>
              <Flame size={15} color="#EA580C" fill="#EA580C" />
              <Text style={styles.streakPillText}>{currentStreak}</Text>
            </View>

            {/* Coin Pill */}
            <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
              <Coins size={15} color={colors.warning} />
              <Text style={[styles.coinPillText, { color: colors.warning }]}>{coins}</Text>
            </View>
          </View>
        </View>

        {/* 🌟 BỘ NÃO Ở TRANG CHỦ & MÔ PHỎNG THỜI GIAN SỬ DỤNG ĐIỆN THOẠI 🌟 */}
        <BrainHealthWidget />

        {/* Status Card: Hard-Lock Status */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.heroHeader}>
            <View style={styles.heroStatusDot} />
            <Text style={[styles.heroStatusTitle, { color: colors.danger }]}>CƠ CHẾ HARD-LOCK</Text>
            <View style={[styles.heroBadgeActive, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>ĐANG BẢO VỆ</Text>
            </View>
          </View>

          <Text style={[styles.heroQuote, { color: colors.textMuted }]}>
            "Không mật khẩu. Không xin thêm 5 phút. Chỉ có mồ hôi mới đổi được thời gian."
          </Text>

          <View style={[styles.heroStatsRow, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.danger }]}>{lockedApps.length}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.textSubtle }]}>Đang khóa cứng</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.primary }]}>
                {activeUnlocks.length}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.textSubtle }]}>Đang tạm mở</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: colors.cardBorder }]} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatValue, { color: colors.warning }]}>
                {restrictedList.length}
              </Text>
              <Text style={[styles.heroStatLabel, { color: colors.textSubtle }]}>Được quản lý</Text>
            </View>
          </View>
        </View>

        {/* Active Unlocks Section (nếu có app đang mở) */}
        {activeUnlocks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Đang Mở Khóa (Đếm Ngược)</Text>
            </View>
            {activeUnlocks.map((app) => (
              <View key={app.id} style={[styles.unlockCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.unlockAppInfo}>
                  <Unlock size={18} color={colors.primary} />
                  <View>
                    <Text style={[styles.unlockAppName, { color: colors.text }]}>{app.name}</Text>
                    <Text style={[styles.countdownSub, { color: colors.primary }]}>
                      ⏳ Còn {formatRemainingTime(app.unlockedUntil!)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.quickRelockBtn}
                  onPress={() => {
                    lockAppImmediately(app.id);
                    hapticService.heavy();
                  }}
                >
                  <LockKeyhole size={13} color="#DC2626" />
                  <Text style={styles.quickRelockBtnText}>Khóa lại</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Daily Goals Tracking */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mục Tiêu Hôm Nay</Text>
          </View>

          <View style={[styles.goalsContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Goal 1: Pushups */}
            <View style={styles.goalRow}>
              <View style={styles.goalInfo}>
                <Dumbbell size={16} color={colors.primary} />
                <Text style={[styles.goalName, { color: colors.text }]}>Hít Đất</Text>
                <Text style={[styles.goalProgressText, { color: colors.textSubtle }]}>
                  {dailyStats.pushupCount}/{settings.dailyGoals.pushups} cái
                </Text>
              </View>
              <View style={[styles.goalBarBg, { backgroundColor: colors.bgSubtle }]}>
                <View
                  style={[
                    styles.goalBarFill,
                    { width: `${Math.round(pushupProgress * 100)}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>

            {/* Goal 2: Deep Work */}
            <View style={styles.goalRow}>
              <View style={styles.goalInfo}>
                <Brain size={16} color={colors.secondary} />
                <Text style={[styles.goalName, { color: colors.text }]}>Deep Work</Text>
                <Text style={[styles.goalProgressText, { color: colors.textSubtle }]}>
                  {dailyStats.deepWorkMinutes}/{settings.dailyGoals.deepWorkMins} phút
                </Text>
              </View>
              <View style={[styles.goalBarBg, { backgroundColor: colors.bgSubtle }]}>
                <View
                  style={[
                    styles.goalBarFill,
                    { width: `${Math.round(deepWorkProgress * 100)}%`, backgroundColor: colors.secondary },
                  ]}
                />
              </View>
            </View>

            {/* Goal 3: Gym */}
            <View style={styles.goalRow}>
              <View style={styles.goalInfo}>
                <Flame size={16} color={colors.warning} />
                <Text style={[styles.goalName, { color: colors.text }]}>Tập Gym</Text>
                <Text style={[styles.goalProgressText, { color: colors.textSubtle }]}>
                  {dailyStats.gymSessions}/{settings.dailyGoals.gymSessions} buổi
                </Text>
              </View>
              <View style={[styles.goalBarBg, { backgroundColor: colors.bgSubtle }]}>
                <View
                  style={[
                    styles.goalBarFill,
                    { width: `${Math.round(gymProgress * 100)}%`, backgroundColor: colors.warning },
                  ]}
                />
              </View>
            </View>

            {/* Goal 4: Reading */}
            <View style={styles.goalRow}>
              <View style={styles.goalInfo}>
                <BookOpen size={16} color={colors.info} />
                <Text style={[styles.goalName, { color: colors.text }]}>Đọc Sách</Text>
                <Text style={[styles.goalProgressText, { color: colors.textSubtle }]}>
                  {dailyStats.readingMinutes}/{settings.dailyGoals.readingMins || 30} phút
                </Text>
              </View>
              <View style={[styles.goalBarBg, { backgroundColor: colors.bgSubtle }]}>
                <View
                  style={[
                    styles.goalBarFill,
                    { width: `${Math.round(readingProgress * 100)}%`, backgroundColor: colors.info },
                  ]}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Daily Stats Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sparkles size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Thành Quả Hôm Nay</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Coins size={20} color={colors.warning} />
              <Text style={[styles.statValue, { color: colors.text }]}>+{dailyStats.coinsEarned}</Text>
              <Text style={[styles.statLabel, { color: colors.textSubtle }]}>Coins kiếm</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Dumbbell size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dailyStats.pushupCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSubtle }]}>Hít đất (reps)</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Brain size={20} color={colors.secondary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dailyStats.deepWorkMinutes}m</Text>
              <Text style={[styles.statLabel, { color: colors.textSubtle }]}>Deep Work</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Clock size={20} color={colors.info} />
              <Text style={[styles.statValue, { color: colors.text }]}>{dailyStats.totalUnlockMinutes}m</Text>
              <Text style={[styles.statLabel, { color: colors.textSubtle }]}>Giờ đã đổi</Text>
            </View>
          </View>
        </View>

        {/* Quick Test Hard-Lock Simulation */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={18} color={colors.danger} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mô Phỏng Mở Ứng Dụng Bị Khóa</Text>
          </View>

          <View style={styles.mockAppsRow}>
            {restrictedApps.map((app) => (
              <TouchableOpacity
                key={app.id}
                style={[styles.mockAppBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => handleSimulateAppOpen(app)}
                activeOpacity={0.7}
              >
                <Lock size={14} color={app.isRestricted ? colors.danger : colors.textMuted} />
                <Text style={[styles.mockAppName, { color: colors.text }]} numberOfLines={1}>
                  {app.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Hard-Lock Intercept Modal */}
      {selectedMockApp && (
        <HardLockModal
          visible={modalVisible}
          app={selectedMockApp}
          onClose={() => setModalVisible(false)}
          onGoToQuests={() => {
            setModalVisible(false);
            router.push('/(tabs)/quests');
          }}
          onGoToShop={() => {
            setModalVisible(false);
            router.push('/(tabs)/blocker');
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  rankBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themePill: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  streakPillText: {
    color: '#EA580C',
    fontSize: 14,
    fontWeight: '800',
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  coinPillText: {
    fontSize: 14,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  heroStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  heroStatusTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroBadgeActive: {
    marginLeft: 'auto',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  heroQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
  },
  heroStatItem: {
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  unlockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  unlockAppInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockAppName: {
    fontSize: 14,
    fontWeight: '700',
  },
  countdownSub: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 2,
  },
  quickRelockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  quickRelockBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  goalsContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  goalRow: {
    gap: 6,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalName: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalProgressText: {
    marginLeft: 'auto',
    fontSize: 12,
    fontWeight: '600',
  },
  goalBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  mockAppsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mockAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  mockAppName: {
    fontSize: 12,
    fontWeight: '700',
  },
});
