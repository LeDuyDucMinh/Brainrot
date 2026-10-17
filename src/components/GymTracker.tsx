import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Dumbbell,
  Play,
  Square,
  Check,
  RotateCcw,
  Coins,
  Clock,
  Plus,
  Trash2,
  Timer,
  X,
  Sparkles,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { useAppStore, COIN_RATES, GymExercise } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

interface ActiveExerciseItem extends GymExercise {
  completedSets: number;
}

type GymPhase = 'setup' | 'active' | 'completed';

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120];

export const GymTracker: React.FC = () => {
  const { gymExercises, addCustomExercise, deleteCustomExercise, completeQuest, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [phase, setPhase] = useState<GymPhase>('setup');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(45);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([
    'bench', 'squat', 'pullup', 'ohp',
  ]);
  const [activeExercises, setActiveExercises] = useState<ActiveExerciseItem[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [stopModalVisible, setStopModalVisible] = useState(false);

  // Rest Timer
  const [isResting, setIsResting] = useState(false);
  const [restRemaining, setRestRemaining] = useState(60);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add Exercise Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExSets, setNewExSets] = useState('3');
  const [newExReps, setNewExReps] = useState('10-12');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Coins calculated based on workout duration
  const calculateWorkoutCoins = (durationMinutes: number) => {
    return Math.max(30, Math.round(durationMinutes * 1.1));
  };

  const expectedCoins = calculateWorkoutCoins(targetDurationMinutes);

  // Main Timer
  useEffect(() => {
    if (phase === 'active') {
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTime);
      }, 1000);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, startTime]);

  // Rest Timer Effect
  useEffect(() => {
    if (isResting) {
      restTimerRef.current = setInterval(() => {
        setRestRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(restTimerRef.current!);
            restTimerRef.current = null;
            setIsResting(false);
            hapticService.success();
            return 60;
          }
          if (prev <= 3) hapticService.light();
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    };
  }, [isResting]);

  const toggleSelect = (id: string) => {
    setSelectedExerciseIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
    hapticService.light();
  };

  const startWorkout = () => {
    if (selectedExerciseIds.length === 0) {
      Alert.alert('Chưa chọn bài', 'Vui lòng chọn ít nhất 1 bài tập.');
      return;
    }
    const items: ActiveExerciseItem[] = gymExercises
      .filter((e) => selectedExerciseIds.includes(e.id))
      .map((e) => ({ ...e, completedSets: 0 }));

    setActiveExercises(items);
    setStartTime(Date.now());
    setElapsedMs(0);
    setPhase('active');
    hapticService.success();
  };

  const handleIncrementSet = (id: string) => {
    setActiveExercises((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const newSets = e.completedSets < e.sets ? e.completedSets + 1 : 0;
          return { ...e, completedSets: newSets };
        }
        return e;
      })
    );
    hapticService.medium();
  };

  const startRestBreak = (seconds = 60) => {
    setRestRemaining(seconds);
    setIsResting(true);
    hapticService.medium();
  };

  const addTimeMinutes = (minutes: number) => {
    setTargetDurationMinutes((prev) => Math.max(15, prev + minutes));
    hapticService.light();
  };

  const handleAddNewExercise = () => {
    if (!newExName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên bài tập.');
      return;
    }
    const sets = parseInt(newExSets) || 3;
    addCustomExercise(newExName, sets, newExReps);
    setNewExName('');
    setModalVisible(false);
    hapticService.success();
  };

  // Điều kiện nhận Coins: Hoàn thành đủ thời gian hoặc kết thúc trước tối đa 1 phút (60s)
  const isEligibleForCoins = elapsedMs >= (targetDurationMinutes * 60 - 60) * 1000;
  const remainingTargetMs = Math.max(0, targetDurationMinutes * 60 * 1000 - elapsedMs);

  const handleFinishPress = () => {
    if (isEligibleForCoins) {
      finishWorkout();
    } else {
      setStopModalVisible(true);
      hapticService.warning();
    }
  };

  const confirmAbortWorkout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setStopModalVisible(false);
    setPhase('setup');
    setIsResting(false);
    hapticService.medium();
  };

  const finishWorkout = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current);
      restTimerRef.current = null;
    }
    setIsResting(false);
    const actualMinutes = Math.max(1, Math.round(elapsedMs / 60000));
    const finalCoins = calculateWorkoutCoins(targetDurationMinutes);

    completeQuest('gym', finalCoins, `Tập gym ${actualMinutes} phút (${activeExercises.length} bài)`);
    setPhase('completed');
    hapticService.success();
  };

  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hours > 0) {
      return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningLight }]}>
            <Dumbbell size={20} color={colors.warning} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>Tập Gym (Workout)</Text>
            <Text style={[styles.cardSubtitle, { color: colors.textSubtle }]} numberOfLines={1}>
              Theo dõi set tập · Tùy chỉnh thời lượng buổi tập
            </Text>
          </View>
        </View>

        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={14} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>
            +{expectedCoins}
          </Text>
        </View>
      </View>

      {/* Setup Phase */}
      {phase === 'setup' && (
        <View>
          {/* Workout Duration Selector (YÊU CẦU NGƯỜI DÙNG: Thêm thời gian tập) */}
          <View style={styles.durationSection}>
            <View style={styles.durationHeaderRow}>
              <View style={styles.durationTitleGroup}>
                <Clock size={16} color={colors.warning} />
                <Text style={[styles.sectionLabel, { color: colors.text }]}>
                  Thời gian tập dự kiến:
                </Text>
              </View>
              <Text style={[styles.durationHighlight, { color: colors.warning }]}>
                {targetDurationMinutes} phút
              </Text>
            </View>

            {/* Presets Row */}
            <View style={styles.presetsRow}>
              {DURATION_PRESETS.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetChip,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    targetDurationMinutes === m && [styles.presetChipActive, { backgroundColor: colors.warningLight, borderColor: colors.warning }],
                  ]}
                  onPress={() => {
                    setTargetDurationMinutes(m);
                    hapticService.light();
                  }}
                >
                  <Text style={[styles.presetChipText, { color: targetDurationMinutes === m ? colors.warning : colors.text }]}>
                    {m}p
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Micro +/- adjusters */}
            <View style={styles.adjustRow}>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => addTimeMinutes(-5)}
              >
                <Text style={[styles.adjustBtnText, { color: colors.text }]}>- 5 phút</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => addTimeMinutes(5)}
              >
                <Text style={[styles.adjustBtnText, { color: colors.text }]}>+ 5 phút</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.adjustBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => addTimeMinutes(15)}
              >
                <Text style={[styles.adjustBtnText, { color: colors.text }]}>+ 15 phút</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Exercise Picker */}
          <View style={styles.exercisePickerHeader}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Chọn bài tập hôm nay:</Text>
            <TouchableOpacity
              style={[styles.addExBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
              onPress={() => setModalVisible(true)}
            >
              <Plus size={13} color={colors.warning} />
              <Text style={[styles.addExBtnText, { color: colors.warning }]}>Thêm bài mới</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.exerciseList}>
            {gymExercises.map((ex) => {
              const isSelected = selectedExerciseIds.includes(ex.id);
              return (
                <TouchableOpacity
                  key={ex.id}
                  style={[
                    styles.exerciseCard,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    isSelected && [styles.exerciseCardActive, { backgroundColor: colors.warningLight, borderColor: colors.warning }],
                  ]}
                  onPress={() => toggleSelect(ex.id)}
                >
                  <View style={[styles.checkbox, isSelected && [styles.checkboxActive, { backgroundColor: colors.warning }]]}>
                    {isSelected && <Check size={12} color="#FFFFFF" />}
                  </View>
                  <View style={styles.exInfo}>
                    <Text style={[styles.exName, { color: colors.text }]}>{ex.name}</Text>
                    <Text style={[styles.exSets, { color: colors.textSubtle }]}>
                      {ex.sets} hiệp × {ex.reps} reps
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.warning }]} onPress={startWorkout}>
            <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.startBtnText}>
              BẮT ĐẦU TẬP ({selectedExerciseIds.length} BÀI · {targetDurationMinutes} PHÚT)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active Phase */}
      {phase === 'active' && (
        <View>
          {/* Active Timer Header */}
          <View style={[styles.activeTimerHeader, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
            <View>
              <Text style={[styles.timerSubLabel, { color: colors.textSubtle }]}>Thời gian đang tập</Text>
              <Text style={[styles.timerLargeValue, { color: colors.warning }]}>{formatTime(elapsedMs)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.timerSubLabel, { color: colors.textSubtle }]}>Mục tiêu</Text>
              <Text style={[styles.timerTargetValue, { color: colors.text }]}>{targetDurationMinutes} phút</Text>
            </View>
          </View>

          {/* Rest Timer Banner */}
          {isResting && (
            <View style={[styles.restBanner, { backgroundColor: colors.infoLight, borderColor: colors.info }]}>
              <Timer size={18} color={colors.info} />
              <Text style={[styles.restBannerText, { color: colors.info }]}>
                Nghỉ ngơi giữa hiệp: còn {restRemaining}s
              </Text>
            </View>
          )}

          {/* Active Exercises Sets Checklist */}
          <View style={styles.activeList}>
            {activeExercises.map((ex) => (
              <View key={ex.id} style={[styles.activeCard, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
                <View style={styles.activeCardLeft}>
                  <Text style={[styles.activeExName, { color: colors.text }]}>{ex.name}</Text>
                  <Text style={[styles.activeExSetsSub, { color: colors.textSubtle }]}>
                    Tiến độ: {ex.completedSets}/{ex.sets} hiệp
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.setCountBtn, { backgroundColor: ex.completedSets >= ex.sets ? colors.primary : colors.warning }]}
                  onPress={() => {
                    handleIncrementSet(ex.id);
                    if (ex.completedSets < ex.sets) startRestBreak(60);
                  }}
                >
                  <Text style={styles.setCountText}>
                    {ex.completedSets >= ex.sets ? '✓ Xong' : `+ Hiệp (${ex.completedSets}/${ex.sets})`}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Finish / Early Stop Button */}
          {isEligibleForCoins ? (
            <TouchableOpacity style={[styles.finishBtn, { backgroundColor: '#10B981' }]} onPress={finishWorkout}>
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>HOÀN TẤT & NHẬN +{expectedCoins} COINS</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.finishBtn, { backgroundColor: colors.warning }]} onPress={handleFinishPress}>
              <Square size={18} color="#FFFFFF" />
              <Text style={styles.finishBtnText}>
                DỪNG TẬP SỚM (CÒN {formatTime(remainingTargetMs)})
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completed Phase */}
      {phase === 'completed' && (
        <View style={[styles.completedBox, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <CheckCircle2 size={40} color={colors.warning} />
          <Text style={[styles.completedTitle, { color: colors.warning }]}>
            HOÀN THÀNH BUỔI TẬP GYM!
          </Text>
          <Text style={[styles.completedSub, { color: colors.textMuted }]}>
            Bộ não đã được tăng cường tuần hoàn máu, hồi phục thêm sinh lực HP!
          </Text>
          <View style={styles.rewardRow}>
            <Coins size={22} color={colors.warning} />
            <Text style={[styles.rewardCoins, { color: colors.warning }]}>
              +{expectedCoins} COINS
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.claimBtn, { backgroundColor: colors.warning }]}
            onPress={() => setPhase('setup')}
          >
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Tiếp tục</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Xác Nhận Dừng Tập Gym Sớm */}
      <Modal visible={stopModalVisible} transparent animationType="fade" onRequestClose={() => setStopModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle size={24} color="#DC2626" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>Chưa Đủ Thời Gian Tập!</Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.textMuted, lineHeight: 22, marginBottom: 18 }}>
              Thời gian đã tập: <Text style={{ fontWeight: '800', color: colors.warning }}>{formatTime(elapsedMs)}</Text> / {targetDurationMinutes} phút.{'\n'}
              Thời gian còn thiếu: <Text style={{ fontWeight: '800', color: colors.text }}>{formatTime(remainingTargetMs)}</Text>.{'\n\n'}
              <Text style={{ fontWeight: '700', color: colors.text }}>Quy định nhận Coins:</Text> Bạn chỉ nhận được Coins khi hoàn thành trọn vẹn hoặc chỉ còn cách đích tối đa 1 phút.{'\n\n'}
              Nếu dừng bây giờ bạn sẽ <Text style={{ fontWeight: '800', color: '#DC2626' }}>KHÔNG nhận được Coins</Text>!
            </Text>

            <View style={{ flexDirection: 'column', gap: 10 }}>
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: colors.warning, marginTop: 0 }]}
                onPress={() => {
                  setStopModalVisible(false);
                  hapticService.light();
                }}
              >
                <Text style={styles.startBtnText}>Tiếp tục tập luyện</Text>
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
                onPress={confirmAbortWorkout}
              >
                <Text style={{ color: '#DC2626', fontSize: 14, fontWeight: '700' }}>Dừng tập (Không nhận Coins)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Add Custom Exercise */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm bài tập mới</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Tên bài tập (vd: Hip Thrust, Dips...)"
              placeholderTextColor={colors.textSubtle}
              value={newExName}
              onChangeText={setNewExName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Số hiệp (vd: 3)"
              placeholderTextColor={colors.textSubtle}
              keyboardType="numeric"
              value={newExSets}
              onChangeText={setNewExSets}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Số reps (vd: 8-12)"
              placeholderTextColor={colors.textSubtle}
              value={newExReps}
              onChangeText={setNewExReps}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.bgSubtle }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.warning }]} onPress={handleAddNewExercise}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Thêm</Text>
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
  durationSection: {
    marginBottom: 16,
  },
  durationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  durationHighlight: {
    fontSize: 14,
    fontWeight: '800',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  presetChipActive: {
    borderWidth: 1.5,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 8,
  },
  adjustBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exercisePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  addExBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  exerciseList: {
    gap: 8,
    marginBottom: 16,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  exerciseCardActive: {
    borderWidth: 1.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    borderColor: '#F59E0B',
  },
  exInfo: {
    flex: 1,
  },
  exName: {
    fontSize: 13,
    fontWeight: '700',
  },
  exSets: {
    fontSize: 11,
    fontWeight: '500',
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
  activeTimerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  timerSubLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  timerLargeValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  timerTargetValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  restBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeList: {
    gap: 8,
    marginBottom: 16,
  },
  activeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeCardLeft: {
    flex: 1,
  },
  activeExName: {
    fontSize: 13,
    fontWeight: '800',
  },
  activeExSetsSub: {
    fontSize: 11,
    marginTop: 2,
  },
  setCountBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  setCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});
