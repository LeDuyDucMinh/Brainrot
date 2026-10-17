import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShieldAlert,
  Coins,
  Lock,
  Unlock,
  Clock,
  ShoppingCart,
  AlertCircle,
  Hourglass,
  CheckCircle2,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  X,
  LockKeyhole,
  Sliders,
} from 'lucide-react-native';
import {
  useAppStore,
  TIME_PACKAGES,
  APP_REMOVAL_COST,
  APP_REMOVAL_COOLDOWN_MS,
  RestrictedApp,
  TimePackage,
  calculateCoinsForMinutes,
} from '../../store/useAppStore';
import { hapticService } from '../../utils/haptics';
import { lightTheme, darkTheme } from '../../theme/colors';

export default function BlockerAndShopScreen() {
  const {
    coins,
    restrictedApps,
    toggleAppRestriction,
    addCustomApp,
    deleteRestrictedApp,
    cancelRemovalRequest,
    purchaseUnlock,
    lockAppImmediately,
    checkAndExpireUnlocks,
    themeMode,
  } = useAppStore();

  const colors = themeMode === 'light' ? lightTheme : darkTheme;

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedAppForPurchase, setSelectedAppForPurchase] = useState<string>(
    restrictedApps.find((a) => a.isRestricted)?.id || restrictedApps[0]?.id || ''
  );
  const [purchaseFeedback, setPurchaseFeedback] = useState<string | null>(null);

  // Modal thêm app mới
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [customAppName, setCustomAppName] = useState('');

  // Custom minutes exchange
  const [customMinutes, setCustomMinutes] = useState('20');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
      checkAndExpireUnlocks();
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!restrictedApps.find((a) => a.id === selectedAppForPurchase)) {
      const first = restrictedApps.find((a) => a.isRestricted)?.id || restrictedApps[0]?.id || '';
      setSelectedAppForPurchase(first);
    }
  }, [restrictedApps]);

  const activeUnlocks = restrictedApps.filter(
    (a) => a.isRestricted && a.unlockedUntil && a.unlockedUntil > currentTime
  );

  const formatRemainingTime = (expiresAt: number): string => {
    const diff = Math.max(0, expiresAt - currentTime);
    const totalSecs = Math.floor(diff / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatCooldownRemaining = (requestedAt: number): string => {
    const elapsed = currentTime - requestedAt;
    const diff = Math.max(0, APP_REMOVAL_COOLDOWN_MS - elapsed);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const handleToggleRestriction = (app: RestrictedApp) => {
    if (!app.isRestricted) {
      toggleAppRestriction(app.id);
      hapticService.success();
    } else {
      if (app.removalRequestedAt) {
        const elapsed = currentTime - app.removalRequestedAt;
        if (elapsed >= APP_REMOVAL_COOLDOWN_MS) {
          toggleAppRestriction(app.id);
          Alert.alert('Thành công', `Đã gỡ ${app.name} khỏi danh sách hạn chế.`);
          return;
        } else {
          const remainingStr = formatCooldownRemaining(app.removalRequestedAt);
          Alert.alert(
            'Đang Chờ Cooldown',
            `Bạn đã yêu cầu gỡ ${app.name}.\nThời gian còn lại: ${remainingStr}.\n\nBạn có thể trả ngay ${APP_REMOVAL_COST} Coins để gỡ lập tức, hoặc hủy yêu cầu gỡ để tiếp tục kỷ luật.`,
            [
              { text: 'Chờ tiếp', style: 'cancel' },
              {
                text: 'Hủy yêu cầu gỡ',
                onPress: () => {
                  cancelRemovalRequest(app.id);
                  Alert.alert('Đã hủy', `Tiếp tục khóa ${app.name}. Ý chí rất tốt! 💪`);
                },
              },
              {
                text: `Trả ${APP_REMOVAL_COST} Coins`,
                style: 'destructive',
                onPress: () => {
                  const ok = toggleAppRestriction(app.id);
                  if (ok) {
                    Alert.alert('Đã gỡ', `Đã trừ ${APP_REMOVAL_COST} Coins.`);
                  } else {
                    Alert.alert('Không đủ Coins', `Bạn cần ${APP_REMOVAL_COST} Coins để gỡ ngay.`);
                  }
                },
              },
            ]
          );
          return;
        }
      }

      Alert.alert(
        'Yêu Cầu Gỡ Khóa',
        `Để tránh lách luật lúc yếu lòng, gỡ khóa ${app.name} yêu cầu:\n\n• Chờ Cooldown 24 Giờ (Miễn phí)\n• Hoặc phạt ngay ${APP_REMOVAL_COST} Coins`,
        [
          { text: 'Suy nghĩ lại', style: 'cancel' },
          {
            text: 'Bắt đầu Cooldown 24h',
            onPress: () => {
              toggleAppRestriction(app.id);
            },
          },
          {
            text: `Phạt ${APP_REMOVAL_COST} Coins`,
            style: 'destructive',
            onPress: () => {
              const ok = toggleAppRestriction(app.id);
              if (!ok) {
                Alert.alert('Không đủ Coins', `Bạn cần ${APP_REMOVAL_COST} Coins để gỡ ngay.`);
              }
            },
          },
        ]
      );
    }
  };

  const handleBuyPackage = (pkg: TimePackage) => {
    if (!selectedAppForPurchase) {
      Alert.alert('Chưa chọn app', 'Vui lòng chọn ứng dụng cần mở khóa.');
      return;
    }
    const app = restrictedApps.find((a) => a.id === selectedAppForPurchase);
    if (!app) return;

    if (coins < pkg.costCoins) {
      Alert.alert(
        'Không Đủ Coins',
        `Gói ${pkg.label} cần ${pkg.costCoins} Coins (tỷ lệ 40 coins = 30 phút). Bạn hiện có ${coins} Coins.\nHãy vào làm nhiệm vụ hít đất hoặc deep work để cày thêm nhé!`
      );
      return;
    }

    const success = purchaseUnlock(app.id, pkg);
    if (success) {
      setPurchaseFeedback(`Đã mở khóa ${app.name} thêm ${pkg.label}!`);
      setTimeout(() => setPurchaseFeedback(null), 3000);
    }
  };

  const handleCustomBuy = () => {
    const mins = parseInt(customMinutes) || 0;
    if (mins <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số phút hợp lệ.');
      return;
    }
    const cost = calculateCoinsForMinutes(mins);
    const customPkg: TimePackage = {
      id: `custom-pkg-${mins}`,
      label: `${mins} phút`,
      durationMinutes: mins,
      costCoins: cost,
    };
    handleBuyPackage(customPkg);
  };

  const handleAddCustomApp = () => {
    if (!customAppName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên ứng dụng.');
      return;
    }
    addCustomApp(customAppName);
    setCustomAppName('');
    setAddModalVisible(false);
  };

  const handleDeleteApp = (app: RestrictedApp) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa vĩnh viễn ${app.name} khỏi danh sách quản lý?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            const ok = deleteRestrictedApp(app.id);
            if (!ok) {
              Alert.alert('Chưa thể xóa', 'Ứng dụng đang trong trạng thái khóa hoặc cooldown chưa hết 24h.');
            }
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
          <Text style={[styles.title, { color: colors.text }]}>QUẢN LÝ APP & SHOP</Text>
          <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
            Thiết lập khóa cứng · Tỷ lệ chuẩn 40 Coins = 30 Phút
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Anti-cheat banner */}
        <View style={[styles.ruleNotice, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <AlertCircle size={18} color="#DC2626" />
          <Text style={styles.ruleNoticeText}>
            Cơ chế chống lách luật: Gỡ app cần phạt{' '}
            <Text style={{ fontWeight: '800' }}>200 Coins</Text> hoặc{' '}
            <Text style={{ fontWeight: '800' }}>chờ 24 giờ</Text>. Không có ngoại lệ!
          </Text>
        </View>

        {/* Section: Đang mở khóa (Active Unlocks) */}
        {activeUnlocks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Đang Trong Thời Gian Mở Khóa</Text>
            </View>

            {activeUnlocks.map((app) => (
              <View key={app.id} style={[styles.activeUnlockCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.activeUnlockLeft}>
                  <Unlock size={18} color={colors.primary} />
                  <View>
                    <Text style={[styles.activeUnlockName, { color: colors.text }]}>{app.name}</Text>
                    <Text style={[styles.activeUnlockCountdown, { color: colors.primary }]}>
                      ⏳ Còn {formatRemainingTime(app.unlockedUntil!)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.relockBtn}
                  onPress={() => {
                    Alert.alert(
                      'Khóa lại ngay lập tức?',
                      `Bạn có chắc muốn khóa ${app.name} ngay? Thời gian còn lại sẽ bị hủy để bảo vệ bạn khỏi xao nhãng.`,
                      [
                        { text: 'Hủy', style: 'cancel' },
                        {
                          text: 'Khóa Ngay',
                          style: 'destructive',
                          onPress: () => lockAppImmediately(app.id),
                        },
                      ]
                    );
                  }}
                >
                  <LockKeyhole size={14} color="#DC2626" />
                  <Text style={styles.relockBtnText}>Khóa lại</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Section 1: Danh Sách Ứng Dụng Khóa Cứng */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderBetween}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Lock size={18} color={colors.danger} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Danh Sách Ứng Dụng</Text>
            </View>

            <TouchableOpacity
              style={[styles.addAppBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus size={14} color={colors.primary} />
              <Text style={[styles.addAppBtnText, { color: colors.primary }]}>Thêm App</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.appList}>
            {restrictedApps.map((app) => {
              const isCooldown =
                app.removalRequestedAt &&
                currentTime - app.removalRequestedAt < APP_REMOVAL_COOLDOWN_MS;

              return (
                <View key={app.id} style={[styles.appRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                  <View style={styles.appLeft}>
                    {app.isRestricted ? (
                      <Lock size={18} color={colors.danger} />
                    ) : (
                      <Unlock size={18} color={colors.textSubtle} />
                    )}
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.appName, { color: colors.text }]}>{app.name}</Text>
                        {app.isCustom && (
                          <View style={[styles.customBadge, { backgroundColor: colors.bgSubtle }]}>
                            <Text style={[styles.customBadgeText, { color: colors.textMuted }]}>Tùy chỉnh</Text>
                          </View>
                        )}
                      </View>
                      {isCooldown && (
                        <View style={styles.cooldownBadge}>
                          <Hourglass size={11} color="#D97706" />
                          <Text style={styles.cooldownText}>
                            Chờ gỡ: còn {formatCooldownRemaining(app.removalRequestedAt!)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.appRightActions}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        app.isRestricted ? styles.toggleButtonLocked : [styles.toggleButtonFree, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }],
                      ]}
                      onPress={() => handleToggleRestriction(app)}
                    >
                      <Text
                        style={[
                          styles.toggleButtonText,
                          app.isRestricted ? styles.toggleButtonTextLocked : { color: colors.textMuted },
                        ]}
                      >
                        {app.isRestricted ? 'ĐANG KHÓA' : 'CHƯA KHÓA'}
                      </Text>
                    </TouchableOpacity>

                    {app.isCustom && !app.isRestricted && (
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteApp(app)}
                      >
                        <Trash2 size={16} color={colors.textSubtle} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Section 2: Sàn giao dịch Thời gian (Coin Shop - 40 Coins = 30 Phút) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ShoppingCart size={18} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sàn Giao Dịch Thời Gian</Text>
          </View>

          {/* Rate Notice Banner */}
          <View style={[styles.rateBanner, { backgroundColor: colors.warningLight, borderColor: colors.warningBorder }]}>
            <Coins size={16} color={colors.warning} />
            <Text style={[styles.rateBannerText, { color: colors.warning }]}>
              Quy đổi chuẩn: <Text style={{ fontWeight: '900' }}>40 Coins = 30 phút</Text> giải trí
            </Text>
          </View>

          <Text style={[styles.pickerLabel, { color: colors.text }]}>Mở khóa ứng dụng:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.appSelectorScroll}
          >
            {restrictedApps
              .filter((a) => a.isRestricted)
              .map((app) => (
                <TouchableOpacity
                  key={app.id}
                  style={[
                    styles.appChip,
                    { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder },
                    selectedAppForPurchase === app.id && [styles.appChipActive, { backgroundColor: colors.primaryLight, borderColor: colors.primary }],
                  ]}
                  onPress={() => {
                    setSelectedAppForPurchase(app.id);
                    hapticService.light();
                  }}
                >
                  <Lock
                    size={13}
                    color={selectedAppForPurchase === app.id ? colors.primary : colors.textSubtle}
                  />
                  <Text
                    style={[
                      styles.appChipText,
                      { color: selectedAppForPurchase === app.id ? colors.primary : colors.text },
                    ]}
                  >
                    {app.name}
                  </Text>
                </TouchableOpacity>
              ))}
          </ScrollView>

          {purchaseFeedback && (
            <View style={[styles.feedbackBox, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}>
              <CheckCircle2 size={16} color={colors.primary} />
              <Text style={[styles.feedbackText, { color: colors.primary }]}>{purchaseFeedback}</Text>
            </View>
          )}

          {/* Các gói thời gian chuẩn 40c = 30p */}
          <View style={styles.packageGrid}>
            {TIME_PACKAGES.map((pkg) => {
              const canAfford = coins >= pkg.costCoins;
              return (
                <TouchableOpacity
                  key={pkg.id}
                  style={[
                    styles.pkgCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                    !canAfford && styles.pkgCardDisabled,
                  ]}
                  onPress={() => handleBuyPackage(pkg)}
                  disabled={!canAfford}
                  activeOpacity={0.8}
                >
                  <View style={styles.pkgTop}>
                    <Clock size={16} color={canAfford ? colors.primary : colors.textSubtle} />
                    <Text style={[styles.pkgDuration, { color: canAfford ? colors.text : colors.textSubtle }]}>
                      {pkg.label}
                    </Text>
                  </View>

                  <View style={styles.pkgPriceRow}>
                    <Coins size={16} color={canAfford ? colors.warning : colors.textSubtle} />
                    <Text
                      style={[
                        styles.pkgPriceText,
                        { color: canAfford ? colors.warning : colors.textSubtle },
                      ]}
                    >
                      {pkg.costCoins}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.buyBtnBadge,
                      { backgroundColor: canAfford ? colors.primaryLight : colors.bgSubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.buyBtnText,
                        { color: canAfford ? colors.primary : colors.textSubtle },
                      ]}
                    >
                      {canAfford ? 'ĐỔI NGAY' : 'THIẾU COINS'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom Duration Calculator */}
          <View style={[styles.customCalcBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Sliders size={16} color={colors.primary} />
              <Text style={[styles.customCalcTitle, { color: colors.text }]}>Đổi thời gian tùy chọn</Text>
            </View>
            <View style={styles.customCalcRow}>
              <TextInput
                style={[styles.customInput, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
                value={customMinutes}
                onChangeText={setCustomMinutes}
                keyboardType="numeric"
                placeholder="Số phút"
                placeholderTextColor={colors.textSubtle}
              />
              <View style={styles.customCalcCostBox}>
                <Coins size={15} color={colors.warning} />
                <Text style={[styles.customCalcCostText, { color: colors.warning }]}>
                  {calculateCoinsForMinutes(parseInt(customMinutes) || 0)} Coins
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.customBuyBtn,
                  { backgroundColor: coins >= calculateCoinsForMinutes(parseInt(customMinutes) || 0) ? colors.primary : colors.bgSubtle },
                ]}
                disabled={coins < calculateCoinsForMinutes(parseInt(customMinutes) || 0)}
                onPress={handleCustomBuy}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>Đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal Thêm App Mới */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Thêm Ứng Dụng Cần Khóa</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={20} color={colors.textSubtle} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              Ứng dụng sẽ tự động rơi vào cơ chế Hard-Lock và cần Coins để mở.
            </Text>

            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, color: colors.text, borderColor: colors.cardBorder }]}
              placeholder="Tên ứng dụng (vd: Shopee, Tinder...)"
              placeholderTextColor={colors.textSubtle}
              value={customAppName}
              onChangeText={setCustomAppName}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancel, { backgroundColor: colors.bgSubtle }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: colors.primary }]}
                onPress={handleAddCustomApp}
              >
                <Text style={styles.modalConfirmText}>Khóa Ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  ruleNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  ruleNoticeText: {
    color: '#991B1B',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  rateBannerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeUnlockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  activeUnlockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeUnlockName: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeUnlockCountdown: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  relockBtn: {
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
  relockBtnText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  addAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  addAppBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appList: {
    gap: 8,
  },
  appRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  appLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
  },
  customBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  cooldownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cooldownText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  appRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleButtonLocked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  toggleButtonFree: {
    borderWidth: 1,
  },
  toggleButtonText: {
    fontSize: 10,
    fontWeight: '800',
  },
  toggleButtonTextLocked: {
    color: '#DC2626',
  },
  deleteBtn: {
    padding: 6,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  appSelectorScroll: {
    marginBottom: 14,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  appChipActive: {
    borderWidth: 1.5,
  },
  appChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  packageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  pkgCard: {
    width: '48%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  pkgCardDisabled: {
    opacity: 0.5,
  },
  pkgTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pkgDuration: {
    fontSize: 14,
    fontWeight: '800',
  },
  pkgPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pkgPriceText: {
    fontSize: 22,
    fontWeight: '900',
  },
  buyBtnBadge: {
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  buyBtnText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  customCalcBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  customCalcTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  customCalcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  customInput: {
    width: 80,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  customCalcCostBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  customCalcCostText: {
    fontSize: 14,
    fontWeight: '800',
  },
  customBuyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
