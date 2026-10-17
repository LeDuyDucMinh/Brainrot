import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { hapticService } from '../utils/haptics';

// In-memory fallback if native storage is unavailable (e.g. initial render / Web / SSR / null native module)
const memoryStorage: Record<string, string> = {};

const safeStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(name);
      }
      return await AsyncStorage.getItem(name);
    } catch {
      return memoryStorage[name] ?? null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
        return;
      }
      await AsyncStorage.setItem(name, value);
    } catch {
      memoryStorage[name] = value;
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
        return;
      }
      await AsyncStorage.removeItem(name);
    } catch {
      delete memoryStorage[name];
    }
  },
};

// ============================================================
// TypeScript Interfaces
// ============================================================

export type QuestType = 'pushup' | 'deepwork' | 'gym' | 'reading' | 'meditation' | 'cardio';
export type AppLockStatus = 'LOCKED' | 'UNLOCKED' | 'COOLDOWN';
export type BrainStage = 'super' | 'healthy' | 'foggy' | 'decaying' | 'withered' | 'rotted';

export interface RestrictedApp {
  id: string;
  name: string;
  icon: string; // lucide icon name
  isRestricted: boolean;
  unlockedUntil: number | null; // Unix timestamp (ms) khi hết hạn unlock
  removalRequestedAt: number | null; // Unix timestamp khi yêu cầu gỡ khỏi danh sách
  isCustom?: boolean;
  color?: string;
  bundleId?: string;
  category?: string;
}

export interface QuestRecord {
  id: string;
  type: QuestType;
  completedAt: number; // Unix timestamp
  coinsEarned: number;
  details: string; // "10 push-ups", "25 min deep work", etc.
}

export interface ActiveUnlock {
  appId: string;
  appName: string;
  startedAt: number;
  durationMinutes: number;
  expiresAt: number; // Unix timestamp
}

export interface TimePackage {
  id: string;
  label: string;
  durationMinutes: number;
  costCoins: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  questsCompleted: number;
  coinsEarned: number;
  totalUnlockMinutes: number;
  pushupCount: number;
  deepWorkMinutes: number;
  gymSessions: number;
  readingMinutes: number;
  meditationMinutes: number;
  cardioMinutes: number;
}

export interface AppSettings {
  hapticsEnabled: boolean;
  deepWorkToleranceSec: number;
  allowScreenOffInDeepWork: boolean;
  gymTargetMinutes: number;
  dailyGoals: {
    pushups: number;
    deepWorkMins: number;
    gymSessions: number;
    readingMins: number;
    meditationMins: number;
  };
}

export interface GymExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  isCustom?: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rewardCoins: number;
  category: 'pushup' | 'deepwork' | 'gym' | 'streak' | 'coins' | 'reading';
  targetValue: number;
}

export interface BrainStatusInfo {
  score: number;
  stage: BrainStage;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  decayPercent: number;
  socialMediaMinutes: number;
  maxSocialMediaMinutes: number;
}

// ============================================================
// Constants
// ============================================================

export const MAX_DAILY_SOCIAL_MEDIA_MINS = 120; // 2 giờ tối đa MXH

export const COIN_RATES = {
  PUSHUP_PER_10: 5,        // 10 hít đất = 5 coins
  DEEPWORK_25MIN: 20,      // 25 phút = 20 coins
  DEEPWORK_45MIN: 40,      // 45 phút = 40 coins
  DEEPWORK_60MIN: 55,      // 60 phút = 55 coins
  GYM_SESSION: 50,         // 1 buổi tập gym = 50 coins
  READING_15MIN: 15,       // 15 phút đọc sách = 15 coins
  READING_30MIN: 35,       // 30 phút đọc sách = 35 coins
  MEDITATION_10MIN: 15,    // 10 phút thiền = 15 coins
  CARDIO_20MIN: 25,        // 20 phút chạy bộ/cardio = 25 coins
} as const;

export const APP_REMOVAL_COST = 200; // Coins để gỡ app khỏi danh sách
export const APP_REMOVAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 giờ
export const DEFAULT_DEEPWORK_TOLERANCE_MS = 5000;

// Tỷ lệ chuẩn: 40 Coins = 30 Phút (1.33 Coins / Phút)
export const TIME_PACKAGES: TimePackage[] = [
  { id: 'pkg-15', label: '15 phút', durationMinutes: 15, costCoins: 20 },
  { id: 'pkg-30', label: '30 phút', durationMinutes: 30, costCoins: 40 },
  { id: 'pkg-45', label: '45 phút', durationMinutes: 45, costCoins: 60 },
  { id: 'pkg-60', label: '1 giờ', durationMinutes: 60, costCoins: 80 },
  { id: 'pkg-90', label: '1.5 giờ', durationMinutes: 90, costCoins: 120 },
  { id: 'pkg-120', label: '2 giờ', durationMinutes: 120, costCoins: 160 },
  { id: 'pkg-180', label: '3 giờ', durationMinutes: 180, costCoins: 240 },
  { id: 'pkg-240', label: '4 giờ', durationMinutes: 240, costCoins: 320 },
];

export const calculateCoinsForMinutes = (minutes: number): number => {
  return Math.max(10, Math.round(minutes * (40 / 30)));
};

export const calculateMinutesForCoins = (coins: number): number => {
  if (coins <= 0) return 0;
  // Tỷ lệ chuẩn: 40 Coins = 30 Phút (1 Coin = 0.75 Phút)
  return Math.max(1, Math.floor(coins * (30 / 40)));
};

export const DEFAULT_RESTRICTED_APPS: RestrictedApp[] = [
  { id: 'tiktok', name: 'TikTok', icon: 'clapperboard', isRestricted: true, unlockedUntil: null, removalRequestedAt: null, color: '#FE2C55', bundleId: 'com.zhiliaoapp.musically', category: 'social' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', isRestricted: true, unlockedUntil: null, removalRequestedAt: null, color: '#1877F2', bundleId: 'com.facebook.Facebook', category: 'social' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', isRestricted: true, unlockedUntil: null, removalRequestedAt: null, color: '#E1306C', bundleId: 'com.burbn.instagram', category: 'social' },
  { id: 'youtube', name: 'YouTube', icon: 'youtube', isRestricted: true, unlockedUntil: null, removalRequestedAt: null, color: '#FF0000', bundleId: 'com.google.ios.youtube', category: 'social' },
  { id: 'threads', name: 'Threads', icon: 'at-sign', isRestricted: true, unlockedUntil: null, removalRequestedAt: null, color: '#10B981', bundleId: 'com.burbn.threads', category: 'social' },
];

export const DEFAULT_GYM_EXERCISES: GymExercise[] = [
  { id: 'bench', name: 'Bench Press', sets: 3, reps: '8-12' },
  { id: 'squat', name: 'Squat', sets: 3, reps: '8-10' },
  { id: 'deadlift', name: 'Deadlift', sets: 3, reps: '5-8' },
  { id: 'pullup', name: 'Pull-ups', sets: 3, reps: '8-12' },
  { id: 'ohp', name: 'Overhead Press', sets: 3, reps: '8-10' },
  { id: 'row', name: 'Barbell Row', sets: 3, reps: '8-12' },
  { id: 'curl', name: 'Bicep Curls', sets: 3, reps: '10-15' },
  { id: 'plank', name: 'Plank', sets: 3, reps: '30-60s' },
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
  { id: 'first_quest', title: 'Cú Đấm Đầu Tiên', description: 'Hoàn thành nhiệm vụ đầu tiên', icon: 'zap', rewardCoins: 10, category: 'coins', targetValue: 1 },
  { id: 'pushup_50', title: 'Tay Đấm Thép', description: 'Thực hiện 50 lần hít đất tổng cộng', icon: 'dumbbell', rewardCoins: 25, category: 'pushup', targetValue: 50 },
  { id: 'pushup_200', title: 'Bậc Thầy Chống Đẩy', description: 'Thực hiện 200 lần hít đất tổng cộng', icon: 'flame', rewardCoins: 60, category: 'pushup', targetValue: 200 },
  { id: 'deepwork_60', title: 'Dòng Chảy Tập Trung', description: 'Tích lũy 60 phút Deep Work', icon: 'brain', rewardCoins: 30, category: 'deepwork', targetValue: 60 },
  { id: 'deepwork_300', title: 'Tâm Bất Biến', description: 'Tích lũy 300 phút Deep Work', icon: 'sparkles', rewardCoins: 100, category: 'deepwork', targetValue: 300 },
  { id: 'gym_3', title: 'Chiến Thần Phòng Gym', description: 'Hoàn thành 3 buổi tập Gym', icon: 'trophy', rewardCoins: 50, category: 'gym', targetValue: 3 },
  { id: 'reading_60', title: 'Mọt Sách Trí Tuệ', description: 'Đọc sách tích lũy 60 phút', icon: 'book-open', rewardCoins: 35, category: 'reading', targetValue: 60 },
  { id: 'streak_3', title: 'Ngọn Lửa Kiên Trì', description: 'Đạt chuỗi 3 ngày hoạt động liên tục', icon: 'flame', rewardCoins: 30, category: 'streak', targetValue: 3 },
  { id: 'streak_7', title: 'Kỷ Luật Thép', description: 'Đạt chuỗi 7 ngày hoạt động liên tục', icon: 'award', rewardCoins: 80, category: 'streak', targetValue: 7 },
  { id: 'coins_100', title: 'Kho Báu Thời Gian', description: 'Tích lũy 100 Coins trong ví', icon: 'coins', rewardCoins: 20, category: 'coins', targetValue: 100 },
];

export const LEVEL_RANKS = [
  { level: 1, title: 'Tân Binh Kỷ Luật', minCoins: 0 },
  { level: 2, title: 'Đệ Tử Tập Trung', minCoins: 50 },
  { level: 3, title: 'Chiến Binh Ý Chí', minCoins: 150 },
  { level: 4, title: 'Bậc Thầy Dopamine', minCoins: 300 },
  { level: 5, title: 'Khắc Tinh Mạng Xã Hội', minCoins: 500 },
  { level: 6, title: 'Titan Kỷ Luật Sắt', minCoins: 800 },
  { level: 7, title: 'Đại Tông Sư Tự Chủ', minCoins: 1200 },
  { level: 8, title: 'Huyền Thoại Vô Song', minCoins: 2000 },
];

// ============================================================
// Store Interface
// ============================================================

interface AppState {
  // --- Theme Mode ---
  themeMode: 'light' | 'dark';
  toggleTheme: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;

  // --- Core Data ---
  coins: number;
  totalLifetimeCoins: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  restrictedApps: RestrictedApp[];
  questHistory: QuestRecord[];
  dailyStats: DailyStats;
  historyByDate: Record<string, DailyStats>;
  unlockedAchievements: string[];
  claimedAchievements: string[];
  settings: AppSettings;
  gymExercises: GymExercise[];

  // --- Brain Health & Social Media Tracking ---
  socialMediaUsedMinutes: number;
  brainHP: number;
  brainHealthBonus: number;
  lastUnlockTick: number | null;
  screenTimePermissionGranted: boolean;
  setScreenTimePermission: (granted: boolean) => void;
  addSocialMediaMinutes: (minutes: number) => void;
  setSocialMediaMinutes: (minutes: number) => void;
  restoreBrainHealth: (percent: number) => void;
  resetBrainSimulation: () => void;
  getBrainStatus: () => BrainStatusInfo;

  // --- Actions: Coins ---
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;

  // --- Actions: Quests ---
  completeQuest: (type: QuestType, coinsEarned: number, details: string) => void;

  // --- Actions: App Management ---
  toggleAppRestriction: (appId: string) => boolean;
  addCustomApp: (
    app: { name: string; id?: string; icon?: string; color?: string; bundleId?: string; category?: string } | string,
    icon?: string
  ) => boolean;
  deleteRestrictedApp: (appId: string) => boolean;
  cancelRemovalRequest: (appId: string) => void;
  purchaseUnlock: (appId: string, pkg: TimePackage) => boolean;
  lockAppImmediately: (appId: string) => void;
  getAppLockStatus: (appId: string) => AppLockStatus;
  getActiveUnlocks: () => ActiveUnlock[];
  checkAndExpireUnlocks: () => void;
  requestAppRemoval: (appId: string) => boolean;

  // --- Actions: Gym Exercises ---
  addCustomExercise: (name: string, sets: number, reps: string) => void;
  deleteCustomExercise: (id: string) => void;

  // --- Actions: Stats & Streak ---
  getTodayStats: () => DailyStats;
  resetDailyStatsIfNeeded: () => void;
  getUserRank: () => { level: number; title: string; progress: number; nextLevelCoins: number; currentCoins: number };
  checkAchievements: () => void;
  claimAchievement: (achievementId: string) => boolean;

  // --- Actions: Settings ---
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetAllData: () => void;

  // --- Actions: Utility ---
  getRemainingTime: (appId: string) => number;
}

// ============================================================
// Helper Functions
// ============================================================

export const getTodayDateString = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getYesterdayDateString = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const createEmptyDailyStats = (date = getTodayDateString()): DailyStats => ({
  date,
  questsCompleted: 0,
  coinsEarned: 0,
  totalUnlockMinutes: 0,
  pushupCount: 0,
  deepWorkMinutes: 0,
  gymSessions: 0,
  readingMinutes: 0,
  meditationMinutes: 0,
  cardioMinutes: 0,
});

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// ============================================================
// Zustand Store with Persistence
// ============================================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // --- Theme (Sáng màu mặc định) ---
      themeMode: 'light',
      toggleTheme: () => {
        set((s) => ({ themeMode: s.themeMode === 'light' ? 'dark' : 'light' }));
        hapticService.light();
      },
      setThemeMode: (mode: 'light' | 'dark') => {
        set({ themeMode: mode });
        hapticService.light();
      },

      // --- Initial State ---
      coins: 40, // Tặng khởi điểm 40 coins để trải nghiệm
      totalLifetimeCoins: 40,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: getTodayDateString(),
      restrictedApps: DEFAULT_RESTRICTED_APPS,
      questHistory: [],
      dailyStats: createEmptyDailyStats(),
      historyByDate: {},
      unlockedAchievements: [],
      claimedAchievements: [],
      gymExercises: DEFAULT_GYM_EXERCISES,

      // --- Brain Health & Social Media (1 phút MXH = -1 HP, 10 Coins = +5 HP) ---
      socialMediaUsedMinutes: 0, // Bắt đầu ngày mới với 0 phút MXH
      brainHP: 100, // Khởi điểm 100 HP Sinh Lực Não trọn vẹn
      brainHealthBonus: 0,
      lastUnlockTick: null,
      screenTimePermissionGranted: false,

      setScreenTimePermission: (granted: boolean) => {
        set({ screenTimePermissionGranted: granted });
        hapticService.light();
      },

      addSocialMediaMinutes: (minutes: number) => {
        set((s) => {
          const nextMins = Math.max(0, s.socialMediaUsedMinutes + minutes);
          // 1 phút lướt MXH trực tiếp trừ 1 HP, KHÔNG TRỪ XUỐNG ÂM (tối thiểu là 0 HP)
          const currentHP = s.brainHP !== undefined ? s.brainHP : Math.max(0, 100 - s.socialMediaUsedMinutes);
          const nextHP = Math.max(0, currentHP - minutes);
          return {
            socialMediaUsedMinutes: nextMins,
            brainHP: nextHP,
          };
        });
        hapticService.light();
      },

      setSocialMediaMinutes: (minutes: number) => {
        set((s) => {
          const diff = minutes - s.socialMediaUsedMinutes;
          const currentHP = s.brainHP !== undefined ? s.brainHP : Math.max(0, 100 - s.socialMediaUsedMinutes);
          const nextHP = Math.max(0, Math.min(100, currentHP - diff));
          return {
            socialMediaUsedMinutes: Math.max(0, minutes),
            brainHP: nextHP,
          };
        });
        hapticService.light();
      },

      restoreBrainHealth: (hpAmount: number) => {
        set((s) => {
          const currentHP = s.brainHP !== undefined ? s.brainHP : Math.max(0, 100 - s.socialMediaUsedMinutes);
          return {
            brainHP: Math.min(100, currentHP + hpAmount),
          };
        });
        hapticService.success();
      },

      resetBrainSimulation: () => {
        set({
          socialMediaUsedMinutes: 0,
          brainHP: 100,
          brainHealthBonus: 0,
        });
        hapticService.medium();
      },

      getBrainStatus: (): BrainStatusInfo => {
        const state = get();
        const socialMins = state.socialMediaUsedMinutes;
        const maxMins = MAX_DAILY_SOCIAL_MEDIA_MINS; // 120 phút

        // Điểm HP Sinh Lực Não:
        // Cứ 1 phút lướt MXH trừ 1 HP, KHÔNG TRỪ XUỐNG ÂM (chạm 0 HP là giữ ở 0)
        // Khi nhận Coins từ Quest: Cứ 10 Coins = +5 HP phục hồi lại (tối đa 100 HP)
        let currentHP = state.brainHP;
        if (currentHP === undefined) {
          currentHP = Math.max(0, 100 - socialMins);
        }

        const calculatedScore = Math.max(0, Math.min(100, currentHP));
        const decayPercent = 100 - calculatedScore;

        let stage: BrainStage = 'super';
        let title = 'Siêu Trí Não (Flow State)';
        let subtitle = 'Tâm trí hoàn hảo! 100% miễn nhiễm với dopamine rác.';
        let color = '#10B981';
        let bgColor = '#ECFDF5';

        // 6 CẤP ĐỘ THỐI RỮA THEO ĐÚNG ĐIỂM SINH LỰC HP VÀ THỜI GIAN LƯỚT MXH
        if (calculatedScore <= 15 || socialMins >= 120) {
          // Cấp 6: Thối rữa hoàn toàn (Zombie Brain)
          stage = 'rotted';
          title = 'NÃO THỐI RỮA NẶNG NỀ (CRITICAL)';
          subtitle = `Đã lướt ${socialMins}p MXH! Sinh lực cạn kiệt (${calculatedScore} HP), tế bào não bị tàn phá nặng nề bởi dopamine rác.`;
          color = '#DC2626';
          bgColor = '#FEF2F2';
        } else if (calculatedScore <= 35 || socialMins >= 90) {
          // Cấp 5: Thối rữa màu xanh lục sẫm
          stage = 'withered';
          title = 'Não Thối Rữa Xanh Lục Sẫm';
          subtitle = `Đã lướt ${socialMins}p MXH! Sinh lực còn ${calculatedScore} HP, tế bào não đang thối rữa nghiêm trọng sang màu xanh lục sẫm.`;
          color = '#4D7C0F';
          bgColor = '#F7FEE7';
        } else if (calculatedScore <= 55 || socialMins >= 60) {
          // Cấp 4: Bắt đầu thối rữa sang màu xanh lục
          stage = 'decaying';
          title = 'Não Bắt Đầu Thối Rữa (Xanh Lục)';
          subtitle = `Đã dùng ${socialMins}p MXH (1h)! Sinh lực ${calculatedScore} HP, vỏ não đang úa màu xanh lục, mất khả năng tập trung sâu.`;
          color = '#65A30D';
          bgColor = '#F7FEE7';
        } else if (calculatedScore <= 75 || socialMins >= 30) {
          // Cấp 3: Sương mù não
          stage = 'foggy';
          title = 'Sương Mù Não (Brain Fog)';
          subtitle = `Đã lướt ${socialMins}p MXH! Sinh lực ${calculatedScore} HP, dopamine nhân tạo bắt đầu làm mệt mỏi các khớp thần kinh.`;
          color = '#D97706';
          bgColor = '#FFFBEB';
        } else if (calculatedScore < 95 || socialMins > 0) {
          // Cấp 2: Bắt đầu bị nhiễm độc nhẹ
          stage = 'healthy';
          title = 'Não Bị Nhiễm Độc Nhẹ';
          subtitle = `Đã dùng ${socialMins}p MXH (Sinh lực: ${calculatedScore} HP). Hãy hoàn thành nhiệm vụ để hồi phục đầy đủ 100 HP!`;
          color = '#0284C7';
          bgColor = '#F0F9FF';
        } else {
          // Cấp 1: Hoàn hảo 100%
          stage = 'super';
          title = 'Siêu Trí Não (Flow State)';
          subtitle = 'Tuyệt vời! Sinh lực 100 HP, không một phút dopamine rác, tâm trí cực kỳ sáng suốt và minh mẫn.';
          color = '#10B981';
          bgColor = '#ECFDF5';
        }

        return {
          score: calculatedScore,
          stage,
          title,
          subtitle,
          color,
          bgColor,
          decayPercent,
          socialMediaMinutes: socialMins,
          maxSocialMediaMinutes: maxMins,
        };
      },

      settings: {
        hapticsEnabled: true,
        deepWorkToleranceSec: 5,
        allowScreenOffInDeepWork: true, // Cho phép tắt màn hình khi deep work!
        gymTargetMinutes: 45,
        dailyGoals: {
          pushups: 30,
          deepWorkMins: 45,
          gymSessions: 1,
          readingMins: 30,
          meditationMins: 10,
        },
      },

      // --- Coins ---
      addCoins: (amount: number) => {
        set((state) => {
          const newCoins = state.coins + amount;
          const newLifetime = state.totalLifetimeCoins + amount;
          return {
            coins: newCoins,
            totalLifetimeCoins: newLifetime,
            dailyStats: {
              ...state.dailyStats,
              coinsEarned: state.dailyStats.coinsEarned + amount,
            },
          };
        });
        get().checkAchievements();
      },

      spendCoins: (amount: number): boolean => {
        const currentCoins = get().coins;
        if (currentCoins < amount) return false;
        set((state) => ({ coins: state.coins - amount }));
        return true;
      },

      // --- Quests ---
      completeQuest: (type: QuestType, coinsEarned: number, details: string) => {
        const today = getTodayDateString();
        const yesterday = getYesterdayDateString();
        const state = get();

        // Cập nhật Streak
        let newStreak = state.currentStreak;
        if (state.lastActiveDate === today) {
          // Hôm nay đã làm rồi, giữ nguyên streak
        } else if (state.lastActiveDate === yesterday) {
          // Ngày hôm qua có làm -> tăng streak
          newStreak = state.currentStreak + 1;
        } else {
          // Bắt đầu lại chuỗi
          newStreak = 1;
        }

        const newLongestStreak = Math.max(state.longestStreak, newStreak);

        const record: QuestRecord = {
          id: generateId(),
          type,
          completedAt: Date.now(),
          coinsEarned,
          details,
        };

        const updatedStats: DailyStats = { ...state.dailyStats, date: today };
        updatedStats.questsCompleted += 1;
        updatedStats.coinsEarned += coinsEarned;

        if (type === 'pushup') {
          const count = parseInt(details) || 0;
          updatedStats.pushupCount += count;
        } else if (type === 'deepwork') {
          const mins = parseInt(details) || 0;
          updatedStats.deepWorkMinutes += mins;
        } else if (type === 'gym') {
          updatedStats.gymSessions += 1;
        } else if (type === 'reading') {
          const mins = parseInt(details) || 20;
          updatedStats.readingMinutes += mins;
        } else if (type === 'meditation') {
          const mins = parseInt(details) || 10;
          updatedStats.meditationMinutes += mins;
        } else if (type === 'cardio') {
          const mins = parseInt(details) || 20;
          updatedStats.cardioMinutes += mins;
        }

        // Cơ chế: Nhận 10 Coins = +5 HP phục hồi sinh lực não
        const healHP = Math.max(1, Math.round((coinsEarned / 10) * 5));
        const currentHP = state.brainHP !== undefined ? state.brainHP : Math.max(0, 100 - state.socialMediaUsedMinutes);

        const newHistoryByDate = {
          ...state.historyByDate,
          [today]: updatedStats,
        };

        set({
          coins: state.coins + coinsEarned,
          totalLifetimeCoins: state.totalLifetimeCoins + coinsEarned,
          currentStreak: newStreak,
          longestStreak: newLongestStreak,
          lastActiveDate: today,
          questHistory: [record, ...state.questHistory].slice(0, 100),
          dailyStats: updatedStats,
          historyByDate: newHistoryByDate,
          brainHP: Math.min(100, currentHP + healHP),
          brainHealthBonus: Math.min(100, state.brainHealthBonus + healHP),
        });

        // Haptic feedback
        hapticService.success();

        // Kiểm tra mở khóa achievement
        get().checkAchievements();
      },

      // --- App Management ---
      toggleAppRestriction: (appId: string): boolean => {
        const state = get();
        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app) return false;

        if (app.isRestricted) {
          // Muốn gỡ restriction -> phải trả phí hoặc đợi cooldown
          if (app.removalRequestedAt) {
            const elapsed = Date.now() - app.removalRequestedAt;
            if (elapsed >= APP_REMOVAL_COOLDOWN_MS) {
              set((s) => ({
                restrictedApps: s.restrictedApps.map((a) =>
                  a.id === appId
                    ? { ...a, isRestricted: false, unlockedUntil: null, removalRequestedAt: null }
                    : a
                ),
              }));
              hapticService.medium();
              return true;
            }
            return false;
          }
          if (state.coins >= APP_REMOVAL_COST) {
            set((s) => ({
              coins: s.coins - APP_REMOVAL_COST,
              restrictedApps: s.restrictedApps.map((a) =>
                a.id === appId
                  ? { ...a, isRestricted: false, unlockedUntil: null, removalRequestedAt: null }
                  : a
              ),
            }));
            hapticService.medium();
            return true;
          }
          return false;
        } else {
          // Khóa app: miễn phí
          set((s) => ({
            restrictedApps: s.restrictedApps.map((a) =>
              a.id === appId
                ? { ...a, isRestricted: true, unlockedUntil: null, removalRequestedAt: null }
                : a
            ),
          }));
          hapticService.medium();
          return true;
        }
      },

      addCustomApp: (
        appData: { name: string; id?: string; icon?: string; color?: string; bundleId?: string; category?: string } | string,
        fallbackIcon = 'smartphone'
      ): boolean => {
        let name = '';
        let icon = fallbackIcon;
        let id = `custom-${Date.now()}`;
        let color: string | undefined = undefined;
        let bundleId: string | undefined = undefined;
        let category: string | undefined = undefined;

        if (typeof appData === 'string') {
          name = appData.trim();
        } else {
          name = appData.name.trim();
          if (appData.icon) icon = appData.icon;
          if (appData.id) id = appData.id;
          if (appData.color) color = appData.color;
          if (appData.bundleId) bundleId = appData.bundleId;
          if (appData.category) category = appData.category;
        }

        if (!name) return false;

        const state = get();
        // Kiểm tra xem app đã có trong danh sách chưa (tránh trùng lặp hoa/thường hoặc sai chính tả lặp lại)
        const existingApp = state.restrictedApps.find(
          (a) => a.id === id || a.name.toLowerCase() === name.toLowerCase()
        );

        if (existingApp) {
          // Nếu đã tồn tại nhưng đang mở khóa -> bật lại chế độ khóa
          set((s) => ({
            restrictedApps: s.restrictedApps.map((a) =>
              a.id === existingApp.id
                ? { ...a, isRestricted: true, unlockedUntil: null, removalRequestedAt: null }
                : a
            ),
          }));
          hapticService.success();
          return true;
        }

        const newApp: RestrictedApp = {
          id,
          name,
          icon,
          isRestricted: true,
          unlockedUntil: null,
          removalRequestedAt: null,
          isCustom: true,
          color,
          bundleId,
          category,
        };

        set((s) => ({
          restrictedApps: [...s.restrictedApps, newApp],
        }));
        hapticService.success();
        return true;
      },

      deleteRestrictedApp: (appId: string): boolean => {
        const state = get();
        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app) return false;

        if (app.isRestricted && app.removalRequestedAt) {
          const elapsed = Date.now() - app.removalRequestedAt;
          if (elapsed < APP_REMOVAL_COOLDOWN_MS) {
            return false;
          }
        } else if (app.isRestricted && !app.removalRequestedAt) {
          return false;
        }

        set((s) => ({
          restrictedApps: s.restrictedApps.filter((a) => a.id !== appId),
        }));
        hapticService.light();
        return true;
      },

      cancelRemovalRequest: (appId: string) => {
        set((s) => ({
          restrictedApps: s.restrictedApps.map((a) =>
            a.id === appId ? { ...a, removalRequestedAt: null } : a
          ),
        }));
        hapticService.light();
      },

      requestAppRemoval: (appId: string): boolean => {
        const state = get();
        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app || !app.isRestricted) return false;

        set((s) => ({
          restrictedApps: s.restrictedApps.map((a) =>
            a.id === appId
              ? { ...a, removalRequestedAt: Date.now() }
              : a
          ),
        }));
        hapticService.warning();
        return true;
      },

      purchaseUnlock: (appId: string, pkg: TimePackage): boolean => {
        const state = get();
        if (state.coins < pkg.costCoins) return false;

        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app || !app.isRestricted) return false;

        const now = Date.now();
        const currentUnlockedUntil = app.unlockedUntil && app.unlockedUntil > now
          ? app.unlockedUntil
          : now;
        const newUnlockedUntil = currentUnlockedUntil + pkg.durationMinutes * 60 * 1000;

        set((s) => ({
          coins: s.coins - pkg.costCoins,
          restrictedApps: s.restrictedApps.map((a) =>
            a.id === appId
              ? { ...a, unlockedUntil: newUnlockedUntil }
              : a
          ),
          dailyStats: {
            ...s.dailyStats,
            totalUnlockMinutes: s.dailyStats.totalUnlockMinutes + pkg.durationMinutes,
          },
          // Ghi nhận mốc bắt đầu tính thời gian mở khóa (nếu chưa có)
          lastUnlockTick: s.lastUnlockTick ?? now,
        }));
        hapticService.success();
        return true;
      },

      lockAppImmediately: (appId: string) => {
        // Cập nhật phút đã trôi qua trước khi khóa
        get().checkAndExpireUnlocks();
        set((s) => {
          const updatedApps = s.restrictedApps.map((a) =>
            a.id === appId ? { ...a, unlockedUntil: null } : a
          );
          const hasAnyActiveUnlock = updatedApps.some(
            (a) => a.isRestricted && a.unlockedUntil && a.unlockedUntil > Date.now()
          );
          return {
            restrictedApps: updatedApps,
            lastUnlockTick: hasAnyActiveUnlock ? s.lastUnlockTick : null,
          };
        });
        hapticService.heavy();
      },

      getAppLockStatus: (appId: string): AppLockStatus => {
        const state = get();
        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app || !app.isRestricted) return 'UNLOCKED';
        if (app.unlockedUntil && app.unlockedUntil > Date.now()) return 'UNLOCKED';
        if (app.removalRequestedAt) {
          const elapsed = Date.now() - app.removalRequestedAt;
          if (elapsed < APP_REMOVAL_COOLDOWN_MS) return 'COOLDOWN';
        }
        return 'LOCKED';
      },

      getActiveUnlocks: (): ActiveUnlock[] => {
        const state = get();
        const now = Date.now();
        return state.restrictedApps
          .filter((a) => a.isRestricted && a.unlockedUntil && a.unlockedUntil > now)
          .map((a) => ({
            appId: a.id,
            appName: a.name,
            startedAt: a.unlockedUntil! - 15 * 60 * 1000,
            durationMinutes: Math.round((a.unlockedUntil! - now) / 60000),
            expiresAt: a.unlockedUntil!,
          }));
      },

      checkAndExpireUnlocks: () => {
        const state = get();
        const now = Date.now();
        let changed = false;

        const apps = state.restrictedApps;
        const activeOrRecentlyExpiredApps = apps.filter(
          (a) => a.isRestricted && a.unlockedUntil !== null
        );

        let newSocialMinutes = state.socialMediaUsedMinutes;
        let newBrainHP = state.brainHP !== undefined ? state.brainHP : 100;
        let newLastUnlockTick = state.lastUnlockTick;

        // Cơ chế: Tính thời gian não thối bằng thời gian mở khóa đã dùng, cứ hết 1 phút trôi qua mất 1 HP
        if (activeOrRecentlyExpiredApps.length > 0) {
          const maxUnlockUntil = Math.max(
            ...activeOrRecentlyExpiredApps.map((a) => a.unlockedUntil!)
          );

          if (state.lastUnlockTick !== null) {
            const effectiveEnd = Math.min(now, maxUnlockUntil);
            if (effectiveEnd > state.lastUnlockTick) {
              const elapsedMs = effectiveEnd - state.lastUnlockTick;
              const minutesPassed = Math.floor(elapsedMs / 60000);

              if (minutesPassed > 0) {
                newSocialMinutes += minutesPassed;
                newBrainHP = Math.max(0, newBrainHP - minutesPassed);
                newLastUnlockTick = state.lastUnlockTick + minutesPassed * 60000;
                changed = true;
              }
            }
          } else {
            const anyActive = activeOrRecentlyExpiredApps.some((a) => a.unlockedUntil! > now);
            if (anyActive) {
              newLastUnlockTick = now;
              changed = true;
            }
          }
        }

        // Khóa lại các ứng dụng đã hết hạn thời gian
        const updatedApps = apps.map((a) => {
          if (a.unlockedUntil && a.unlockedUntil <= now) {
            changed = true;
            return { ...a, unlockedUntil: null };
          }
          return a;
        });

        // Nếu tất cả các ứng dụng đều đã hết hạn mở khóa
        const hasAnyActiveUnlock = updatedApps.some(
          (a) => a.isRestricted && a.unlockedUntil && a.unlockedUntil > now
        );
        if (!hasAnyActiveUnlock && newLastUnlockTick !== null) {
          newLastUnlockTick = null;
          changed = true;
        }

        if (changed) {
          set({
            restrictedApps: updatedApps,
            socialMediaUsedMinutes: newSocialMinutes,
            brainHP: newBrainHP,
            lastUnlockTick: newLastUnlockTick,
          });
          const justLocked = apps.some((a, idx) => a.unlockedUntil !== null && updatedApps[idx].unlockedUntil === null);
          if (justLocked) {
            hapticService.heavy();
          }
        }
      },

      // --- Gym Exercises ---
      addCustomExercise: (name: string, sets: number, reps: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const newEx: GymExercise = {
          id: `custom-ex-${Date.now()}`,
          name: trimmed,
          sets,
          reps,
          isCustom: true,
        };
        set((s) => ({ gymExercises: [...s.gymExercises, newEx] }));
        hapticService.success();
      },

      deleteCustomExercise: (id: string) => {
        set((s) => ({
          gymExercises: s.gymExercises.filter((e) => e.id !== id),
        }));
        hapticService.light();
      },

      // --- Stats & Streak ---
      getTodayStats: (): DailyStats => {
        const state = get();
        const today = getTodayDateString();
        if (state.dailyStats.date === today) {
          return state.dailyStats;
        }
        return createEmptyDailyStats(today);
      },

      resetDailyStatsIfNeeded: () => {
        const state = get();
        const today = getTodayDateString();
        if (state.dailyStats.date !== today) {
          const oldStats = state.dailyStats;
          set((s) => ({
            dailyStats: createEmptyDailyStats(today),
            historyByDate: {
              ...s.historyByDate,
              [oldStats.date]: oldStats,
            },
            socialMediaUsedMinutes: 0,
            brainHP: 100,
            brainHealthBonus: 0,
          }));
        }
      },

      getUserRank: () => {
        const totalCoins = get().totalLifetimeCoins;
        let currentRank = LEVEL_RANKS[0];
        let nextRank = LEVEL_RANKS[1];

        for (let i = LEVEL_RANKS.length - 1; i >= 0; i--) {
          if (totalCoins >= LEVEL_RANKS[i].minCoins) {
            currentRank = LEVEL_RANKS[i];
            nextRank = LEVEL_RANKS[i + 1] || LEVEL_RANKS[i];
            break;
          }
        }

        const isMaxLevel = currentRank.level === LEVEL_RANKS[LEVEL_RANKS.length - 1].level;
        const coinsInCurrentLevel = totalCoins - currentRank.minCoins;
        const coinsRequiredForNext = isMaxLevel ? 1 : nextRank.minCoins - currentRank.minCoins;
        const progress = isMaxLevel ? 1 : Math.min(1, Math.max(0, coinsInCurrentLevel / coinsRequiredForNext));

        return {
          level: currentRank.level,
          title: currentRank.title,
          progress,
          nextLevelCoins: nextRank.minCoins,
          currentCoins: totalCoins,
        };
      },

      checkAchievements: () => {
        const state = get();
        const unlocked = new Set(state.unlockedAchievements);
        let newlyUnlockedCoins = 0;
        const newUnlockedList: string[] = [];

        ACHIEVEMENTS_LIST.forEach((ach) => {
          if (unlocked.has(ach.id)) return;

          let achieved = false;
          switch (ach.id) {
            case 'first_quest':
              achieved = state.questHistory.length >= 1;
              break;
            case 'pushup_50':
              achieved = state.dailyStats.pushupCount >= 50 || state.questHistory.reduce((acc, q) => q.type === 'pushup' ? acc + (parseInt(q.details) || 0) : acc, 0) >= 50;
              break;
            case 'pushup_200':
              achieved = state.questHistory.reduce((acc, q) => q.type === 'pushup' ? acc + (parseInt(q.details) || 0) : acc, 0) >= 200;
              break;
            case 'deepwork_60':
              achieved = state.dailyStats.deepWorkMinutes >= 60 || state.questHistory.reduce((acc, q) => q.type === 'deepwork' ? acc + (parseInt(q.details) || 0) : acc, 0) >= 60;
              break;
            case 'deepwork_300':
              achieved = state.questHistory.reduce((acc, q) => q.type === 'deepwork' ? acc + (parseInt(q.details) || 0) : acc, 0) >= 300;
              break;
            case 'gym_3':
              achieved = state.questHistory.filter((q) => q.type === 'gym').length >= 3;
              break;
            case 'reading_60':
              achieved = state.dailyStats.readingMinutes >= 60 || state.questHistory.reduce((acc, q) => q.type === 'reading' ? acc + (parseInt(q.details) || 0) : acc, 0) >= 60;
              break;
            case 'streak_3':
              achieved = state.currentStreak >= 3;
              break;
            case 'streak_7':
              achieved = state.currentStreak >= 7;
              break;
            case 'coins_100':
              achieved = state.coins >= 100;
              break;
          }

          if (achieved) {
            newUnlockedList.push(ach.id);
            unlocked.add(ach.id);
          }
        });

        if (newUnlockedList.length > 0) {
          set({
            unlockedAchievements: Array.from(unlocked),
          });
          hapticService.light();
        }
      },

      claimAchievement: (achievementId: string): boolean => {
        const state = get();
        const ach = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
        if (!ach) return false;
        if (!state.unlockedAchievements.includes(achievementId)) return false;
        if (state.claimedAchievements.includes(achievementId)) return false;

        // Lưu ý: Nhận Coins từ Thành tựu KHÔNG được cộng HP! (Chỉ làm nhiệm vụ có Coins mới được cộng HP)
        set((s) => ({
          coins: s.coins + ach.rewardCoins,
          totalLifetimeCoins: s.totalLifetimeCoins + ach.rewardCoins,
          claimedAchievements: [...s.claimedAchievements, achievementId],
        }));
        hapticService.success();
        return true;
      },

      // --- Settings ---
      updateSettings: (newSettings: Partial<AppSettings>) => {
        set((s) => {
          const updated = { ...s.settings, ...newSettings };
          hapticService.setEnabled(updated.hapticsEnabled);
          return { settings: updated };
        });
      },

      resetAllData: () => {
        set({
          coins: 40,
          totalLifetimeCoins: 40,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: getTodayDateString(),
          restrictedApps: DEFAULT_RESTRICTED_APPS,
          questHistory: [],
          dailyStats: createEmptyDailyStats(),
          historyByDate: {},
          unlockedAchievements: [],
          claimedAchievements: [],
          gymExercises: DEFAULT_GYM_EXERCISES,
          socialMediaUsedMinutes: 0,
          brainHP: 100,
          brainHealthBonus: 0,
        });
        hapticService.heavy();
      },

      // --- Utility ---
      getRemainingTime: (appId: string): number => {
        const state = get();
        const app = state.restrictedApps.find((a) => a.id === appId);
        if (!app || !app.unlockedUntil) return 0;
        const remaining = app.unlockedUntil - Date.now();
        return remaining > 0 ? remaining : 0;
      },
    }),
    {
      name: 'earnyourtime-storage-v3',
      storage: createJSONStorage(() => safeStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        coins: state.coins,
        totalLifetimeCoins: state.totalLifetimeCoins,
        currentStreak: state.currentStreak,
        longestStreak: state.longestStreak,
        lastActiveDate: state.lastActiveDate,
        restrictedApps: state.restrictedApps,
        questHistory: state.questHistory,
        dailyStats: state.dailyStats,
        historyByDate: state.historyByDate,
        unlockedAchievements: state.unlockedAchievements,
        claimedAchievements: state.claimedAchievements,
        gymExercises: state.gymExercises,
        settings: state.settings,
        socialMediaUsedMinutes: state.socialMediaUsedMinutes,
        brainHP: state.brainHP,
        screenTimePermissionGranted: state.screenTimePermissionGranted,
      }),
    }
  )
);
