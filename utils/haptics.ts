import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export async function triggerPressHaptic(options?: {
  iosStyle?: Haptics.ImpactFeedbackStyle;
  androidSelection?: boolean;
}) {
  try {
    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(options?.iosStyle ?? Haptics.ImpactFeedbackStyle.Medium);
      return;
    }
    if (Platform.OS === 'android') {
      if (options?.androidSelection === false) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.selectionAsync();
      }
    }
  } catch {
    // Haptics may not be supported; ignore errors silently.
  }
}
