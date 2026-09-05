/**
 * Haptic Feedback Engine
 * 
 * Uses the Web Vibration API (navigator.vibrate) available on:
 *  - Android Chrome 32+
 *  - iOS Safari 16.4+ (inside installed PWAs only)
 *  - Firefox, Samsung Internet, etc.
 *
 * Falls back silently (no-op) on unsupported platforms.
 * All vibration patterns are designed to be extremely subtle
 * and battery-friendly — single-digit millisecond pulses.
 */

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Ultra-light tap — used for scrolling past a notable day.
 * Equivalent to UIImpactFeedbackGenerator.style.light on iOS.
 * 1ms pulse: barely perceptible, like a clock tick.
 */
export function hapticTick(): void {
  if (canVibrate()) {
    navigator.vibrate(1);
  }
}

/**
 * Soft selection feedback — used for selecting a day pill or toggling a setting.
 * Equivalent to UISelectionFeedbackGenerator on iOS.
 * 3ms pulse: subtle but noticeable.
 */
export function hapticSelect(): void {
  if (canVibrate()) {
    navigator.vibrate(3);
  }
}

/**
 * Success confirmation — used after saving a note or completing an action.
 * Equivalent to UINotificationFeedbackGenerator.type.success on iOS.
 * Two quick pulses with a gap: "da-dum" pattern.
 */
export function hapticSuccess(): void {
  if (canVibrate()) {
    navigator.vibrate([4, 60, 6]);
  }
}

/**
 * Mode change — used when toggling Modo Refugio or other significant state changes.
 * Single medium pulse: firm but not intrusive.
 */
export function hapticModeChange(): void {
  if (canVibrate()) {
    navigator.vibrate(8);
  }
}

/**
 * Warning / destructive action — used before data wipes.
 * Three escalating pulses.
 */
export function hapticWarning(): void {
  if (canVibrate()) {
    navigator.vibrate([10, 50, 15, 50, 20]);
  }
}

/**
 * Error feedback — used after a failed action (login error, import fail, etc.)
 * Two sharp pulses: "tap-tap" pattern.
 */
export function hapticError(): void {
  if (canVibrate()) {
    navigator.vibrate([12, 40, 12]);
  }
}
