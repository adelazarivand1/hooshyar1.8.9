import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { FullDateInfo, UserReminder } from '../types/calendar';
import { NextPrayerInfo } from './prayerTimes';
import { toPersianDigits, toEnglishDigits, normalizeDateKey, PERSIAN_MONTH_NAMES, GREGORIAN_MONTH_NAMES, HIJRI_MONTH_NAMES } from './persianNumber';
import { jalaliToGregorian, isValidJalali } from './jalali';
import { isNativeAzanAvailable } from './nativeAzan';

export interface NotificationStatus {
  supported: boolean;
  permission: NotificationPermission | 'granted' | 'denied' | 'prompt' | 'unsupported';
}

export function isCapacitorNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function checkNotificationSupport(): Promise<NotificationStatus> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return {
        supported: true,
        permission: perm.display === 'granted' ? 'granted' : (perm.display === 'denied' ? 'denied' : 'prompt')
      };
    } catch (e) {
      console.warn('Capacitor checkPermissions error:', e);
      return { supported: false, permission: 'unsupported' };
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'unsupported' };
  }
  return { supported: true, permission: Notification.permission };
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.checkPermissions();
      return perm.display === 'granted';
    } catch {
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isCapacitorNative()) {
    try {
      const perm = await LocalNotifications.requestPermissions();
      return perm.display === 'granted';
    } catch (e) {
      console.warn('Capacitor requestPermissions error:', e);
      return false;
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  try {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  } catch (e) {
    console.warn('Error requesting web notification permission:', e);
    return false;
  }
}

export const AZAN_ALARM_CHANNEL_ID = 'azan_alarms_channel_v3';
export const AZAN_ACTIVE_CHANNEL_ID = 'azan_active_channel';

let isNotificationActionListenerAttached = false;

export async function initNotificationService() {
  if (isCapacitorNative()) {
    try {
      // 0. Remove obsolete/stale notification channels to prevent immutable sound bugs
      try {
        await LocalNotifications.deleteChannel({ id: 'azan_alarms_channel_v2' });
        await LocalNotifications.deleteChannel({ id: 'azan_alarms_channel' });
      } catch {
        // Channel deletion not supported on all Android versions or channel didn't exist
      }

      // 1. Create Azan Alarm Channel for Android 8+ (API 26+)
      try {
        await LocalNotifications.createChannel({
          id: AZAN_ALARM_CHANNEL_ID,
          name: 'هشدار و پخش اذان شرعی',
          description: 'اعلان‌ها و هشدارهای دقیق اوقات شرعی و پخش نوای اذان',
          importance: 5, // High
          visibility: 1, // Public
          vibration: true
        });
      } catch (e) {
        console.warn('Failed to create Azan Alarm channel:', e);
      }

      // 2. Create Active Azan channel for foreground playback status (silent to not clash with playing audio)
      try {
        await LocalNotifications.createChannel({
          id: AZAN_ACTIVE_CHANNEL_ID,
          name: 'پخش اذان در برنامه',
          description: 'اعلان وضعیت پخش اذان در هنگام باز بودن برنامه',
          importance: 3, // Default
          visibility: 1,
          vibration: false
        });
      } catch (e) {
        console.warn('Failed to create Azan Active channel:', e);
      }

      // 3. Channel for Daily calendar info
      try {
        await LocalNotifications.createChannel({
          id: 'daily_calendar_channel',
          name: 'تقویم و تاریخ روز',
          description: 'نمایش روزانه تاریخ شمسی، قمری و میلادی در نوار اعلان',
          importance: 3, // Default
          visibility: 1,
          vibration: false
        });
      } catch (e) {
        console.warn('Failed to create Daily calendar channel:', e);
      }

      // 4. Channel for Reminders and Events
      try {
        await LocalNotifications.createChannel({
          id: 'reminders_channel',
          name: 'یادآوری‌ها و رویدادهای شخصی',
          description: 'اعلان سررسید چک، اقساط، تولد و مناسبت‌های شخصی',
          importance: 5, // High
          visibility: 1,
          vibration: true
        });
      } catch (e) {
        console.warn('Failed to create Reminders channel:', e);
      }

      if (!isNotificationActionListenerAttached) {
        LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
          const extra = notificationAction.notification.extra;
          if (extra && extra.prayerKey) {
            // Dispatch custom event to open the Azan modal in UI
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('open-azan-modal', { detail: extra }));
            }
          }
        });
        isNotificationActionListenerAttached = true;
      }
    } catch (e) {
      console.warn('Failed to init Capacitor local notification channels:', e);
    }
    return;
  }

  // Register Web Service Worker if available in browser
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.action === 'stop-azan') {
          import('./azanAudioEngine').then(({ azanAudioEngine }) => {
            azanAudioEngine.stop();
          });
        }
      });
    } catch {}
  }
}

export async function showDailyDateNotification(todayInfo: FullDateInfo, nextPrayer?: NextPrayerInfo | null) {
  const jalaliStr = `${todayInfo.dayOfWeekName} ${toPersianDigits(todayInfo.jalali.jd)} ${PERSIAN_MONTH_NAMES[todayInfo.jalali.jm - 1]} ${toPersianDigits(todayInfo.jalali.jy)}`;
  const gregorianStr = `${todayInfo.gregorian.gd} ${GREGORIAN_MONTH_NAMES[todayInfo.gregorian.gm - 1]} ${todayInfo.gregorian.gy}`;
  const hijriStr = `${toPersianDigits(todayInfo.hijri.hd)} ${HIJRI_MONTH_NAMES[todayInfo.hijri.hm - 1]} ${toPersianDigits(todayInfo.hijri.hy)}`;
  
  let prayerStr = '';
  if (nextPrayer) {
    prayerStr = ` | وقت شرعی بعدی: ${nextPrayer.name} (${toPersianDigits(nextPrayer.timeStr)})`;
  }

  const title = `🗓️ ${jalaliStr}`;
  const body = `☀️ میلادی: ${gregorianStr} | 🌙 قمری: ${hijriStr}${prayerStr}`;

  if (isCapacitorNative()) {
    try {
      const hasPerm = await hasNotificationPermission();
      if (!hasPerm) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 10001,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: 'daily_calendar_channel',
            smallIcon: 'ic_launcher'
          }
        ]
      });
    } catch (e) {
      console.warn('Native daily notification error:', e);
    }
    return;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const options = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'daily-calendar-date',
      renotify: false,
      silent: true
    };
    new Notification(title, options as NotificationOptions);
  } catch (err) {
    console.warn('Could not post daily notification:', err);
  }
}

export async function showAzanAlertNotification(prayerName: string, cityName: string, reciterName: string) {
  // If native Android Azan is enabled, AzanPlaybackService manages its own persistent foreground notification with stop button
  if (isNativeAzanAvailable()) {
    return;
  }

  const title = `🕌 هنگام ${prayerName} به افق ${cityName}`;
  const body = `نوای ملکوتی اذان با صوت ${reciterName} در حال پخش است. برای توقف یا مدیریت روی برنامه ضربه بزنید.`;

  if (isCapacitorNative()) {
    try {
      const hasPerm = await hasNotificationPermission();
      if (!hasPerm) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 20001,
            title,
            body,
            schedule: { at: new Date(Date.now() + 100) },
            channelId: AZAN_ACTIVE_CHANNEL_ID,
            smallIcon: 'ic_launcher'
          }
        ]
      });
    } catch (e) {
      console.warn('Native azan alert error:', e);
    }
    return;
  }

  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const options = {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'azan-playback-alert',
      renotify: true,
      requireInteraction: true
    };
    new Notification(title, options as NotificationOptions);
  } catch (err) {
    console.warn('Could not post azan notification:', err);
  }
}

// Convert reminder id string to deterministic integer for Capacitor notification id
// Uses dedicated range 50000-89999 to guarantee complete separation from Native Azan AlarmManager (40000-40200)
// and Web/Capacitor Azan notifications (30000-30313)
export function getDeterministicReminderNotificationId(reminderId: string, usedIds?: Set<number>): number {
  let hash = 0;
  for (let i = 0; i < reminderId.length; i++) {
    hash = (hash << 5) - hash + reminderId.charCodeAt(i);
    hash |= 0;
  }
  let candidate = Math.abs(hash % 40000) + 50000;
  if (usedIds) {
    let attempts = 0;
    while (usedIds.has(candidate) && attempts < 40000) {
      candidate = 50000 + ((candidate - 50000 + 1) % 40000);
      attempts++;
    }
    usedIds.add(candidate);
  }
  return candidate;
}

/**
 * Synchronize and schedule native alarms for all user reminders.
 */
/**
 * Validates and parses reminder time string into hour and minute.
 * If time is omitted or empty, returns default { hour: 9, minute: 0 }.
 * If time is provided but invalid (e.g. 25:90, 12:99, -1:30), returns null.
 */
export function parseReminderTime(time?: string | null): { hour: number; minute: number } | null {
  if (time === undefined || time === null) {
    return { hour: 9, minute: 0 };
  }
  const trimmed = time.trim();
  if (trimmed === '') {
    return { hour: 9, minute: 0 };
  }
  const timeStr = toEnglishDigits(trimmed);
  const parts = timeStr.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const [hStr, mStr] = parts.map(p => p.trim());
  if (!/^\d+$/.test(hStr) || !/^\d+$/.test(mStr)) {
    return null;
  }
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

export function isValidReminderTime(time?: string | null): boolean {
  return parseReminderTime(time) !== null;
}

export async function syncAllUserReminders(reminders: UserReminder[]): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    const hasPerm = await hasNotificationPermission();
    if (!hasPerm) return;

    const pending = await LocalNotifications.getPending();
    const reminderNotifIds = pending.notifications
      .filter(n => n.id >= 50000 && n.id < 90000)
      .map(n => ({ id: n.id }));

    if (reminderNotifIds.length > 0) {
      try {
        await LocalNotifications.cancel({ notifications: reminderNotifIds });
      } catch (e) {}
    }

    const notificationsToSchedule: LocalNotificationSchema[] = [];
    const usedIds = new Set<number>();
    const now = Date.now();

    for (const rem of reminders) {
      const isEnabled = rem.isEnabled ?? rem.enabled ?? true;
      if (!isEnabled) continue;

      const normKey = normalizeDateKey(rem.dateKey || '');
      const dateParts = normKey.split('-').map(Number);
      if (dateParts.length !== 3 || isNaN(dateParts[0]) || isNaN(dateParts[1]) || isNaN(dateParts[2])) continue;

      const jy = dateParts[0];
      const jm = dateParts[1];
      const jd = dateParts[2];
      if (!isValidJalali(jy, jm, jd)) continue;
      const g = jalaliToGregorian(jy, jm, jd);

      const parsedTime = parseReminderTime(rem.time);
      if (!parsedTime) continue;
      const { hour, minute } = parsedTime;

      const scheduleDate = new Date(g.gy, g.gm - 1, g.gd, hour, minute, 0, 0);

      if (scheduleDate.getTime() > now) {
        const notifId = getDeterministicReminderNotificationId(rem.id, usedIds);
        const categoryLabel = rem.type === 'birthday' ? '🎂 تولد و سالگرد' :
                              rem.type === 'bill' ? '💳 سررسید پرداخت' :
                              rem.type === 'event' ? '🗓️ رویداد' : '🔔 یادآوری';

        notificationsToSchedule.push({
          id: notifId,
          title: `${categoryLabel}: ${rem.title}`,
          body: `یادآوری موعد: ساعت ${toPersianDigits(`${hour < 10 ? '0' + hour : hour}:${minute < 10 ? '0' + minute : minute}`)}`,
          schedule: { at: scheduleDate, allowWhileIdle: true },
          channelId: 'reminders_channel',
          smallIcon: 'ic_launcher',
          extra: {
            reminderId: rem.id,
            dateKey: normKey
          }
        });
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
    }
  } catch (e) {
    console.warn('Failed to sync user reminders notifications:', e);
  }
}

