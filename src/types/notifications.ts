export type NotificationType = 'period_approaching' | 'fertile_window' | 'wellness_check';

export interface NotificationPreference {
  enabled: boolean;
  alertTime: string; // "09:00"
  daysBeforePeriod: number; // e.g. 2
  notifyFertileWindow: boolean; // e.g. true
  discreetMode: boolean; // true = camouflaged texts
}

export interface ScheduledNotification {
  id: string;
  targetDate: string; // YYYY-MM-DD
  triggerTimestamp: number; // Unix ms
  type: NotificationType;
  title: string;
  body: string;
  isDiscreet: boolean;
}
