import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Brain,
  AlertTriangle,
  Sparkles,
  Smartphone,
  Plus,
  RotateCcw,
  ShieldCheck,
  ChevronRight,
  Flame,
  Zap,
  Heart,
} from 'lucide-react-native';
import { useAppStore, MAX_DAILY_SOCIAL_MEDIA_MINS } from '../store/useAppStore';
import { BrainAvatar } from './BrainAvatar';
import { hapticService } from '../utils/haptics';
import { lightTheme, darkTheme } from '../theme/colors';

export const BrainHealthWidget: React.FC = () => {
  const router = useRouter();
  const {
    getBrainStatus,
    addSocialMediaMinutes,
    resetBrainSimulation,
    themeMode,
  } = useAppStore();

  const [simModalVisible, setSimModalVisible] = useState(false);

  const colors = themeMode === 'light' ? lightTheme : darkTheme;
  const brainStatus = getBrainStatus();

  const formatHoursMins = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m} phút`;
    return `${h}h ${m}m`;
  };

  const usageRatio = Math.min(1, brainStatus.socialMediaMinutes / MAX_DAILY_SOCIAL_MEDIA_MINS);
  const remainingMinutes = Math.max(0, MAX_DAILY_SOCIAL_MEDIA_MINS - brainStatus.socialMediaMinutes);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Header bar (Clean, no corner badge) */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconCircle, { backgroundColor: brainStatus.bgColor }]}>
            <Brain size={18} color={brainStatus.color} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>TÌNH TRẠNG NÃO BỘ</Text>
            <Text style={[styles.subtitle, { color: colors.textSubtle }]}>
              Liên kết thời gian dùng MXH (Max 2h)
            </Text>
          </View>
        </View>
      </View>

      {/* Main Illustration Area */}
      <View style={styles.brainCenterContainer}>
        <BrainAvatar
          stage={brainStatus.stage}
          score={brainStatus.score}
          size={160}
        />

        {/* Status Title & Description */}
        <View style={styles.statusDescriptionBox}>
          <Text style={[styles.stageTitle, { color: brainStatus.color }]}>
            {brainStatus.title}
          </Text>
          <Text style={[styles.stageSubtitle, { color: colors.textMuted }]}>
            {brainStatus.subtitle}
          </Text>
        </View>
      </View>

      {/* THANH SINH LỰC TRÍ NÃO (DEDICATED RED HP BAR) */}
      <View style={[styles.hpSection, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
        <View style={styles.hpHeaderRow}>
          <View style={styles.hpLeftGroup}>
            <Heart size={16} color="#EF4444" fill="#EF4444" />
            <Text style={[styles.hpLabel, { color: colors.text }]}>
              SINH LỰC TRÍ NÃO
            </Text>
          </View>
          <View style={styles.hpValueGroup}>
            <Text style={[styles.hpScoreNumber, { color: '#EF4444' }]}>
              {brainStatus.score}
            </Text>
            <Text style={[styles.hpMaxNumber, { color: colors.textSubtle }]}> / 100 HP</Text>
          </View>
        </View>

        {/* HP Bar Track & Fill - Red Color */}
        <View style={[styles.hpTrack, { backgroundColor: colors.cardBorder }]}>
          <View
            style={[
              styles.hpFill,
              {
                width: `${brainStatus.score}%`,
                backgroundColor: '#EF4444',
              },
            ]}
          />
        </View>

        {/* Restore Prompt Info */}
        <View style={styles.hpPromptRow}>
          <Sparkles size={13} color="#EF4444" />
          <Text style={[styles.hpPromptText, { color: colors.textSubtle }]}>
            1 phút xem MXH = -1 HP · Làm nhiệm vụ nhận 10 Coins = +5 HP · Reset 100 HP lúc 00:00
          </Text>
        </View>
      </View>

      {/* Screen Time Progress Bar */}
      <View style={[styles.usageSection, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}>
        <View style={styles.usageRowTop}>
          <View style={styles.usageLeft}>
            <Smartphone size={15} color={colors.textMuted} />
            <Text style={[styles.usageLabel, { color: colors.text }]}>
              Đã dùng MXH hôm nay:
            </Text>
          </View>
          <Text style={[styles.usageValue, { color: brainStatus.color }]}>
            {formatHoursMins(brainStatus.socialMediaMinutes)} / 2 giờ
          </Text>
        </View>

        {/* Progress Bar with Gradient effect */}
        <View style={[styles.barBackground, { backgroundColor: colors.cardBorder }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.round(usageRatio * 100)}%`,
                backgroundColor: brainStatus.color,
              },
            ]}
          />
        </View>

        <View style={styles.usageRowBottom}>
          <Text style={[styles.barCaption, { color: colors.textSubtle }]}>
            {remainingMinutes > 0
              ? `Còn ${formatHoursMins(remainingMinutes)} trước khi não bị thối rữa hoàn toàn`
              : '⚠️ ĐÃ VƯỢT QUÁ GIỚI HẠN 2H! NÃO ĐANG BỊ HỦY HOẠI NẶNG'}
          </Text>
        </View>
      </View>

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        {/* Simulate Usage Button */}
        <TouchableOpacity
          style={[styles.simBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
          onPress={() => {
            setSimModalVisible(true);
            hapticService.light();
          }}
          activeOpacity={0.7}
        >
          <Smartphone size={15} color={colors.textMuted} />
          <Text style={[styles.simBtnText, { color: colors.text }]}>
            Mô phỏng lướt MXH
          </Text>
        </TouchableOpacity>

        {/* Revive Brain CTA Button */}
        <TouchableOpacity
          style={styles.reviveBtn}
          onPress={() => {
            router.push('/(tabs)/quests');
            hapticService.medium();
          }}
          activeOpacity={0.8}
        >
          <Zap size={16} color="#FFFFFF" fill="#FFFFFF" />
          <Text style={styles.reviveBtnText}>Cứu Não (Làm Quest)</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Simulation Modal */}
      <Modal
        visible={simModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSimModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.modalHeader}>
              <Smartphone size={20} color={colors.primary} />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Mô Phỏng Dùng Điện Thoại
              </Text>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textMuted }]}>
              Thử nghiệm tác động của mạng xã hội lên tế bào não. Khi thời gian dùng chạm 2 tiếng (120 phút), bộ não sẽ héo thối rữa!
            </Text>

            <View style={styles.simButtonsCol}>
              <TouchableOpacity
                style={[styles.simActionBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => {
                  addSocialMediaMinutes(15);
                  hapticService.medium();
                }}
              >
                <Plus size={16} color="#0284C7" />
                <Text style={[styles.simActionText, { color: colors.text }]}>
                  Lướt TikTok (+15 phút · -15 HP)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => {
                  addSocialMediaMinutes(30);
                  hapticService.medium();
                }}
              >
                <Plus size={16} color="#D97706" />
                <Text style={[styles.simActionText, { color: colors.text }]}>
                  Lướt Facebook/Reels (+30 phút · -30 HP)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionBtn, { backgroundColor: colors.bgSubtle, borderColor: colors.cardBorder }]}
                onPress={() => {
                  addSocialMediaMinutes(60);
                  hapticService.warning();
                }}
              >
                <Plus size={16} color="#DC2626" />
                <Text style={[styles.simActionText, { color: colors.text }]}>
                  Xem YouTube / Shorts (+60 phút · -60 HP)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.simActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primaryBorder }]}
                onPress={() => {
                  resetBrainSimulation();
                  hapticService.success();
                }}
              >
                <RotateCcw size={16} color={colors.primary} />
                <Text style={[styles.simActionText, { color: colors.primary }]}>
                  Reset ngày mới (Não 100 HP Siêu Khỏe)
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setSimModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Xong</Text>
            </TouchableOpacity>
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
    marginBottom: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  hpSection: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
  },
  hpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hpLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hpLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  hpValueGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hpScoreNumber: {
    fontSize: 16,
    fontWeight: '900',
  },
  hpMaxNumber: {
    fontSize: 12,
    fontWeight: '700',
  },
  hpTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  hpFill: {
    height: '100%',
    borderRadius: 5,
  },
  hpPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hpPromptText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
    lineHeight: 15,
  },
  brainCenterContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusDescriptionBox: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  stageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  usageSection: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  usageRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usageLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  usageValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageRowBottom: {
    marginTop: 6,
  },
  barCaption: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  simBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  simBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reviveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#059669',
  },
  reviveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  simButtonsCol: {
    gap: 10,
  },
  simActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  simActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeModalBtn: {
    marginTop: 18,
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

