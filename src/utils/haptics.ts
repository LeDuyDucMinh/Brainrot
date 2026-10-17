import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';

class HapticFeedbackService {
  private enabled = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async light() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate(20);
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      Vibration.vibrate(20);
    }
  }

  async medium() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate(40);
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Vibration.vibrate(40);
    }
  }

  async heavy() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate(70);
        return;
      }
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      Vibration.vibrate(70);
    }
  }

  async success() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate([0, 50, 50, 100]);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Vibration.vibrate([0, 50, 50, 100]);
    }
  }

  async warning() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate([0, 100, 100, 100]);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      Vibration.vibrate([0, 100, 100, 100]);
    }
  }

  async error() {
    if (!this.enabled) return;
    try {
      if (Platform.OS === 'web') {
        Vibration.vibrate([0, 150, 50, 250]);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      Vibration.vibrate([0, 150, 50, 250]);
    }
  }
}

export const hapticService = new HapticFeedbackService();
export default hapticService;

