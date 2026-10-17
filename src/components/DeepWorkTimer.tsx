import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AppState,
  AppStateStatus,
  Animated,
  Alert,
  Modal,
} from 'react-native';
import {
  Timer,
  Play,
  Square,
  Brain,
  Coins,
  AlertTriangle,
  Sparkles,
  Moon,
  Sun,
  ShieldCheck,
  CheckCircle2,
  X,
} from 'lucide-react-native';
import { useAppStore, COIN_RATES } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

type DeepWorkPhase = 'select' | 'active' | 'paused_warning' | 'failed' | 'completed';

interface DeepWorkOption {
  minutes: number;
  coins: number;
  label: string;
}

const DEEPWORK_OPTIONS: DeepWorkOption[] = [
  { minutes: 15, coins: 10, label: '15 phút' },
  { minutes: 25, coins: COIN_RATES.DEEPWORK_25MIN, label: '25 phút' },
  { minutes: 45, coins: COIN_RATES.DEEPWORK_45MIN, label: '45 phút' },
  { minutes: 60, coins: COIN_RATES.DEEPWORK_60MIN, label: '60 phút' },
  { minutes: 90, coins: 90, label: '90 phút' },
];

export const DeepWorkTimer: React.FC = () => {
  const { completeQuest, settings, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [phase, setPhase] = useState<DeepWorkPhase>('select');
  const [selectedOption, setSelectedOption] = useState<DeepWorkOption>(DEEPWORK_OPTIONS[1]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [warningCountdown, setWarningCountdown] = useState(settings.deepWorkToleranceSec || 5);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  // OLED / Simulated Screen-Off Mode (Màn hình đen làm việc)
  const [isScreenOffMode, setIsScreenOffMode] = useState(false);

  const toleranceMs = (settings.deepWorkToleranceSec || 5) * 1000;
  const allowScreenOff = settings.allowScreenOffInDeepWork ?? true;

  // Track app state
  const appStateRef = useRef<AppStateStatus>('active');
  const leaveTimestampRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animations
  const [progressAnim] = useState(new Animated.Value(1));
  const [breathingAnim] = useState(new Animated.Value(1));

  // ============================================================
  // AppState Listener (Cho phép tắt màn hình, chỉ hủy khi thoát app)
  // ============================================================
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (phase !== 'active' && phase !== 'paused_warning') return;

      // Khi người dùng tắt màn hình hoặc rời app
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        leaveTimestampRef.current = Date.now();

        if (!allowScreenOff) {
          // Chế độ cực kỳ nghiêm ngặt không cho tắt màn hình
          setPhase('paused_warning');
          setWarningCountdown(settings.deepWorkToleranceSec);
          hapticService.warning();

          warningTimerRef.current = setInterval(() => {
            setWarningCountdown((prev) => {
              if (prev <= 1) {
                failSession();
                return 0;
              }
              hapticService.light();
              return prev - 1;
            });
          }, 1000);
        } else {
          // CHẾ ĐỘ CHUẨN: Cho phép tắt màn hình làm việc!
          // Khi quay lại app, hệ thống tính toán thời gian trôi qua và kiểm tra xem có hoàn thành phiên chưa
          console.log('[DeepWork] Screen locked / backgrounded. Timer keeps calculating in background.');
        }
      }

      // Khi người dùng bật màn hình quay lại app
      if (nextAppState === 'active' && appStateRef.current.match(/inactive|background/)) {
        if (leaveTimestampRef.current) {
          const now = Date.now();
          const elapsed = now - startTime;
          const totalMs = selectedOption.minutes * 60 * 1000;
          const currentRemaining = totalMs - elapsed;

          if (currentRemaining <= 0) {
            // Đã hoàn thành trong khi tắt màn hình!
            completeSession();
          } else {
            setRemainingMs(currentRemaining);
            if (warningTimerRef.current) {
              clearInterval(warningTimerRef.current);
              warningTimerRef.current = null;
            }
            if (phase === 'paused_warning') {
              setPhase('active');
            }
            hapticService.medium();
          }
          leaveTimestampRef.current = null;
        }
      }

      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [phase, toleranceMs, settings.deepWorkToleranceSec, allowScreenOff, startTime, selectedOption]);

  // Main Timer Loop
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const totalMs = selectedOption.minutes * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining <= 0) {
          completeSession();
        } else {
          setRemainingMs(remaining);
          Animated.timing(progressAnim, {
            toValue: remaining / totalMs,
            duration: 500,
            useNativeDriver: false,
          }).start();
        }
      }, 1000);

      // Breathing animation
      const breath = Animated.loop(
        Animated.sequence([
          Animated.timing(breathingAnim, { toValue: 1.05, duration: 3000, useNativeDriver: true }),
          Animated.timing(breathingAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
        ])
      );
      breath.start();
      return () => breath.stop();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, startTime, selectedOption]);

  const startSession = () => {
    const now = Date.now();
    setStartTime(now);
    setRemainingMs(selectedOption.minutes * 60 * 1000);
    setPhase('active');
    setIsScreenOffMode(false);
    hapticService.success();
  };

  const completeSession = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase('completed');
    setIsScreenOffMode(false);
    completeQuest('deepwork', selectedOption.coins, `${selectedOption.minutes} phút Deep Work`);
    hapticService.success();
  };

  const failSession = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (warningTimerRef.current) clearInterval(warningTimerRef.current);
    setPhase('failed');
    setIsScreenOffMode(false);
    hapticService.heavy();
  };

  // Xử lý dừng phiên: Chỉ được nhận coins khi hoàn thành hoặc còn cách đích <= 1 phút (60s)
  const handleStopPress = () => {
    if (remainingMs <= 60000) {
      // Cách đích tối đa 1 phút -> Đủ điều kiện nhận coins!
      completeSession();
    } else {
      // Chưa đủ điều kiện -> Mở modal cảnh báo dừng sớm (0 coins)
      setStopModalVisible(true);
      hapticService.warning();
    }
  };

  const confirmAbortEarly = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearInterval(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    leaveTimestampRef.current = null;
    setStopModalVisible(false);
    setPhase('select');
    setIsScreenOffMode(false);
    hapticService.medium();
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // If in OLED Screen-Off Mode, render pure pitch-black display
  if (isScreenOffMode && phase === 'active') {
    return (
      <TouchableOpacity
        style={styles.oledContainer}
        activeOpacity={1}
        onPress={() => {
          setIsScreenOffMode(false);
          hapticService.light();
        }}
      >
        <View style={styles.oledCenter}>
          <Moon size={24} color="#334155" />
          <Text style={styles.oledClockText}>{formatTime(remainingMs)}</Text>
          <Text style={styles.oledSubText}>
            Màn hình đen tiết kiệm pin · Chạm nhẹ để mở lại
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.secondaryLight }]}>
            <Brain size={20} color={colors.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Deep Work</Text>
              <View style={[styles.screenOffBadge, { backgroundColor: colors.secondaryLight, borderColor: colors.secondaryBorder }]}>
                <ShieldCheck size={12} color={colors.secondary} />
                <Text style={[styles.screenOffBadgeText, { color: colors.secondary }]}>
                  Hỗ trợ tắt màn hình
                </Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSubtle }]}>
              Tập trung cao độ · Có thể tắt màn hình khi làm việc
            </Text>
          </View>
        </View>

        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={14} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>
            +{selectedOption.coins}
          </Text>
        </View>
      </View>

      {/* Select Phase */}
      {phase === 'select' && (
        <View>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Chọn thời lượng làm việc:</Text>
          <View style={styles.optionsGrid}>
            {DEEPWORK_OPTIONS.map((opt) => {
              const isSelected = selectedOption.minutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[
                    styles.optCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    isSelected && [styles.optCardActive, { backgroundColor: colors.secondaryLight, borderColor: colors.secondary }],
                  ]}
                  onPress={() => {
                    setSelectedOption(opt);
                    hapticService.light();
                  }}
                >
                  <Timer size={18} color={isSelected ? colors.secondary : colors.textMuted} />
                  <Text style={[styles.optDuration, { color: isSelected ? colors.secondary : colors.text }]}>
                    {opt.label}
                  </Text>
                  <View style={styles.optCoinsRow}>
                    <Coins size={12} color={colors.warning} />
                    <Text style={[styles.optCoinsText, { color: colors.warning }]}>
                      +{opt.coins}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Feature Highlight Box */}
          <View style={[styles.featureHighlight, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
            <ShieldCheck size={16} color={colors.secondary} />
            <Text style={[styles.featureText, { color: colors.textMuted }]}>
              Bạn hoàn toàn có thể <Text style={{ fontWeight: '800', color: colors.text }}>bấm nút nguồn tắt màn hình</Text> để tập trung học tập. Phiên chỉ bị hủy nếu bạn mở các app bị khóa hoặc chuyển app khác.
            </Text>
          </View>

          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.secondary }]} onPress={startSession}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startBtnText}>BẮT ĐẦU ({selectedOption.label})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Phase */}
      {phase === 'active' && (
        <View style={styles.activeContainer}>
          <Animated.View style={[styles.timerCircle, { transform: [{ scale: breathingAnim }], borderColor: colors.secondary }]}>
            <Text style={[styles.timerBigDigits, { color: colors.secondary }]}>
              {formatTime(remainingMs)}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.textMuted }]}>
              Đang trong dòng chảy tập trung
            </Text>
          </Animated.View>

          {/* Quick Actions Row */}
          <View style={styles.activeControlsRow}>
            {/* OLED Black Screen Button */}
            <TouchableOpacity
              style={[styles.oledToggleBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
              onPress={() => {
                setIsScreenOffMode(true);
                hapticService.medium();
              }}
            >
              <Moon size={15} color={colors.textMuted} />
              <Text style={[styles.oledToggleText, { color: colors.text }]}>
                Tắt màn hình (OLED)
              </Text>
            </TouchableOpacity>

            {remainingMs <= 60000 ? (
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: '#10B981', borderColor: '#059669' }]}
                onPress={handleStopPress}
              >
                <CheckCircle2 size={15} color="#FFFFFF" />
                <Text style={[styles.cancelBtnText, { color: '#FFFFFF' }]}>Kết thúc & Nhận Coins</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleStopPress}>
                <Square size={15} color="#DC2626" />
                <Text style={styles.cancelBtnText}>Dừng phiên</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Paused Warning Phase */}
      {phase === 'paused_warning' && (
        <View style={styles.warningBox}>
          <AlertTriangle size={36} color="#DC2626" />
          <Text style={styles.warningTitle}>CẢNH BÁO: BẠN VỪA RỜI APP!</Text>
          <Text style={styles.warningSub}>
            Quay lại app trong <Text style={{ fontWeight: '900', color: '#DC2626' }}>{warningCountdown}s</Text> nếu không phiên sẽ bị hủy!
          </Text>
        </View>
      )}

      {/* Completed Phase */}
      {phase === 'completed' && (
        <View style={[styles.completedBox, { backgroundColor: colors.secondaryLight, borderColor: colors.secondaryBorder }]}>
          <CheckCircle2 size={40} color={colors.secondary} />
          <Text style={[styles.completedTitle, { color: colors.secondary }]}>
            XUẤT SẮC! HOÀN THÀNH {selectedOption.minutes} PHÚT!
          </Text>
          <Text style={[styles.completedSub, { color: colors.textMuted }]}>
            Dopamine tự nhiên dồi dào · Bộ não đã được phục hồi sinh lực HP!
          </Text>
          <View style={styles.rewardRow}>
            <Coins size={22} color={colors.warning} />
            <Text style={[styles.rewardCoins, { color: colors.warning }]}>
              +{selectedOption.coins} COINS
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: colors.secondary }]}
            onPress={() => setPhase('select')}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Hoàn Tất & Tiếp Tục</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Failed Phase */}
      {phase === 'failed' && (
        <View style={styles.failedBox}>
          <AlertTriangle size={36} color="#DC2626" />
          <Text style={styles.failedTitle}>PHIÊN ĐÃ BỊ HỦY</Text>
          <Text style={styles.failedSub}>
            Bạn đã rời app quá thời gian cho phép. Hãy rèn luyện tính kỷ luật cho lần sau!
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => setPhase('select')}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Xác Nhận Dừng Phiên Sớm */}
      <Modal visible={stopModalVisible} transparent animationType="fade" onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <AlertTriangle size={24} color="#DC2626" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Dừng Phiên Deep Work?</Text>
            </View>
            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Thời gian còn lại: <Text style={{ fontWeight: '800', color: colors.secondary }}>{formatTime(remainingMs)}</Text>.{'\n\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>Quy định nhận Coins:</Text> Bạn chỉ nhận được Coins khi hoàn thành trọn vẹn hoặc chỉ còn cách đích tối đa 1 phút.{'\n\n'}
              Nếu dừng bây giờ bạn sẽ <Text style={{ fontWeight: '800', color: '#DC2626' }}>KHÔNG nhận được Coins</Text>!
            </Text>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalContinueBtn, { backgroundColor: colors.secondary }]}
                onPress={() => {
                  setStopModalVisible(false);
                  hapticService.light();
                }}
              >
                <Text style={styles.modalContinueBtnText}>Tiếp tục làm việc</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalAbortBtn}
                onPress={confirmAbortEarly}
              >
                <Text style={styles.modalAbortBtnText}>Dừng & Không nhận Coins</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 18,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
    minWidth: 0,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  screenOffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  screenOffBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  coinPill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  coinPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  optCard: {
    width: '31%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  optCardActive: {
    borderWidth: 1.5,
  },
  optDuration: {
    fontSize: 13,
    fontWeight: '800',
  },
  optCoinsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  optCoinsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  featureHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  featureText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: '500',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerBigDigits: {
    fontSize: 44,
    fontWeight: '900',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  activeControlsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  oledToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  oledToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  oledContainer: {
    backgroundColor: '#000000',
    borderRadius: 20,
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  oledCenter: {
    alignItems: 'center',
    gap: 12,
  },
  oledClockText: {
    color: '#475569',
    fontSize: 48,
    fontWeight: '300',
    letterSpacing: 2,
  },
  oledSubText: {
    color: '#334155',
    fontSize: 11,
    textAlign: 'center',
  },
  warningBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#DC2626',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  warningTitle: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '900',
    marginTop: 8,
  },
  warningSub: {
    color: '#7F1D1D',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  completedBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
    textAlign: 'center',
  },
  completedSub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginBottom: 16,
  },
  rewardCoins: {
    fontSize: 18,
    fontWeight: '900',
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  failedBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  failedTitle: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 8,
  },
  failedSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalDesc: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalActionsRow: {
    flexDirection: 'column',
    gap: 10,
  },
  modalContinueBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalContinueBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalAbortBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  modalAbortBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
