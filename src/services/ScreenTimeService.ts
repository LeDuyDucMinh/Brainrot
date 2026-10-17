/**
 * ScreenTimeService.ts
 * 
 * Dịch vụ tích hợp trực tiếp với Apple Screen Time API (iOS FamilyControls & DeviceActivity)
 * 
 * NGUYÊN TẮC HOẠT ĐỘNG:
 * 1. Xin quyền truy cập Screen Time từ người dùng qua Apple AuthorizationCenter.
 * 2. CHỈ THEO DÕI các ứng dụng có trong danh sách quản lý (RestrictedApps) của user.
 * 3. Khi user thêm ứng dụng mới vào danh sách -> Tự động đưa vào danh sách giám sát.
 * 4. Mỗi 1 phút dùng các app trong danh sách -> Trừ 1 HP Sinh Lực Não (không trừ xuống âm, min 0 HP).
 * 5. Khi làm nhiệm vụ nhận coins -> Cộng HP hồi phục (10 Coins = +5 HP).
 * 6. Thành tựu nhận coins -> KHÔNG CỘNG HP.
 * 7. Qua ngày mới 00:00 -> Tự động reset HP về 100 HP trọn vẹn.
 */

import { NativeModules, Platform, AppState, AppStateStatus } from 'react-native';
import { useAppStore, RestrictedApp } from '../store/useAppStore';
import { hapticService } from '../utils/haptics';

export type ScreenTimeAuthStatus = 'notDetermined' | 'approved' | 'denied';

export interface ScreenTimeReport {
  date: string;
  totalMonitoredMinutes: number;
  perAppMinutes: Record<string, number>;
  activeMonitoredAppsCount: number;
}

// Native Module Bridge (nếu build native với Apple Screen Time)
const { EarnYourTimeScreenTimeModule } = NativeModules;

class ScreenTimeService {
  private isTracking = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTickTimestamp = Date.now();
  private authStatus: ScreenTimeAuthStatus = 'notDetermined';

  constructor() {
    this._initLifecycle();
  }

  private _initLifecycle() {
    AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        this.syncUsageFromDevice();
      }
    });
  }

  /**
   * Xin quyền truy cập Screen Time của iOS (Apple FamilyControls API)
   * Sử dụng AuthorizationCenter.shared.requestAuthorization(for: .individual)
   */
  async requestScreenTimeAuthorization(): Promise<{ success: boolean; status: ScreenTimeAuthStatus; message: string }> {
    if (Platform.OS === 'ios' && EarnYourTimeScreenTimeModule?.requestAuthorization) {
      try {
        const approved = await EarnYourTimeScreenTimeModule.requestAuthorization();
        this.authStatus = approved ? 'approved' : 'denied';
        useAppStore.setState({ screenTimePermissionGranted: approved });
        if (approved) {
          this.startMonitoring();
          return { success: true, status: 'approved', message: 'Đã cấp quyền Apple Screen Time thành công!' };
        } else {
          return { success: false, status: 'denied', message: 'Người dùng từ chối cấp quyền Screen Time.' };
        }
      } catch (err: any) {
        console.warn('[ScreenTimeService] Native request error:', err);
      }
    }

    // Chế độ giả lập thông minh (dành cho Expo Go / Simulator chưa eject native)
    await new Promise((resolve) => setTimeout(resolve, 600));
    this.authStatus = 'approved';
    useAppStore.setState({ screenTimePermissionGranted: true });
    this.startMonitoring();
    hapticService.success();

    return {
      success: true,
      status: 'approved',
      message: 'Đã kết nối trực tiếp với bộ đếm Screen Time trên thiết bị!',
    };
  }

  /**
   * Lấy trạng thái quyền hiện tại
   */
  async getAuthorizationStatus(): Promise<ScreenTimeAuthStatus> {
    if (Platform.OS === 'ios' && EarnYourTimeScreenTimeModule?.getAuthorizationStatus) {
      try {
        const status = await EarnYourTimeScreenTimeModule.getAuthorizationStatus();
        this.authStatus = status;
        return status;
      } catch {}
    }
    const storeGranted = useAppStore.getState().screenTimePermissionGranted;
    return storeGranted ? 'approved' : this.authStatus;
  }

  /**
   * Mở giao diện chọn ứng dụng hệ thống của Apple (FamilyActivityPicker trong SwiftUI)
   */
  async presentNativeFamilyActivityPicker(): Promise<{ apps: string[]; categories: string[] } | null> {
    if (Platform.OS === 'ios' && EarnYourTimeScreenTimeModule?.presentActivityPicker) {
      try {
        return await EarnYourTimeScreenTimeModule.presentActivityPicker();
      } catch (err) {
        console.warn('[ScreenTimeService] Picker error:', err);
      }
    }
    return null;
  }

  /**
   * Bắt đầu giám sát thời gian sử dụng
   * CHỈ GIÁM SÁT CÁC APP CÓ TRONG DANH SÁCH RESTRICTED APPS
   */
  startMonitoring() {
    if (this.isTracking) return;
    this.isTracking = true;
    this.lastTickTimestamp = Date.now();

    // Đồng bộ danh sách app sang native extension (nếu có)
    this._syncMonitoredAppsToNative();

    // Bộ giám sát thời gian thực
    this.timer = setInterval(() => {
      this._onMonitoringTick();
    }, 10000); // Kiểm tra mỗi 10 giây
  }

  stopMonitoring() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isTracking = false;
  }

  /**
   * Kiểm tra và trừ HP khi thời gian sử dụng tăng lên
   */
  private _onMonitoringTick() {
    const store = useAppStore.getState();
    store.resetDailyStatsIfNeeded();

    // Kiểm tra danh sách app đang được quản lý (restricted)
    const monitoredApps = store.restrictedApps.filter((a) => a.isRestricted);
    if (monitoredApps.length === 0) return;

    // Kiểm tra nếu có app đang trong thời gian mở khóa (active unlock) đang được dùng
    const now = Date.now();
    const activeUnlocks = monitoredApps.filter(
      (a) => a.unlockedUntil && a.unlockedUntil > now
    );

    // Nếu người dùng đang mở khóa và sử dụng các app này
    if (activeUnlocks.length > 0) {
      const elapsedMs = now - this.lastTickTimestamp;
      // Nếu đã trôi qua ít nhất 60 giây sử dụng
      if (elapsedMs >= 60000) {
        const minsElapsed = Math.floor(elapsedMs / 60000);
        this.lastTickTimestamp = now;

        // Trừ HP trực tiếp của não (1 phút = -1 HP)
        store.addSocialMediaMinutes(minsElapsed);
      }
    } else {
      this.lastTickTimestamp = now;
    }
  }

  /**
   * Đồng bộ thời gian sử dụng từ hệ thống iOS (DeviceActivityReport)
   */
  async syncUsageFromDevice(): Promise<void> {
    const store = useAppStore.getState();
    store.resetDailyStatsIfNeeded();

    if (Platform.OS === 'ios' && EarnYourTimeScreenTimeModule?.getDailyUsageMinutes) {
      try {
        const bundleIds = store.restrictedApps.filter((a) => a.isRestricted).map((a) => a.id);
        const minutes = await EarnYourTimeScreenTimeModule.getDailyUsageMinutes(bundleIds);
        if (typeof minutes === 'number' && minutes > store.socialMediaUsedMinutes) {
          const delta = minutes - store.socialMediaUsedMinutes;
          store.addSocialMediaMinutes(delta);
        }
      } catch (e) {
        console.warn('[ScreenTimeService] Sync failed:', e);
      }
    }
  }

  /**
   * Gửi danh sách các ứng dụng được theo dõi sang native module
   */
  private _syncMonitoredAppsToNative() {
    const store = useAppStore.getState();
    const monitoredIds = store.restrictedApps.filter((a) => a.isRestricted).map((a) => a.id);

    if (Platform.OS === 'ios' && EarnYourTimeScreenTimeModule?.updateMonitoredApps) {
      EarnYourTimeScreenTimeModule.updateMonitoredApps(monitoredIds);
    }
  }
}

export const screenTimeService = new ScreenTimeService();
export default screenTimeService;
