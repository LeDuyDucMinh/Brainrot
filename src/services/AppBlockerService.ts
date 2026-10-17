/**
 * AppBlockerService.ts
 * 
 * Lớp trừu tượng (Adapter Pattern) cho việc khóa/mở khóa ứng dụng.
 * 
 * KIẾN TRÚC:
 * - Hiện tại chạy ở Mock/Simulation Mode để test trên Expo Go.
 * - Khi build production, thay thế MockAdapter bằng:
 *   - Android: AndroidAppBlockerAdapter (dùng UsageStatsManager + SYSTEM_ALERT_WINDOW)
 *   - iOS: IOSAppBlockerAdapter (dùng FamilyControls / ManagedSettings / DeviceActivity)
 * 
 * ANDROID NATIVE HOOKS:
 * 1. Cần permission: PACKAGE_USAGE_STATS, SYSTEM_ALERT_WINDOW
 * 2. Tạo AccessibilityService hoặc UsageStatsManager để phát hiện app foreground
 * 3. Dùng SYSTEM_ALERT_WINDOW để hiển thị overlay chặn
 * 4. Tạo Native Module (Java/Kotlin) expose qua React Native Bridge
 * 
 * iOS NATIVE HOOKS:
 * 1. Cần Family Controls entitlement (Apple Developer Program)
 * 2. Sử dụng ManagedSettingsStore để block/unblock applications
 * 3. DeviceActivityMonitor để theo dõi usage
 * 4. Tạo Swift Native Module expose qua React Native Bridge
 */

import { useAppStore, RestrictedApp } from '../store/useAppStore';

// ============================================================
// Interfaces
// ============================================================

export interface BlockerPermissionStatus {
  granted: boolean;
  canRequestAgain: boolean;
  platform: 'ios' | 'android' | 'mock';
}

export interface AppLockState {
  appId: string;
  appName: string;
  isBlocked: boolean;
  unlockedUntil: number | null;
  remainingMs: number;
}

export interface BlockerAdapter {
  requestPermissions(): Promise<BlockerPermissionStatus>;
  lockApps(appIds: string[]): Promise<boolean>;
  unlockApps(appIds: string[], durationMinutes: number): Promise<boolean>;
  getLockStatus(): Promise<AppLockState[]>;
  isOverlayActive(): Promise<boolean>;
}

// ============================================================
// Mock Adapter (Simulation Mode for Expo)
// ============================================================

class MockBlockerAdapter implements BlockerAdapter {
  private mockPermissionGranted = false;
  private overlayActive = false;

  /**
   * Mô phỏng yêu cầu quyền từ người dùng.
   * ANDROID HOOK: Mở Settings -> Accessibility / Usage Access
   * iOS HOOK: Gọi AuthorizationCenter.shared.requestAuthorization(for: .individual)
   */
  async requestPermissions(): Promise<BlockerPermissionStatus> {
    // Simulate permission grant after a short delay
    await this._simulateDelay(500);
    this.mockPermissionGranted = true;
    
    console.log('[MockBlocker] ✅ Permissions granted (simulated)');
    return {
      granted: true,
      canRequestAgain: true,
      platform: 'mock',
    };
  }

  /**
   * Khóa danh sách ứng dụng.
   * ANDROID HOOK: Thêm appIds vào danh sách giám sát của AccessibilityService
   * iOS HOOK: Tạo ManagedSettingsStore.shield cho các application tokens
   */
  async lockApps(appIds: string[]): Promise<boolean> {
    if (!this.mockPermissionGranted) {
      console.warn('[MockBlocker] ⚠️ Permissions not granted. Call requestPermissions() first.');
      return false;
    }

    await this._simulateDelay(300);
    
    // Đồng bộ với Zustand store
    const store = useAppStore.getState();
    for (const appId of appIds) {
      const app = store.restrictedApps.find(a => a.id === appId);
      if (app && !app.isRestricted) {
        store.toggleAppRestriction(appId);
      }
    }

    this.overlayActive = true;
    console.log(`[MockBlocker] 🔒 Locked apps: ${appIds.join(', ')}`);
    return true;
  }

  /**
   * Mở khóa danh sách ứng dụng trong khoảng thời gian cụ thể.
   * ANDROID HOOK: Xóa appIds khỏi danh sách giám sát, đặt AlarmManager để khóa lại
   * iOS HOOK: Xóa shield, đặt DeviceActivitySchedule để tự động shield lại
   */
  async unlockApps(appIds: string[], durationMinutes: number): Promise<boolean> {
    if (!this.mockPermissionGranted) {
      console.warn('[MockBlocker] ⚠️ Permissions not granted.');
      return false;
    }

    await this._simulateDelay(200);

    const now = Date.now();
    const unlockUntil = now + durationMinutes * 60 * 1000;

    // Update store
    const store = useAppStore.getState();
    for (const appId of appIds) {
      // Tìm gói phù hợp hoặc tạo unlock trực tiếp
      const app = store.restrictedApps.find(a => a.id === appId);
      if (app) {
        // Directly set unlockedUntil through store mechanism
        useAppStore.setState((state) => ({
          restrictedApps: state.restrictedApps.map((a) =>
            a.id === appId
              ? { ...a, unlockedUntil: unlockUntil }
              : a
          ),
        }));
      }
    }

    // Đặt timer tự động khóa lại
    setTimeout(() => {
      console.log(`[MockBlocker] ⏰ Auto-locking apps: ${appIds.join(', ')}`);
      store.checkAndExpireUnlocks();
      this.overlayActive = true;
    }, durationMinutes * 60 * 1000);

    this.overlayActive = false;
    console.log(`[MockBlocker] 🔓 Unlocked apps for ${durationMinutes} min: ${appIds.join(', ')}`);
    return true;
  }

  /**
   * Lấy trạng thái khóa/mở của tất cả app bị giới hạn.
   * ANDROID HOOK: Query UsageStatsManager + internal state
   * iOS HOOK: Query ManagedSettingsStore.shield state
   */
  async getLockStatus(): Promise<AppLockState[]> {
    const store = useAppStore.getState();
    const now = Date.now();

    return store.restrictedApps
      .filter(app => app.isRestricted)
      .map(app => {
        const remaining = app.unlockedUntil ? Math.max(0, app.unlockedUntil - now) : 0;
        return {
          appId: app.id,
          appName: app.name,
          isBlocked: remaining <= 0,
          unlockedUntil: app.unlockedUntil,
          remainingMs: remaining,
        };
      });
  }

  /**
   * Kiểm tra overlay chặn có đang hiển thị không.
   * ANDROID HOOK: Check WindowManager overlay visibility
   * iOS HOOK: Check ManagedSettingsStore shield status
   */
  async isOverlayActive(): Promise<boolean> {
    const states = await this.getLockStatus();
    return states.some(s => s.isBlocked);
  }

  private _simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================
// ============================================================
// iOS Native Adapter (Apple Screen Time API)
// ============================================================

import { NativeModules, Platform } from 'react-native';

const { EarnYourTimeBlockerModule } = NativeModules;

class IOSAppBlockerAdapter implements BlockerAdapter {
  private fallbackMock = new MockBlockerAdapter();

  async requestPermissions(): Promise<BlockerPermissionStatus> {
    if (EarnYourTimeBlockerModule?.requestScreenTimeAuthorization) {
      try {
        await EarnYourTimeBlockerModule.requestScreenTimeAuthorization();
        return { granted: true, canRequestAgain: true, platform: 'ios' };
      } catch (err) {
        console.warn('[IOSBlocker] FamilyControls request failed:', err);
        return { granted: false, canRequestAgain: true, platform: 'ios' };
      }
    }
    // Fallback nếu chạy trong Expo Go chưa build native
    return this.fallbackMock.requestPermissions();
  }

  async lockApps(appIds: string[]): Promise<boolean> {
    if (EarnYourTimeBlockerModule?.applyShieldToApps) {
      try {
        await EarnYourTimeBlockerModule.applyShieldToApps(appIds);
        return true;
      } catch (err) {
        console.warn('[IOSBlocker] Failed to apply shield:', err);
      }
    }
    return this.fallbackMock.lockApps(appIds);
  }

  async unlockApps(appIds: string[], durationMinutes: number): Promise<boolean> {
    if (EarnYourTimeBlockerModule?.removeShieldFromApps) {
      try {
        await EarnYourTimeBlockerModule.removeShieldFromApps();
        return true;
      } catch (err) {
        console.warn('[IOSBlocker] Failed to remove shield:', err);
      }
    }
    return this.fallbackMock.unlockApps(appIds, durationMinutes);
  }

  async getLockStatus(): Promise<AppLockState[]> {
    return this.fallbackMock.getLockStatus();
  }

  async isOverlayActive(): Promise<boolean> {
    return this.fallbackMock.isOverlayActive();
  }
}

// ============================================================
// Singleton Export
// ============================================================

function createBlockerAdapter(): BlockerAdapter {
  if (Platform.OS === 'ios' && EarnYourTimeBlockerModule) {
    return new IOSAppBlockerAdapter();
  }
  return new MockBlockerAdapter();
}

export const appBlockerService = createBlockerAdapter();
export default appBlockerService;

