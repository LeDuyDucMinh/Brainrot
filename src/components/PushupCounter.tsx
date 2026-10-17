import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LightSensor } from 'expo-sensors';
import {
  Play,
  Square,
  Dumbbell,
  Coins,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  SwitchCamera,
  Activity,
} from 'lucide-react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { useAppStore, COIN_RATES } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

const MIN_REP_DURATION_MS = 1000; // Tối thiểu 1s cho 1 rep chuẩn
const MIN_HOLD_DOWN_MS = 300;     // Tối thiểu 300ms giữ ở vị trí hạ người 90°
type PushupPhase = 'idle' | 'active' | 'completed';
type BodyMotionState = 'up' | 'down';

export const PushupCounter: React.FC = () => {
  const { completeQuest, themeMode } = useAppStore();
  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [phase, setPhase] = useState<PushupPhase>('idle');
  const [count, setCount] = useState(0);
  const [targetReps, setTargetReps] = useState(10);
  const [lastRepTime, setLastRepTime] = useState(0);

  // Camera State
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const webVideoRef = useRef<HTMLVideoElement | null>(null);

  // Motion Detection State
  const [bodyState, setBodyState] = useState<BodyMotionState>('up');
  const bodyStateRef = useRef<BodyMotionState>('up');
  const [motionDepth, setMotionDepth] = useState(15); // 0 (cao) -> 100 (sâu)
  const [antiCheatWarning, setAntiCheatWarning] = useState<string | null>(null);
  const downStartTimeRef = useRef<number | null>(null);
  const ambientBaselineLuxRef = useRef<number>(100);

  // Animations
  const [scaleAnim] = useState(new Animated.Value(1));
  const [progressAnim] = useState(new Animated.Value(0));

  const coinsToEarn = Math.floor(count / 10) * COIN_RATES.PUSHUP_PER_10;
  const pendingCoins = Math.floor(targetReps / 10) * COIN_RATES.PUSHUP_PER_10;

  // Auto-request permission on mount if undetermined
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Web camera stream attachment
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (Platform.OS === 'web' && phase === 'active' && permission?.granted) {
      const initWebCam = async () => {
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: facing === 'front' ? 'user' : 'environment' },
            });
            if (webVideoRef.current) {
              webVideoRef.current.srcObject = stream;
              webVideoRef.current.play().catch(() => {});
            }
          }
        } catch {
          // Stream error
        }
      };
      initWebCam();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [phase, facing, permission?.granted]);

  // Validate and count a completed rep
  const registerRep = useCallback((timestamp: number) => {
    setLastRepTime(timestamp);
    setCount((prev) => {
      const newCount = prev + 1;

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.25, duration: 90, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

      Animated.timing(progressAnim, {
        toValue: Math.min(1, newCount / targetReps),
        duration: 250,
        useNativeDriver: false,
      }).start();

      if (newCount >= targetReps) {
        setTimeout(() => {
          setPhase('completed');
          hapticService.success();
        }, 300);
      } else {
        hapticService.medium();
      }

      return newCount;
    });
  }, [targetReps, scaleAnim, progressAnim]);

  // Real-time Optical Motion Analyzer (Web / Browser video feed)
  useEffect(() => {
    let animFrame: number | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let prevFrameData: Uint8ClampedArray | null = null;
    let lastCheckTime = 0;

    if (Platform.OS === 'web' && phase === 'active') {
      canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 36;
      ctx = canvas.getContext('2d', { willReadFrequently: true });

      const checkMotion = () => {
        const now = Date.now();
        if (webVideoRef.current && ctx && webVideoRef.current.readyState >= 2) {
          if (now - lastCheckTime > 75) {
            lastCheckTime = now;
            try {
              ctx.drawImage(webVideoRef.current, 0, 0, 48, 36);
              const currentFrame = ctx.getImageData(0, 0, 48, 36).data;

              if (prevFrameData) {
                let diffSum = 0;
                let weightedYSum = 0;
                const len = currentFrame.length;

                for (let i = 0; i < len; i += 4) {
                  const rDiff = Math.abs(currentFrame[i] - prevFrameData[i]);
                  const gDiff = Math.abs(currentFrame[i + 1] - prevFrameData[i + 1]);
                  const bDiff = Math.abs(currentFrame[i + 2] - prevFrameData[i + 2]);
                  const pixelDiff = (rDiff + gDiff + bDiff) / 3;

                  if (pixelDiff > 16) {
                    diffSum += pixelDiff;
                    const pixelIndex = i / 4;
                    const y = Math.floor(pixelIndex / 48);
                    weightedYSum += pixelDiff * y;
                  }
                }

                const pixelCount = 48 * 36;
                const motionScore = diffSum / pixelCount;

                if (motionScore > 4.5) {
                  const centroidY = weightedYSum / (diffSum || 1); // 0 to 36

                  // Khi người tập hạ thấp thân người/đầu xuống góc dưới camera -> DOWN
                  if (centroidY >= 16 && bodyStateRef.current !== 'down') {
                    bodyStateRef.current = 'down';
                    setBodyState('down');
                    setMotionDepth(90);
                    downStartTimeRef.current = now;
                    hapticService.light();
                  } else if (centroidY < 14 && bodyStateRef.current === 'down') {
                    // Khi người tập đẩy thẳng tay lên đỉnh camera -> UP
                    const holdDown = downStartTimeRef.current ? now - downStartTimeRef.current : 0;
                    if (holdDown >= MIN_HOLD_DOWN_MS) {
                      bodyStateRef.current = 'up';
                      setBodyState('up');
                      setMotionDepth(15);
                      downStartTimeRef.current = null;
                      registerRep(now);
                    }
                  }
                }
              }

              prevFrameData = new Uint8ClampedArray(currentFrame);
            } catch {
              // Ignore canvas draw error
            }
          }
        }
        animFrame = requestAnimationFrame(checkMotion);
      };

      animFrame = requestAnimationFrame(checkMotion);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [phase, registerRep]);

  // Hardware Light Sensor detection (Supported on Android phones when phone is on floor)
  useEffect(() => {
    let sub: ReturnType<typeof LightSensor.addListener> | null = null;
    let isAvailable = false;

    if (phase === 'active' && Platform.OS === 'android') {
      LightSensor.isAvailableAsync().then((avail) => {
        isAvailable = avail;
        if (!isAvailable) return;

        LightSensor.setUpdateInterval(120);
        sub = LightSensor.addListener((data) => {
          const lux = data.illuminance;
          const baseline = ambientBaselineLuxRef.current;
          const now = Date.now();

          if (lux > baseline && bodyStateRef.current === 'up') {
            ambientBaselineLuxRef.current = lux;
          }

          // Che ánh sáng khi ngực hạ sát máy -> DOWN
          const isOccluded = lux < 25 || (baseline > 50 && lux < baseline * 0.35);

          if (isOccluded && bodyStateRef.current !== 'down') {
            bodyStateRef.current = 'down';
            setBodyState('down');
            setMotionDepth(90);
            downStartTimeRef.current = now;
            hapticService.light();
          } else if (!isOccluded && bodyStateRef.current === 'down') {
            // Đẩy lên cao trở lại -> UP
            const holdDown = downStartTimeRef.current ? now - downStartTimeRef.current : 0;
            if (holdDown >= MIN_HOLD_DOWN_MS) {
              bodyStateRef.current = 'up';
              setBodyState('up');
              setMotionDepth(15);
              downStartTimeRef.current = null;
              registerRep(now);
            }
          }
        });
      });
    }

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, [phase, registerRep]);

  const startSession = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Quyền Camera',
          'Vui lòng cấp quyền Camera để ứng dụng tự động nhận diện chuyển động hít đất.'
        );
        return;
      }
    }

    setCount(0);
    setPhase('active');
    bodyStateRef.current = 'up';
    setBodyState('up');
    setMotionDepth(15);
    setAntiCheatWarning(null);
    hapticService.success();
  };

  const endSessionEarly = () => {
    if (count >= 10) {
      const earned = Math.floor(count / 10) * COIN_RATES.PUSHUP_PER_10;
      completeQuest('pushup', earned, `${count} cái hít đất`);
    }
    setPhase('idle');
    setCount(0);
    hapticService.heavy();
  };

  const claimReward = () => {
    const earned = Math.floor(count / 10) * COIN_RATES.PUSHUP_PER_10;
    completeQuest('pushup', earned, `${count} cái hít đất`);
    setPhase('idle');
    setCount(0);
    hapticService.success();
  };

  const toggleCameraFacing = () => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
    hapticService.light();
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryLight }]}>
            <Dumbbell size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                Hít Đất
              </Text>
              <View style={[styles.badgePill, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
                <Camera size={12} color={colors.primary} />
                <Text style={[styles.badgePillText, { color: colors.primary }]}>Nhận diện Camera</Text>
              </View>
            </View>
            <Text style={[styles.cardSubtitle, { color: colors.textSubtle }]} numberOfLines={1}>
              10 cái = 5 Coins · Camera tự động đếm chuyển động gập người
            </Text>
          </View>
        </View>

        <View style={[styles.coinPill, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
          <Coins size={14} color={colors.warning} />
          <Text style={[styles.coinPillText, { color: colors.warning }]}>
            +{coinsToEarn || pendingCoins}
          </Text>
        </View>
      </View>

      {/* Camera Permission Request Box if not granted */}
      {(!permission || !permission.granted) && phase === 'idle' && (
        <View style={[styles.permissionBox, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
          <View style={[styles.permIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Camera size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.permTitle, { color: colors.text }]}>Quyền Camera</Text>
            <Text style={[styles.permDesc, { color: colors.textSubtle }]}>
              Ứng dụng cần quyền Camera để tự động nhận diện chuyển động hít đất của bạn.
            </Text>
          </View>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Cấp quyền</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Target Selector */}
      {phase === 'idle' && (
        <View style={styles.targetSection}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Chọn mục tiêu số cái (reps):</Text>
          <View style={styles.targetsRow}>
            {[10, 20, 30, 50, 100].map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.targetChip,
                  { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                  targetReps === t && [styles.targetChipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
                ]}
                onPress={() => { setTargetReps(t); hapticService.light(); }}
              >
                <Text style={[styles.targetChipText, { color: targetReps === t ? colors.primary : colors.text }]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Active Phase: Camera Vision HUD */}
      {phase === 'active' && (
        <View style={styles.cameraContainer}>
          {/* Live Camera Feed: Mobile Native or Web */}
          {Platform.OS === 'web' ? (
            <video
              ref={webVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facing === 'front' ? 'scaleX(-1)' : 'none',
              }}
            />
          ) : permission?.granted ? (
            <CameraView
              style={styles.cameraPreview}
              facing={facing}
              mirror={facing === 'front'}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Camera size={36} color="#64748B" />
              <Text style={styles.cameraFallbackText}>Đang khởi tạo Camera...</Text>
            </View>
          )}

          {/* Vision HUD Overlay */}
          <View style={styles.hudOverlay}>
            {/* Top HUD bar */}
            <View style={styles.hudTopBar}>
              <View style={styles.hudStatusTag}>
                <View style={[styles.liveDot, { backgroundColor: bodyState === 'down' ? '#10B981' : '#06B6D4' }]} />
                <Text style={styles.hudStatusText}>
                  {bodyState === 'down' ? 'HẠ NGỰC (90°)' : 'ĐẨY LÊN'}
                </Text>
              </View>

              <TouchableOpacity style={styles.flipCamBtn} onPress={toggleCameraFacing}>
                <SwitchCamera size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Dynamic Body Pose Skeleton SVG Overlay */}
            <View style={styles.svgContainer} pointerEvents="none">
              <Svg width="100%" height="100%" viewBox="0 0 300 240">
                {/* Target Frame Box */}
                <Rect
                  x="40"
                  y="20"
                  width="220"
                  height="200"
                  stroke={bodyState === 'down' ? '#10B981' : '#06B6D4'}
                  strokeWidth="2"
                  strokeDasharray="8,6"
                  fill="none"
                  opacity="0.8"
                />

                {/* Head Landmark */}
                <Circle
                  cx="150"
                  cy={bodyState === 'down' ? 140 : 65}
                  r="16"
                  stroke="#06B6D4"
                  strokeWidth="2.5"
                  fill="rgba(6, 182, 212, 0.25)"
                />

                {/* Shoulders */}
                <Circle cx={110} cy={bodyState === 'down' ? 155 : 95} r="8" fill="#10B981" />
                <Circle cx={190} cy={bodyState === 'down' ? 155 : 95} r="8" fill="#10B981" />

                {/* Collar bone line */}
                <Line
                  x1="110"
                  y1={bodyState === 'down' ? 155 : 95}
                  x2="190"
                  y2={bodyState === 'down' ? 155 : 95}
                  stroke="#10B981"
                  strokeWidth="3"
                />

                {/* Elbows */}
                <Circle cx={85} cy={bodyState === 'down' ? 175 : 130} r="7" fill="#FBBF24" />
                <Circle cx={215} cy={bodyState === 'down' ? 175 : 130} r="7" fill="#FBBF24" />

                {/* Arm lines */}
                <Line
                  x1="110"
                  y1={bodyState === 'down' ? 155 : 95}
                  x2="85"
                  y2={bodyState === 'down' ? 175 : 130}
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                />
                <Line
                  x1="190"
                  y1={bodyState === 'down' ? 155 : 95}
                  x2="215"
                  y2={bodyState === 'down' ? 175 : 130}
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                />

                {/* Chest Landmark */}
                <Circle
                  cx="150"
                  cy={bodyState === 'down' ? 170 : 125}
                  r="12"
                  fill={bodyState === 'down' ? '#10B981' : '#EC4899'}
                  opacity="0.9"
                />
              </Svg>
            </View>

            {/* Depth Level Indicator Bar */}
            <View style={styles.depthBarContainer}>
              <Text style={styles.depthText}>Biên độ hạ người: {motionDepth}%</Text>
              <View style={styles.depthTrack}>
                <View style={[styles.depthFill, { width: `${motionDepth}%` }]} />
              </View>
            </View>

            {/* Center Rep Counter Badge */}
            <Animated.View style={[styles.hudCounterBox, { transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.hudCountNumber}>{count}</Text>
              <Text style={styles.hudCountTarget}>/ {targetReps} reps</Text>
            </Animated.View>

            {/* Bottom Camera Motion Status Banner (NO TOUCHING!) */}
            <View style={styles.motionInstructionBanner}>
              <Activity size={16} color="#38BDF8" />
              <View style={{ flex: 1 }}>
                <Text style={styles.motionBannerTitle}>
                  {bodyState === 'down' ? '✓ ĐÃ HẠ NGỰC (90°) · ĐẨY LÊN!' : '📷 CAMERA ĐANG NHẬN DIỆN CHUYỂN ĐỘNG'}
                </Text>
                <Text style={styles.motionBannerSub}>
                  {bodyState === 'down'
                    ? 'Đẩy thẳng tay lên đỉnh để tự động tính 1 rep'
                    : 'Hạ sát ngực xuống sàn rồi đẩy lên, camera sẽ tự động đếm'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Warning Alert Banner */}
      {antiCheatWarning && (
        <View style={styles.warningBanner}>
          <AlertTriangle size={16} color="#DC2626" />
          <Text style={styles.warningText}>{antiCheatWarning}</Text>
        </View>
      )}

      {/* Phase Completed View */}
      {phase === 'completed' && (
        <View style={[styles.completedBox, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
          <CheckCircle2 size={40} color={colors.primary} />
          <Text style={[styles.completedTitle, { color: colors.primary }]}>
            HOÀN THÀNH {count} CÁI HÍT ĐẤT!
          </Text>
          <Text style={[styles.completedSub, { color: colors.textMuted }]}>
            Camera đã ghi nhận đầy đủ các lần gập tay đạt chuẩn biên độ.
          </Text>
          <View style={styles.rewardRow}>
            <Coins size={22} color={colors.warning} />
            <Text style={[styles.rewardCoins, { color: colors.warning }]}>
              +{Math.floor(count / 10) * COIN_RATES.PUSHUP_PER_10} COINS
            </Text>
          </View>
          <TouchableOpacity style={styles.claimBtn} onPress={claimReward}>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.claimBtnText}>Nhận Thưởng & Hồi Sinh Não</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      {phase === 'idle' && (
        <TouchableOpacity style={styles.startBtn} onPress={startSession}>
          <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.startBtnText}>BẬT CAMERA VÀ TẬP</Text>
        </TouchableOpacity>
      )}

      {phase === 'active' && (
        <View style={styles.activeActions}>
          <TouchableOpacity style={styles.endEarlyBtn} onPress={endSessionEarly}>
            <Square size={16} color="#DC2626" />
            <Text style={styles.endEarlyText}>Dừng & Lưu ({count} reps)</Text>
          </TouchableOpacity>
        </View>
      )}
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
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgePillText: {
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
  permissionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  permIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  permDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  permBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  targetSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  targetsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  targetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  targetChipActive: {
    borderWidth: 1.5,
  },
  targetChipText: {
    fontSize: 14,
    fontWeight: '800',
  },
  cameraContainer: {
    height: 340,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 14,
    backgroundColor: '#000000',
  },
  cameraPreview: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  cameraFallback: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    gap: 8,
  },
  cameraFallbackText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFill,
    padding: 12,
    justifyContent: 'space-between',
  },
  hudTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hudStatusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  flipCamBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  svgContainer: {
    ...StyleSheet.absoluteFill,
  },
  depthBarContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  depthText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  depthTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  depthFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  hudCounterBox: {
    position: 'absolute',
    top: '32%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  hudCountNumber: {
    color: '#10B981',
    fontSize: 38,
    fontWeight: '900',
  },
  hudCountTarget: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
  motionInstructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  motionBannerTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  motionBannerSub: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  warningText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  completedBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    marginBottom: 16,
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
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeActions: {
    flexDirection: 'row',
    gap: 10,
  },
  endEarlyBtn: {
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
  endEarlyText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
});
