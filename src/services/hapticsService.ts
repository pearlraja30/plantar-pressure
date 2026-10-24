/**
 * Plantar Pressure Analysis System - Haptics Engine
 * Provides native tactile feedback across iOS Taptic Engine, Android Vibration Motors,
 * and standard mobile browser navigator.vibrate fallback.
 */

import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export class HapticsService {
  /**
   * Subtle single tap (15ms) when artificial horizon level and steady state locks on.
   */
  public static async alignmentLock(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15);
      }
    } catch {
      // Non-fatal fallback for unprivileged or silent browser contexts
    }
  }

  /**
   * Rhythmic pulse (25ms) on each auto-capture countdown tick (2 -> 1 -> 0).
   */
  public static async countdownTick(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(25);
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Confirmatory double-pulse ([40ms, 60ms, 40ms]) when image shutter triggers.
   */
  public static async captureSuccess(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch {
      // Non-fatal
    }
  }

  /**
   * Warning double tap when phone tilt exceeds 18° or heavy shaking is detected.
   */
  public static async warning(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Warning });
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 40, 30]);
      }
    } catch {
      // Non-fatal
    }
  }
}
