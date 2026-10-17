import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Dumbbell,
  Brain,
  Coins,
  Settings,
  Sparkles,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Lock,
  ChevronRight,
  ChevronLeft,
  Calendar,
  BarChart2,
  Target,
  Sun,
  Moon,
  Smartphone,
  ShieldCheck,
  BookOpen,
} from 'lucide-react-native';
import {
  useAppStore,
  ACHIEVEMENTS_LIST,
  getTodayDateString,
} from '../../store/useAppStore';
import { hapticService } from '../../utils/haptics';
import { lightTheme, darkTheme } from '../../theme/colors';

export default function StatsAndSettingsScreen() {
  const {
    coins,
    totalLifetimeCoins,
    currentStreak,
    longestStreak,
    unlockedAchievements,
    claimedAchievements,
    claimAchievement,
    historyByDate,
    dailyStats,
    settings,
    updateSettings,
    resetAllData,
    getUserRank,
    themeMode,
    toggleTheme,
  } = useAppStore();

  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const rank = getUserRank();
  const today = getTodayDateString();

  // Trạng thái điều hướng tuần (0: tuần này, -1: tuần trước, +1: tuần sau)
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Tính toán 7 ngày trong tuần từ Thứ 2 đến Chủ Nhật theo chuẩn lịch
  const getCalendarWeekDays = (offset: number) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0: Chủ Nhật, 1: Thứ 2, 2: Thứ 3...
    // Độ lệch ngày để về Thứ 2 đầu tuần (nếu là CN thì lùi 6 ngày, ngược lại 1 - dayOfWeek)
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + offset * 7);

    const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const shortDayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    return Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + idx);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const isToday = dateStr === today;
      const stat = dateStr === today ? dailyStats : historyByDate[dateStr];
      return {
        date: dateStr,
        dayName: dayLabels[idx],
        shortDay: shortDayLabels[idx],
        dateFormatted: `${d.getDate()}/${d.getMonth() + 1}`,
        isToday,
        coins: stat?.coinsEarned || 0,
        pushups: stat?.pushupCount || 0,
        deepWork: stat?.deepWorkMinutes || 0,
      };
    });
  };

  const weekDays = getCalendarWeekDays(weekOffset);
  const weekStartStr = weekDays[0].dateFormatted;
  const weekEndStr = weekDays[6].dateFormatted;
  const totalCoinsThisWeek = weekDays.reduce((acc, d) => acc + d.coins, 0);

  const rawMax = Math.max(...weekDays.map((d) => d.coins), 40);
  // Làm tròn mốc cao nhất của trục Y (ví dụ: 40, 60, 80, 100...)
  const maxCoinsInWeek = Math.ceil(rawMax / 20) * 20;
  const yAxisTicks = [
    maxCoinsInWeek,
    Math.round(maxCoinsInWeek * 0.75),
    Math.round(maxCoinsInWeek * 0.5),
    Math.round(maxCoinsInWeek * 0.25),
    0,
  ];

  const renderAchievementIcon = (iconName: string, unlocked: boolean) => {
    const color = unlocked ? colors.warning : colors.textSubtle;
    const size = 20;
    switch (iconName) {
      case 'zap': return <Zap size={size} color={color} />;
      case 'dumbbell': return <Dumbbell size={size} color={color} />;
      case 'flame': return <Flame size={size} color={color} />;
      case 'brain': return <Brain size={size} color={color} />;
      case 'book-open': return <BookOpen size={size} color={color} />;
      case 'sparkles': return <Sparkles size={size} color={color} />;
      case 'trophy': return <Trophy size={size} color={color} />;
      case 'award': return <Award size={size} color={color} />;
      default: return <Coins size={size} color={color} />;
    }
  };

  const handleResetData = () => {
    Alert.alert(
      '⚠️ Đặt Lại Toàn Bộ Dữ Liệu',
      'Thao tác này sẽ xóa toàn bộ số Coins, lịch sử nhiệm vụ, thành tựu và thiết lập app về trạng thái ban đầu. Bạn có chắc chắn không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đặt Lại Toàn Bộ',
          style: 'destructive',
          onPress: () => {
            resetAllData();
            Alert.alert('Thành công', 'Đã đặt lại dữ liệu ứng dụng.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderColor: colors.headerBorder }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>THÀNH TỰU & CÀI ĐẶT</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Cấp bậc kỷ luật · Biểu đồ phong độ · Tùy chỉnh giao diện
          </Text>
        </View>
        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={16} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>{coins}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* User Rank & Level Hero Card */}
        <View style={[styles.rankCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.rankHeader}>
            <View style={[styles.rankLevelBadge, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
              <Text style={[styles.rankLevelText, { color: colors.warning }]}>LV.{rank.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rankTitle, { color: colors.text }]}>{rank.title}</Text>
              <Text style={[styles.rankSubtitle, { color: colors.textSubtle }]}>
                Tổng Coins tích lũy: {totalLifetimeCoins} 🪙
              </Text>
            </View>
            <Trophy size={28} color={colors.warning} />
          </View>

          {/* Progress Bar to next level */}
          <View style={[styles.progressBarBg, { backgroundColor: colors.bgSubtle }]}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.round(rank.progress * 100)}%`, backgroundColor: colors.warning },
              ]}
            />
          </View>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabelText, { color: colors.textSubtle }]}>
              Tiến độ cấp tiếp theo: {Math.round(rank.progress * 100)}%
            </Text>
            <Text style={[styles.progressLabelTarget, { color: colors.text }]}>
              Mục tiêu: {rank.nextLevelCoins} Coins
            </Text>
          </View>
        </View>

        {/* Daily Streak Highlight */}
        <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.streakLeft}>
            <View style={styles.streakFlameIcon}>
              <Flame size={28} color="#EA580C" fill="#EA580C" />
            </View>
            <View>
              <Text style={[styles.streakNumber, { color: colors.text }]}>{currentStreak} Ngày</Text>
              <Text style={[styles.streakTitle, { color: colors.textSubtle }]}>Chuỗi Kỷ Luật Liên Tục</Text>
            </View>
          </View>

          <View style={styles.streakRight}>
            <Text style={[styles.streakBestText, { color: colors.textSubtle }]}>Kỷ lục cao nhất</Text>
            <Text style={[styles.streakBestVal, { color: '#EA580C' }]}>{longestStreak} ngày</Text>
          </View>
        </View>

        {/* Calendar Weekly Activity Chart (Thứ 2 ➔ Chủ Nhật) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart2 size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Hoạt Động Theo Tuần (Thứ 2 ➔ Chủ Nhật)
            </Text>
          </View>

          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Week Navigation Header */}
            <View style={styles.weekNavRow}>
              <TouchableOpacity
                style={[styles.weekNavBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => {
                  setWeekOffset((prev) => prev - 1);
                  hapticService.light();
                }}
              >
                <ChevronLeft size={16} color={colors.text} />
                <Text style={[styles.weekNavBtnText, { color: colors.text }]}>Tuần trước</Text>
              </TouchableOpacity>

              <View style={styles.weekLabelContainer}>
                <View style={styles.weekLabelTitleRow}>
                  <Calendar size={13} color={colors.primary} />
                  <Text style={[styles.weekLabelTitle, { color: colors.text }]}>
                    {weekOffset === 0 ? 'Tuần này' : weekOffset < 0 ? `${Math.abs(weekOffset)} tuần trước` : `${weekOffset} tuần tới`}
                  </Text>
                </View>
                <Text style={[styles.weekDateRange, { color: colors.textSubtle }]}>
                  {weekStartStr} - {weekEndStr}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.weekNavBtn,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                  weekOffset >= 0 && { opacity: 0.5 },
                ]}
                onPress={() => {
                  if (weekOffset < 0) {
                    setWeekOffset((prev) => prev + 1);
                    hapticService.light();
                  }
                }}
                disabled={weekOffset >= 0}
              >
                <Text style={[styles.weekNavBtnText, { color: colors.text }]}>Tuần sau</Text>
                <ChevronRight size={16} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Total Week Coins Summary */}
            <View style={[styles.weekSummaryRow, { backgroundColor: colors.bgSubtle }]}>
              <Text style={[styles.weekSummaryLabel, { color: colors.textSubtle }]}>
                Tổng Coins tích lũy tuần này:
              </Text>
              <View style={styles.weekSummaryCoins}>
                <Coins size={14} color={colors.warning} />
                <Text style={[styles.weekSummaryCoinsText, { color: colors.warning }]}>
                  +{totalCoinsThisWeek} Coins
                </Text>
              </View>
            </View>

            {/* Clear Axis Explainer Badges */}
            <View style={styles.axisLegendRow}>
              <View style={[styles.axisLegendBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                <Text style={[styles.axisLegendText, { color: colors.primary }]}>
                  ↕ Trục Đứng (Y): Số Coins
                </Text>
              </View>
              <View style={[styles.axisLegendBadge, { backgroundColor: colors.secondaryLight, borderColor: colors.secondaryBorder }]}>
                <Text style={[styles.axisLegendText, { color: colors.secondary }]}>
                  ↔ Trục Ngang (X): Thứ 2 ➔ Chủ Nhật
                </Text>
              </View>
            </View>

            {/* Main Chart Graphic with Y-Axis and Columns */}
            <View style={styles.chartMainWrapper}>
              {/* Y-Axis Ticks (Trục Đứng) */}
              <View style={styles.yAxisCol}>
                {yAxisTicks.map((tick, idx) => (
                  <Text key={idx} style={[styles.yAxisTickText, { color: colors.textSubtle }]}>
                    {tick}
                  </Text>
                ))}
              </View>

              {/* Chart Bars Area (Cột các ngày từ T2 đến CN) */}
              <View style={styles.barsArea}>
                {/* Horizontal Gridlines */}
                <View style={styles.gridlinesWrapper} pointerEvents="none">
                  {yAxisTicks.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.gridLine,
                        { borderColor: colors.cardBorder },
                        idx === yAxisTicks.length - 1 && { borderBottomWidth: 1.5, borderColor: colors.textSubtle },
                      ]}
                    />
                  ))}
                </View>

                {/* 7 Columns for Monday -> Sunday */}
                <View style={styles.columnsRow}>
                  {weekDays.map((day) => {
                    const heightPercent = maxCoinsInWeek > 0
                      ? Math.min(100, Math.max(6, Math.round((day.coins / maxCoinsInWeek) * 100)))
                      : 6;

                    return (
                      <View key={day.date} style={styles.columnItem}>
                        {/* Coin value above bar */}
                        <Text style={[styles.barValueText, { color: day.isToday ? colors.primary : colors.textSubtle }]}>
                          {day.coins > 0 ? day.coins : ''}
                        </Text>

                        {/* Bar Track */}
                        <View style={[styles.barTrack, { backgroundColor: colors.bgSubtle }]}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${heightPercent}%`,
                                backgroundColor: day.isToday ? colors.primary : day.coins > 0 ? '#38BDF8' : colors.cardBorder,
                              },
                            ]}
                          />
                        </View>

                        {/* X-Axis Day of Week (Trục Ngang) */}
                        <View style={styles.xDayGroup}>
                          <Text
                            style={[
                              styles.xDayName,
                              { color: day.isToday ? colors.primary : colors.text },
                              day.isToday && styles.xDayNameToday,
                            ]}
                          >
                            {day.shortDay}
                          </Text>
                          <Text
                            style={[
                              styles.xDateFormatted,
                              { color: day.isToday ? colors.primary : colors.textSubtle },
                            ]}
                          >
                            {day.dateFormatted}
                          </Text>
                          {day.isToday && (
                            <View style={[styles.todayTag, { backgroundColor: colors.primary }]}>
                              <Text style={styles.todayTagText}>H.nay</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* Helpful Guide Footer */}
            <Text style={[styles.chartGuideText, { color: colors.textSubtle }]}>
              * Mỗi cột biểu thị lượng Coins nhận được từ các nhiệm vụ trong ngày (bắt đầu từ Thứ 2 đến Chủ Nhật).
            </Text>
          </View>
        </View>

        {/* Achievements Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={18} color={colors.warning} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Huy Hiệu & Thành Tựu ({unlockedAchievements.length}/{ACHIEVEMENTS_LIST.length})
            </Text>
          </View>

          <View style={styles.achievementsGrid}>
            {ACHIEVEMENTS_LIST.map((ach) => {
              const isUnlocked = unlockedAchievements.includes(ach.id);
              const isClaimed = claimedAchievements.includes(ach.id);
              const canClaim = isUnlocked && !isClaimed;

              return (
                <View
                  key={ach.id}
                  style={[
                    styles.achCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    canClaim && [styles.achCardCanClaim, { borderColor: colors.warning }],
                    isClaimed && [styles.achCardClaimed, { borderColor: colors.primaryBorder }],
                  ]}
                >
                  <View style={styles.achTopRow}>
                    <View
                      style={[
                        styles.achIconWrap,
                        { backgroundColor: colors.bgSubtle },
                        canClaim && { backgroundColor: colors.warningLight },
                        isClaimed && { backgroundColor: colors.primaryLight },
                      ]}
                    >
                      {renderAchievementIcon(ach.icon, isUnlocked)}
                    </View>
                    {isClaimed ? (
                      <CheckCircle2 size={16} color={colors.primary} />
                    ) : canClaim ? (
                      <Sparkles size={16} color={colors.warning} />
                    ) : (
                      <Lock size={14} color={colors.textSubtle} />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.achTitle,
                      { color: colors.text },
                      canClaim && { color: colors.warning },
                      isClaimed && { color: colors.primary },
                    ]}
                  >
                    {ach.title}
                  </Text>
                  <Text style={[styles.achDesc, { color: colors.textSubtle }]}>{ach.description}</Text>

                  {/* Claim Button / Claimed Status */}
                  {canClaim ? (
                    <TouchableOpacity
                      style={[styles.claimAchBtn, { backgroundColor: colors.warning }]}
                      onPress={() => claimAchievement(ach.id)}
                      activeOpacity={0.8}
                    >
                      <Sparkles size={13} color="#FFFFFF" />
                      <Text style={styles.claimAchBtnText}>NHẬN +{ach.rewardCoins} COINS</Text>
                    </TouchableOpacity>
                  ) : isClaimed ? (
                    <View style={[styles.claimedBadge, { backgroundColor: colors.primaryLight }]}>
                      <CheckCircle2 size={12} color={colors.primary} />
                      <Text style={[styles.claimedBadgeText, { color: colors.primary }]}>Đã nhận thưởng</Text>
                    </View>
                  ) : (
                    <View style={[styles.achRewardBadge, { backgroundColor: colors.bgSubtle }]}>
                      <Coins size={12} color={colors.textSubtle} />
                      <Text style={[styles.achRewardText, { color: colors.textSubtle }]}>+{ach.rewardCoins} Coins</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Settings size={18} color={colors.textSubtle} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Cài Đặt & Tùy Chỉnh</Text>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Theme Toggle (Giao diện sáng màu) */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                {themeMode === 'light' ? (
                  <Sun size={18} color={colors.warning} />
                ) : (
                  <Moon size={18} color="#94A3B8" />
                )}
                <View>
                  <Text style={[styles.settingName, { color: colors.text }]}>Giao diện sáng màu (Light Mode)</Text>
                  <Text style={[styles.settingSub, { color: colors.textSubtle }]}>
                    {themeMode === 'light' ? 'Đang bật nền trắng sáng sủa, sắc nét' : 'Đang bật nền tối'}
                  </Text>
                </View>
              </View>
              <Switch
                value={themeMode === 'light'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Deep Work Screen-Off Feature */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <ShieldCheck size={18} color={colors.secondary} />
                <View>
                  <Text style={[styles.settingName, { color: colors.text }]}>Cho phép tắt màn hình khi Deep Work</Text>
                  <Text style={[styles.settingSub, { color: colors.textSubtle }]}>
                    Khóa điện thoại làm việc thoải mái, chỉ hủy khi chuyển app
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.allowScreenOffInDeepWork}
                onValueChange={(val) => {
                  updateSettings({ allowScreenOffInDeepWork: val });
                  hapticService.light();
                }}
                trackColor={{ false: '#334155', true: colors.secondary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Haptics Switch */}
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Zap size={18} color={colors.primary} />
                <View>
                  <Text style={[styles.settingName, { color: colors.text }]}>Rung phản hồi (Haptics)</Text>
                  <Text style={[styles.settingSub, { color: colors.textSubtle }]}>Rung xúc giác khi hít đất và bấm nút</Text>
                </View>
              </View>
              <Switch
                value={settings.hapticsEnabled}
                onValueChange={(val) => {
                  updateSettings({ hapticsEnabled: val });
                  if (val) hapticService.light();
                }}
                trackColor={{ false: '#334155', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={[styles.settingDivider, { backgroundColor: colors.cardBorder }]} />

            {/* Reset Data */}
            <TouchableOpacity style={styles.resetRow} onPress={handleResetData}>
              <View style={styles.settingLeft}>
                <RotateCcw size={18} color={colors.danger} />
                <Text style={[styles.resetText, { color: colors.danger }]}>Đặt lại toàn bộ dữ liệu ứng dụng</Text>
              </View>
              <ChevronRight size={18} color={colors.danger} />
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  rankCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rankLevelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  rankLevelText: {
    fontSize: 13,
    fontWeight: '900',
  },
  rankTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  rankSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabelText: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressLabelTarget: {
    fontSize: 11,
    fontWeight: '700',
  },
  streakCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakFlameIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  streakTitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  streakRight: {
    alignItems: 'flex-end',
  },
  streakBestText: {
    fontSize: 11,
    fontWeight: '500',
  },
  streakBestVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
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
  chartCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  weekNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  weekNavBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  weekLabelContainer: {
    alignItems: 'center',
  },
  weekLabelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekLabelTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  weekDateRange: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  weekSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  weekSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  weekSummaryCoins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  weekSummaryCoinsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  axisLegendRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  axisLegendBadge: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  axisLegendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  chartMainWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 160,
    marginBottom: 10,
  },
  yAxisCol: {
    width: 32,
    height: 125,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    paddingBottom: 22,
  },
  yAxisTickText: {
    fontSize: 9,
    fontWeight: '700',
  },
  barsArea: {
    flex: 1,
    height: 160,
    position: 'relative',
    justifyContent: 'flex-end',
  },
  gridlinesWrapper: {
    position: 'absolute',
    top: 15,
    left: 0,
    right: 0,
    height: 105,
    justifyContent: 'space-between',
  },
  gridLine: {
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    width: '100%',
  },
  columnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 155,
  },
  columnItem: {
    alignItems: 'center',
    flex: 1,
  },
  barValueText: {
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 4,
    height: 12,
  },
  barTrack: {
    width: 18,
    height: 85,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
  },
  xDayGroup: {
    alignItems: 'center',
    marginTop: 6,
  },
  xDayName: {
    fontSize: 10,
    fontWeight: '700',
  },
  xDayNameToday: {
    fontWeight: '900',
  },
  xDateFormatted: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 1,
  },
  todayTag: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  todayTagText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },
  chartGuideText: {
    fontSize: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  achCard: {
    width: '48%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
  },
  achCardUnlocked: {
    borderWidth: 1.5,
  },
  achTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  achDesc: {
    fontSize: 10,
    lineHeight: 14,
  },
  achCardCanClaim: {
    borderWidth: 1.5,
  },
  achCardClaimed: {
    borderWidth: 1.5,
  },
  claimAchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  claimAchBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  claimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  claimedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  achRewardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  achRewardText: {
    fontSize: 10,
    fontWeight: '800',
  },
  settingsCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  settingName: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    marginVertical: 4,
  },
  resetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  resetText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
