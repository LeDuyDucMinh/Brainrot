import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import {
  Heart,
  Play,
  Square,
  Sparkles,
  Coins,
  CheckCircle2,
  Wind,
  AlertTriangle,
} from 'lucide-react-native';
import { useAppStore, COIN_RATES } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

type BreathPhase = 'inhale' | 'hold_in' | 'exhale' | 'hold_out';

const MEDITATION_OPTIONS = [
  { minutes: 5, coins: 10, label: '5 phút' },
  { minutes: 10, coins: COIN_RATES.MEDITATION_10MIN, label: '10 phút' },
  { minutes: 15, coins: 25, label: '15 phút' },
];

export const MeditationTracker: React.FC = () => {
  const { completeQuest, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [phase, setPhase] = useState<'setup' | 'active' | 'completed'>('setup');
  const [selectedOpt, setSelectedOpt] = useState(MEDITATION_OPTIONS[1]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  // Box Breathing cycle state (4-4-4-4)
  const [breathPhase, setBreathPhase] = useState<BreathPhase>('inhale');
  const [breathCount, setBreathCount] = useState(4);
  const breathAnim = useRef(new Animated.Value(1)).current;

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Box Breathing cycle
  useEffect(() => {
    if (phase === 'active') {
      let currentPhase: BreathPhase = 'inhale';
      let count = 4;

      // Start inhale animation
      Animated.timing(breathAnim, {
        toValue: 1.4,
        duration: 4000,
        useNativeDriver: true,
      }).start();

      breathIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          count = 4;
          if (currentPhase === 'inhale') {
            currentPhase = 'hold_in';
            hapticService.light();
          } else if (currentPhase === 'hold_in') {
            currentPhase = 'exhale';
            hapticService.medium();
            Animated.timing(breathAnim, {
              toValue: 1,
              duration: 4000,
              useNativeDriver: true,
            }).start();
          } else if (currentPhase === 'exhale') {
            currentPhase = 'hold_out';
            hapticService.light();
          } else {
            currentPhase = 'inhale';
            hapticService.medium();
            Animated.timing(breathAnim, {
              toValue: 1.4,
              duration: 4000,
              useNativeDriver: true,
            }).start();
          }
          setBreathPhase(currentPhase);
        }
        setBreathCount(count);
      }, 1000);
    }

    return () => {
      if (breathIntervalRef.current) {
        clearInterval(breathIntervalRef.current);
        breathIntervalRef.current = null;
      }
    };
  }, [phase]);

  // Main session timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const totalMs = selectedOpt.minutes * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining <= 0) {
          finishMeditation();
        } else {
          setRemainingMs(remaining);
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, startTime, selectedOpt]);

  const startMeditation = () => {
    const now = Date.now();
    setStartTime(now);
    setRemainingMs(selectedOpt.minutes * 60 * 1000);
    setPhase('active');
    setBreathPhase('inhale');
    setBreathCount(4);
    hapticService.success();
  };

  // Điều kiện nhận Coins: Hoàn thành đủ thời gian hoặc kết thúc trước tối đa 1 phút (60s)
  const isEligibleForCoins = remainingMs <= 60000;

  const handleFinishPress = () => {
    if (isEligibleForCoins) {
      finishMeditation();
    } else {
      setStopModalVisible(true);
      hapticService.warning();
    }
  };

  const confirmAbortMeditation = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (breathIntervalRef.current) {
      clearInterval(breathIntervalRef.current);
      breathIntervalRef.current = null;
    }
    setStopModalVisible(false);
    setPhase('setup');
    hapticService.medium();
  };

  const finishMeditation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (breathIntervalRef.current) clearInterval(breathIntervalRef.current);
    completeQuest('meditation', selectedOpt.coins, `Thiền định ${selectedOpt.minutes} phút`);
    setPhase('completed');
    hapticService.success();
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getBreathInstruction = () => {
    switch (breathPhase) {
      case 'inhale': return 'Hít vào chậm qua mũi...';
      case 'hold_in': return 'Giữ hơi thở thư giãn...';
      case 'exhale': return 'Thở ra từ từ qua miệng...';
      case 'hold_out': return 'Tĩnh lặng buông lỏng...';
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Heart size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>Thiền Định & Thở Chánh Niệm</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSubtle }]} numberOfLines={1}>
              Box Breathing 4-4-4-4 · Thanh lọc tâm trí khỏi dopamine rác
            </Text>
          </View>
        </View>

        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={14} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>
            +{selectedOpt.coins}
          </Text>
        </View>
      </View>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <View>
          <Text style={[styles.label, { color: colors.text }]}>Chọn thời lượng thiền:</Text>
          <View style={styles.presetsRow}>
            {MEDITATION_OPTIONS.map((opt) => {
              const isSelected = selectedOpt.minutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[
                    styles.optChip,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    isSelected && [styles.optChipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
                  ]}
                  onPress={() => {
                    setSelectedOpt(opt);
                    hapticService.light();
                  }}
                >
                  <Text style={[styles.optChipText, { color: isSelected ? colors.primary : colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optChipCoin, { color: colors.warning }]}>
                    +{opt.coins}c
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.guideBox, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
            <Wind size={18} color={colors.primary} />
            <Text style={[styles.guideText, { color: colors.textMuted }]}>
              Kỹ thuật <Text style={{ fontWeight: '800', color: colors.text }}>Box Breathing</Text> giúp kích hoạt hệ thần kinh phó giao cảm, hạ nồng độ cortisol, ngăn ngừa cảm giác bồn chồn muốn cầm điện thoại.
            </Text>
          </View>

          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={startMeditation}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startBtnText}>BẮT ĐẦU THIỀN ({selectedOpt.label})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Phase */}
      {phase === 'active' && (
        <View style={styles.activeContainer}>
          <Text style={[styles.timerSmall, { color: colors.textSubtle }]}>
            Thời gian còn: {formatTime(remainingMs)}
          </Text>

          {/* Animated Breath Bubble */}
          <View style={styles.bubbleContainer}>
            <Animated.View
              style={[
                styles.breathBubble,
                {
                  transform: [{ scale: breathAnim }],
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
            >
              <Text style={[styles.breathCountNumber, { color: colors.primary }]}>{breathCount}</Text>
            </Animated.View>
          </View>

          <Text style={[styles.instructionText, { color: colors.text }]}>
            {getBreathInstruction()}
          </Text>

          {isEligibleForCoins ? (
            <TouchableOpacity style={[styles.endBtn, { backgroundColor: '#10B981', borderColor: '#059669' }]} onPress={finishMeditation}>
              <CheckCircle2 size={16} color="#FFFFFF" />
              <Text style={[styles.endBtnText, { color: '#FFFFFF' }]}>Hoàn tất thiền & Nhận Coins</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.endBtn} onPress={handleFinishPress}>
              <Square size={15} color="#DC2626" />
              <Text style={styles.endBtnText}>Dừng thiền (Còn {formatTime(remainingMs)})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completed Phase */}
      {phase === 'completed' && (
        <View style={[styles.completedBox, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
          <CheckCircle2 size={40} color={colors.primary} />
          <Text style={[styles.completedTitle, { color: colors.primary }]}>
            HOÀN THÀNH PHIÊN THIỀN ĐỊNH!
          </Text>
          <Text style={[styles.completedSub, { color: colors.textMuted }]}>
            Tâm trí tĩnh lặng và thư thái · Phục hồi sinh lực HP Não!
          </Text>
          <View style={styles.rewardRow}>
            <Coins size={22} color={colors.warning} />
            <Text style={[styles.rewardCoins, { color: colors.warning }]}>
              +{selectedOpt.coins} COINS
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: colors.primary }]}
            onPress={() => setPhase('setup')}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Tiếp tục</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Xác Nhận Dừng Thiền Sớm */}
      <Modal visible={stopModalVisible} transparent animationType="fade" onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={24} color="#DC2626" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chưa Đủ Thời Gian Thiền!</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 18 }}>
              Thời gian còn lại: <Text style={{ fontWeight: '800', color: colors.primary }}>{formatTime(remainingMs)}</Text> / {selectedOpt.minutes} phút.{'\n\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>Quy định nhận Coins:</Text> Bạn chỉ nhận được Coins khi hoàn thành trọn vẹn hoặc chỉ còn cách đích tối đa 1 phút.{'\n\n'}
              Nếu dừng bây giờ bạn sẽ <Text style={{ fontWeight: '800', color: '#DC2626' }}>KHÔNG nhận được Coins</Text>!
            </Text>

            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
                onPress={() => {
                  setStopModalVisible(false);
                  hapticService.light();
                }}
              >
                <Text style={styles.startBtnText}>Tiếp tục thiền định</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  paddingVertical: 12,
                  borderRadius: 14,
                  alignItems: 'center',
                  backgroundColor: '#FEF2F2',
                  borderWidth: 1,
                  borderColor: '#FCA5A5',
                }}
                onPress={confirmAbortMeditation}
              >
                <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '700' }}>Dừng thiền (Không nhận Coins)</Text>
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
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  optChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optChipActive: {
    borderWidth: 1.5,
  },
  optChipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  optChipCoin: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  guideBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  guideText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timerSmall: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
  },
  bubbleContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  breathBubble: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathCountNumber: {
    fontSize: 48,
    fontWeight: '900',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 20,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  endBtnText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
});

