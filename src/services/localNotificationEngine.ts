import type { NotificationPreference, NotificationType, ScheduledNotification } from '../types/notifications';
import type { UpcomingMilestones } from '../types/prediction';
import { parseDateKey } from '../utils/cycleCalculator';

export function getDefaultNotificationPreferences(): NotificationPreference {
  return {
    enabled: true,
    alertTime: '09:00',
    daysBeforePeriod: 7,
    periodReminders: [7, 2],
    repeatMonthly: true,
    notifyFertileWindow: true,
    discreetMode: true
  };
}

/**
 * Returns camouflaged, discreet phrases for the lock screen
 */
export function getCamouflagedMessage(
  type: NotificationType,
  discreetMode = true,
  daysBefore = 7
): { title: string; body: string } {
  const timeText = daysBefore === 0 ? 'hoy' : daysBefore === 1 ? 'mañana' : daysBefore === 7 ? 'en 1 semana' : `en ${daysBefore} días`;
  if (!discreetMode) {
    switch (type) {
      case 'period_approaching':
        return {
          title: 'Aura',
          body: daysBefore === 0 ? 'Tu periodo está previsto para comenzar hoy 🩸' : `Tu periodo está previsto para comenzar ${timeText} 🩸`
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
        body: daysBefore === 0
          ? 'Un pequeño recordatorio para tu día hoy 🌸'
          : daysBefore === 1
            ? 'Un pequeño recordatorio para mañana 🌸'
            : daysBefore === 7
              ? 'Un pequeño recordatorio para tu semana 🌸'
              : `Un pequeño recordatorio para tus próximos ${daysBefore} días 🌸`
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

  // 1. Period approaching alerts (múltiples recordatorios configurables)
  if (milestones.nextPeriodStartDate && /^\d{4}-\d{2}-\d{2}$/.test(milestones.nextPeriodStartDate)) {
    const periodStartDate = parseDateKey(milestones.nextPeriodStartDate);
    if (Number.isFinite(periodStartDate.getTime())) {
      const reminderDays = Array.isArray(prefs.periodReminders) && prefs.periodReminders.length > 0
        ? prefs.periodReminders
        : [prefs.daysBeforePeriod ?? 7];

      for (const daysBefore of reminderDays) {
        const triggerDate = new Date(periodStartDate);
        triggerDate.setDate(periodStartDate.getDate() - daysBefore);
        triggerDate.setHours(hours, minutes, 0, 0);

        const msg = getCamouflagedMessage('period_approaching', prefs.discreetMode, daysBefore);

        scheduled.push({
          id: `period_${milestones.nextPeriodStartDate}_${daysBefore}d`,
          targetDate: milestones.nextPeriodStartDate,
          triggerTimestamp: triggerDate.getTime(),
          type: 'period_approaching',
          title: msg.title,
          body: msg.body,
          isDiscreet: prefs.discreetMode
        });
      }
    }
  }

  // 2. Fertile window alert (1 day before nextFertileWindowStart)
  if (prefs.notifyFertileWindow && milestones.nextFertileWindowStart && /^\d{4}-\d{2}-\d{2}$/.test(milestones.nextFertileWindowStart)) {
    const fertileStartDate = parseDateKey(milestones.nextFertileWindowStart);
    if (Number.isFinite(fertileStartDate.getTime())) {
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
