import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Lock, Coins, Swords, ShoppingCart, Sparkles, X } from 'lucide-react-native';
import { useAppStore, TIME_PACKAGES, RestrictedApp } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';

const { width, height } = Dimensions.get('window');

interface HardLockModalProps {
  visible: boolean;
  app: RestrictedApp | null;
  onNavigateToQuests?: () => void;
  onDismiss?: () => void;
  onClose?: () => void;
  onGoToQuests?: () => void;
  onGoToShop?: () => void;
}

const MOTIVATIONAL_MESSAGES = [
  'Không có đường tắt. Chỉ có đường CÀY.',
  'Muốn lướt? Phải LÀM VIỆC trước đã!',
  'Thời gian giải trí phải được KIẾM, không phải XIN.',
  'Cày nhiệm vụ đi. App không tự mở đâu.',
  'Hít đất xong hãy quay lại. 💪',
  'Deep Work trước, TikTok sau.',
  'Đổ mồ hôi = Đổi giờ lướt.',
  'Dopamine rẻ tiền sẽ giết chết tương lai của bạn!',
];

export const HardLockModal: React.FC<HardLockModalProps> = ({
  visible,
  app,
  onNavigateToQuests,
  onDismiss,
  onClose,
  onGoToQuests,
  onGoToShop,
}) => {
  const handleQuests = onNavigateToQuests || onGoToQuests || (() => {});
  const handleDismiss = onDismiss || onClose || (() => {});

  const { coins, purchaseUnlock } = useAppStore();
  const [message, setMessage] = useState(
    MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]
  );
  const [pulseAnim] = useState(new Animated.Value(1));
  const [showShop, setShowShop] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setMessage(MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)]);
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [visible]);

  const handlePurchase = (pkgId: string) => {
    if (!app) return;
    const pkg = TIME_PACKAGES.find((p) => p.id === pkgId);
    if (!pkg) return;

    const success = purchaseUnlock(app.id, pkg);
    if (success) {
      hapticService.success();
      setPurchaseSuccess(true);
      setTimeout(() => {
        setPurchaseSuccess(false);
        setShowShop(false);
        handleDismiss();
      }, 1500);
    } else {
      hapticService.error();
    }
  };

  if (!app) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <View style={styles.gradientOverlay} />

        {/* Nút đóng mô phỏng (cho dev / testing) */}
        <TouchableOpacity
          style={styles.closeSimBtn}
          onPress={() => {
            hapticService.light();
            handleDismiss();
          }}
        >
          <X size={20} color="#64748B" />
        </TouchableOpacity>

        {purchaseSuccess ? (
          <View style={styles.successContainer}>
            <Text style={styles.successEmoji}>🎉</Text>
            <Text style={styles.successText}>MỞ KHÓA THÀNH CÔNG!</Text>
            <Text style={styles.successSubtext}>
              {app.name} đã được mở. Sử dụng khôn ngoan nhé!
            </Text>
          </View>
        ) : showShop ? (
          // === SHOP VIEW ===
          <View style={styles.shopContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticService.light();
                setShowShop(false);
              }}
            >
              <Text style={styles.backButtonText}>← Quay lại màn hình khóa</Text>
            </TouchableOpacity>

            <ShoppingCart size={40} color="#10B981" />
            <Text style={styles.shopTitle}>Đổi Coins Lấy Giờ</Text>
            <Text style={styles.shopSubtitle}>Mở khóa ứng dụng {app.name}</Text>

            <View style={styles.coinBadgeLarge}>
              <Coins size={20} color="#FBBF24" />
              <Text style={styles.coinBadgeText}>{coins} Coins</Text>
            </View>

            <View style={styles.packagesContainer}>
              {TIME_PACKAGES.map((pkg) => {
                const canAfford = coins >= pkg.costCoins;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.packageCard,
                      !canAfford && styles.packageCardDisabled,
                    ]}
                    onPress={() => canAfford && handlePurchase(pkg.id)}
                    disabled={!canAfford}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.packageDuration}>{pkg.label}</Text>
                    <View style={styles.packageCostRow}>
                      <Coins size={14} color={canAfford ? '#FBBF24' : '#4B5563'} />
                      <Text
                        style={[
                          styles.packageCost,
                          !canAfford && styles.packageCostDisabled,
                        ]}
                      >
                        {pkg.costCoins}
                      </Text>
                    </View>
                    {!canAfford && (
                      <Text style={styles.insufficientText}>Thiếu coins</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          // === LOCK VIEW ===
          <View style={styles.lockContainer}>
            {/* Animated Lock Icon */}
            <Animated.View
              style={[styles.lockIconWrapper, { transform: [{ scale: pulseAnim }] }]}
            >
              <View style={styles.lockIconCircle}>
                <Lock size={48} color="#EF4444" />
              </View>
            </Animated.View>

            {/* App Name */}
            <Text style={styles.lockedAppName}>{app.name}</Text>
            <Text style={styles.lockedStatus}>ĐÃ BỊ KHÓA CỨNG</Text>

            {/* Motivational Message */}
            <View style={styles.messageBox}>
              <Text style={styles.messageText}>{message}</Text>
            </View>

            {/* Coin Balance */}
            <View style={styles.coinBadge}>
              <Coins size={18} color="#FBBF24" />
              <Text style={styles.coinText}>{coins} Coins trong ví</Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              {/* Primary: Đi cày nhiệm vụ */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  hapticService.success();
                  handleQuests();
                }}
                activeOpacity={0.8}
              >
                <Swords size={22} color="#000" />
                <Text style={styles.primaryButtonText}>
                  ĐI CÀY NHIỆM VỤ NGAY
                </Text>
              </TouchableOpacity>

              {/* Secondary: Dùng Coins mở khóa */}
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  coins === 0 && styles.secondaryButtonDisabled,
                ]}
                onPress={() => {
                  hapticService.light();
                  setShowShop(true);
                }}
                disabled={coins === 0}
                activeOpacity={0.8}
              >
                <ShoppingCart size={20} color={coins > 0 ? '#10B981' : '#4B5563'} />
                <Text
                  style={[
                    styles.secondaryButtonText,
                    coins === 0 && styles.secondaryButtonTextDisabled,
                  ]}
                >
                  DÙNG COINS MỞ KHÓA
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.noBypassText}>
              🔒 Cơ chế Hard-Lock: Không thể bỏ qua mà không hoàn thành nhiệm vụ.
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
  },
  closeSimBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  // === LOCK VIEW ===
  lockContainer: {
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
  },
  lockIconWrapper: {
    marginBottom: 20,
  },
  lockIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedAppName: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lockedStatus: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 3,
    marginBottom: 20,
  },
  messageBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: '100%',
  },
  messageText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FCA5A5',
    textAlign: 'center',
    lineHeight: 22,
  },
  coinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 28,
    gap: 8,
  },
  coinText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FBBF24',
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
  },
  secondaryButtonDisabled: {
    borderColor: '#374151',
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },
  secondaryButtonTextDisabled: {
    color: '#4B5563',
  },
  noBypassText: {
    marginTop: 24,
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // === SHOP VIEW ===
  shopContainer: {
    alignItems: 'center',
    zIndex: 1,
    width: '100%',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
  },
  shopTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 12,
  },
  shopSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 16,
  },
  coinBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 8,
  },
  coinBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FBBF24',
  },
  packagesContainer: {
    width: '100%',
    gap: 10,
  },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  packageCardDisabled: {
    backgroundColor: 'rgba(55, 65, 81, 0.2)',
    borderColor: '#374151',
  },
  packageDuration: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  packageCostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  packageCost: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
  },
  packageCostDisabled: {
    color: '#4B5563',
  },
  insufficientText: {
    fontSize: 10,
    color: '#EF4444',
    position: 'absolute',
    bottom: 3,
    right: 20,
    fontWeight: '700',
  },
  // === SUCCESS VIEW ===
  successContainer: {
    alignItems: 'center',
    zIndex: 1,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  successText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10B981',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

export default HardLockModal;
