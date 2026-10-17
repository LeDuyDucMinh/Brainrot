import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Modal,
} from 'react-native';
import {
  BookOpen,
  Play,
  Square,
  Sparkles,
  Coins,
  Clock,
  CheckCircle2,
  BookmarkCheck,
  AlertTriangle,
} from 'lucide-react-native';
import { useAppStore, COIN_RATES } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

const READING_OPTIONS = [
  { minutes: 15, coins: 15, label: '15 phút' },
  { minutes: 25, coins: 25, label: '25 phút' },
  { minutes: 30, coins: COIN_RATES.READING_30MIN, label: '30 phút' },
  { minutes: 45, coins: 50, label: '45 phút' },
  { minutes: 60, coins: 70, label: '60 phút' },
];

export const ReadingTracker: React.FC = () => {
  const { completeQuest, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [phase, setPhase] = useState<'setup' | 'active' | 'completed'>('setup');
  const [selectedOpt, setSelectedOpt] = useState(READING_OPTIONS[2]); // 30 phút
  const [bookTitle, setBookTitle] = useState('Nguyên Lý Kỷ Luật Bản Thân');
  const [startPage, setStartPage] = useState('1');
  const [endPage, setEndPage] = useState('20');
  const [remainingMs, setRemainingMs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const totalMs = selectedOpt.minutes * 60 * 1000;
        const remaining = totalMs - elapsed;

        if (remaining <= 0) {
          finishReading();
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

  const startReading = () => {
    const now = Date.now();
    setStartTime(now);
    setRemainingMs(selectedOpt.minutes * 60 * 1000);
    setPhase('active');
    hapticService.success();
  };

  // Điều kiện nhận Coins: Hoàn thành đủ thời gian hoặc kết thúc trước tối đa 1 phút (60s)
  const isEligibleForCoins = remainingMs <= 60000;

  const handleFinishPress = () => {
    if (isEligibleForCoins) {
      finishReading();
    } else {
      setStopModalVisible(true);
      hapticService.warning();
    }
  };

  const confirmAbortReading = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setStopModalVisible(false);
    setPhase('setup');
    hapticService.medium();
  };

  const finishReading = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const pagesCount = Math.max(1, (parseInt(endPage) || 0) - (parseInt(startPage) || 0));
    completeQuest('reading', selectedOpt.coins, `Đọc ${pagesCount} trang "${bookTitle || 'Sách'}" (${selectedOpt.minutes}p)`);
    setPhase('completed');
    hapticService.success();
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.infoLight }]}>
            <BookOpen size={20} color={colors.info} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>Đọc Sách (Reading)</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSubtle }]} numberOfLines={1}>
              Nuôi dưỡng trí tuệ · Tái tạo dopamine bền vững
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
          {/* Book Info Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Tên sách đang đọc:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
              value={bookTitle}
              onChangeText={setBookTitle}
              placeholder="Nhập tên cuốn sách..."
              placeholderTextColor={colors.textSubtle}
            />
          </View>

          <View style={styles.pagesRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Từ trang:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
                value={startPage}
                onChangeText={setStartPage}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>Đến trang mục tiêu:</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
                value={endPage}
                onChangeText={setEndPage}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Duration Selector */}
          <Text style={[styles.label, { color: colors.text, marginTop: 10 }]}>Thời gian đọc sách:</Text>
          <View style={styles.presetsRow}>
            {READING_OPTIONS.map((opt) => {
              const isSelected = selectedOpt.minutes === opt.minutes;
              return (
                <TouchableOpacity
                  key={opt.minutes}
                  style={[
                    styles.optChip,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    isSelected && [styles.optChipActive, { backgroundColor: colors.infoLight, borderColor: colors.info }],
                  ]}
                  onPress={() => {
                    setSelectedOpt(opt);
                    hapticService.light();
                  }}
                >
                  <Text style={[styles.optChipText, { color: isSelected ? colors.info : colors.text }]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.optChipCoin, { color: colors.warning }]}>
                    +{opt.coins}c
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.info }]} onPress={startReading}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startBtnText}>BẮT ĐẦU ĐỌC SÁCH ({selectedOpt.label})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Phase */}
      {phase === 'active' && (
        <View style={styles.activeContainer}>
          <View style={[styles.bookBanner, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
            <BookmarkCheck size={18} color={colors.info} />
            <Text style={[styles.bookBannerTitle, { color: colors.info }]} numberOfLines={1}>
              {bookTitle} (Trang {startPage} → {endPage})
            </Text>
          </View>

          <View style={[styles.timerCircle, { borderColor: colors.info }]}>
            <Text style={[styles.timerDigits, { color: colors.info }]}>
              {formatTime(remainingMs)}
            </Text>
            <Text style={[styles.timerSub, { color: colors.textMuted }]}>
              Đắm chìm vào từng trang sách
            </Text>
          </View>

          {isEligibleForCoins ? (
            <TouchableOpacity style={styles.finishEarlyBtn} onPress={finishReading}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.finishEarlyText}>Hoàn tất đọc sách & Nhận Coins</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.finishEarlyBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              onPress={handleFinishPress}
            >
              <Square size={15} color="#DC2626" />
              <Text style={[styles.finishEarlyText, { color: '#DC2626' }]}>Dừng phiên đọc (Còn {formatTime(remainingMs)})</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completed Phase */}
      {phase === 'completed' && (
        <View style={[styles.completedBox, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
          <CheckCircle2 size={40} color={colors.info} />
          <Text style={[styles.completedTitle, { color: colors.info }]}>
            HOÀN THÀNH PHIÊN ĐỌC SÁCH!
          </Text>
          <Text style={[styles.completedSub, { color: colors.textMuted }]}>
            Tâm trí tĩnh lặng và được nạp thêm tri thức mới · Phục hồi sinh lực HP Não!
          </Text>
          <View style={styles.rewardRow}>
            <Coins size={22} color={colors.warning} />
            <Text style={[styles.rewardCoins, { color: colors.warning }]}>
              +{selectedOpt.coins} COINS
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: colors.info }]}
            onPress={() => setPhase('setup')}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Tiếp tục đọc sách</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Xác Nhận Dừng Đọc Sách Sớm */}
      <Modal visible={stopModalVisible} transparent animationType="fade" onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={24} color="#DC2626" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chưa Đủ Thời Gian Đọc!</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 18 }}>
              Thời gian còn lại: <Text style={{ fontWeight: '800', color: colors.info }}>{formatTime(remainingMs)}</Text> / {selectedOpt.minutes} phút.{'\n\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>Quy định nhận Coins:</Text> Bạn chỉ nhận được Coins khi hoàn thành trọn vẹn hoặc chỉ còn cách đích tối đa 1 phút.{'\n\n'}
              Nếu dừng bây giờ bạn sẽ <Text style={{ fontWeight: '800', color: '#DC2626' }}>KHÔNG nhận được Coins</Text>!
            </Text>

            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.info, marginTop: 0 }]}
                onPress={() => {
                  setStopModalVisible(false);
                  hapticService.light();
                }}
              >
                <Text style={styles.startBtnText}>Tiếp tục đọc sách</Text>
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
                onPress={confirmAbortReading}
              >
                <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '700' }}>Dừng đọc (Không nhận Coins)</Text>
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
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  pagesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
  },
  optChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  optChipActive: {
    borderWidth: 1.5,
  },
  optChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  optChipCoin: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
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
    paddingVertical: 12,
  },
  bookBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
    width: '100%',
  },
  bookBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  timerCircle: {
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  timerDigits: {
    fontSize: 42,
    fontWeight: '900',
  },
  timerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  finishEarlyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  finishEarlyText: {
    color: '#059669',
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

