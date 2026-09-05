import type { NotificationPreference, NotificationType, ScheduledNotification } from '../types/notifications';
import type { UpcomingMilestones } from '../types/prediction';
import { parseDateKey } from '../utils/cycleCalculator';

export function getDefaultNotificationPreferences(): NotificationPreference {
  return {
    enabled: false,
    alertTime: '09:00',
    daysBeforePeriod: 2,
    notifyFertileWindow: true,
    discreetMode: true
  };
}

/**
 * Returns camouflaged, discreet phrases for the lock screen
 */
export function getCamouflagedMessage(
  type: NotificationType,
  discreetMode = true
): { title: string; body: string } {
  if (!discreetMode) {
    switch (type) {
      case 'period_approaching':
        return {
          title: 'Aura',
          body: 'Tu periodo está previsto para comenzar en un par de días 🩸'
        };
      case 'fertile_window':
        return {
          title: 'Aura',
          body: 'Comienza tu ventana fértil estimada 🟣'
        };
      case 'wellness_check':
        return {
          title: 'Aura',
          body: 'Revisa tu consejo de bienestar del día ✨'
        };
    }
  }

  // Camouflaged messages (100% lock screen privacy)
  switch (type) {
    case 'period_approaching':
      return {
        title: 'Aura',
        body: 'Un pequeño recordatorio para ti hoy 🌸'
      };
    case 'fertile_window':
      return {
        title: 'Aura',
        body: 'Momento de cuidar tu ritmo y mimarte ✨'
      };
    case 'wellness_check':
      return {
        title: 'Aura',
        body: 'Toca echar un vistazo a tus notas de hoy 🌿'
      };
  }
}

/**
 * Requests native browser/device notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  try {
    return await Notification.requestPermission();
  } catch (e) {
    console.warn('Error requesting notification permission', e);
    return 'default';
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Sends a native local notification immediately
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  tag = 'aura-notification'
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }

  try {
    // 1. Try Service Worker showNotification if active
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          tag,
          icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>',
          badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>'
        });
        return true;
      }
    }

    // 2. Fallback to standard Notification constructor
    new Notification(title, {
      body,
      tag,
      icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>'
    });
    return true;
  } catch (error) {
    console.error('Error firing local notification', error);
    return false;
  }
}

/**
 * Calculates upcoming scheduled alerts based on predictive milestones
 */
export function scheduleLocalMilestones(
  milestones: UpcomingMilestones,
  prefs: NotificationPreference
): ScheduledNotification[] {
  if (!prefs.enabled) return [];

  const scheduled: ScheduledNotification[] = [];
  const [hours, minutes] = (prefs.alertTime || '09:00').split(':').map(Number);

  // 1. Period approaching alert (e.g. 2 days before nextPeriodStartDate)
  if (milestones.nextPeriodStartDate) {
    const periodStartDate = parseDateKey(milestones.nextPeriodStartDate);
    const triggerDate = new Date(periodStartDate);
    triggerDate.setDate(periodStartDate.getDate() - (prefs.daysBeforePeriod || 2));
    triggerDate.setHours(hours, minutes, 0, 0);

    const msg = getCamouflagedMessage('period_approaching', prefs.discreetMode);

    scheduled.push({
      id: `period_${milestones.nextPeriodStartDate}`,
      targetDate: milestones.nextPeriodStartDate,
      triggerTimestamp: triggerDate.getTime(),
      type: 'period_approaching',
      title: msg.title,
      body: msg.body,
      isDiscreet: prefs.discreetMode
    });
  }

  // 2. Fertile window alert (1 day before nextFertileWindowStart)
  if (prefs.notifyFertileWindow && milestones.nextFertileWindowStart) {
    const fertileStartDate = parseDateKey(milestones.nextFertileWindowStart);
    const triggerDate = new Date(fertileStartDate);
    triggerDate.setDate(fertileStartDate.getDate() - 1);
    triggerDate.setHours(hours, minutes, 0, 0);

    const msg = getCamouflagedMessage('fertile_window', prefs.discreetMode);

    scheduled.push({
      id: `fertile_${milestones.nextFertileWindowStart}`,
      targetDate: milestones.nextFertileWindowStart,
      triggerTimestamp: triggerDate.getTime(),
      type: 'fertile_window',
      title: msg.title,
      body: msg.body,
      isDiscreet: prefs.discreetMode
    });
  }

  return scheduled;
}

/**
 * Sends an instant test camouflaged notification to test screen appearance
 */
export async function sendInstantTestNotification(
  prefs?: NotificationPreference
): Promise<boolean> {
  const isDiscreet = prefs ? prefs.discreetMode : true;
  const msg = getCamouflagedMessage('period_approaching', isDiscreet);
  return await sendLocalNotification(msg.title, msg.body, 'test-notification');
}
