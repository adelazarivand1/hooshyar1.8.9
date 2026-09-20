import { 
  UserNote, 
  UserTask, 
  UserReminder, 
  ExpenseItem, 
  DebtItem, 
  DebtPayment,
  CalendarSettings 
} from '../types/calendar';
import { normalizeDateKey } from './persianNumber';

export const DEFAULT_SETTINGS: CalendarSettings = {
  selectedCityId: 'tehran',
  hijriAdjustment: 0,
  showHijriInCells: true,
  showGregorianInCells: true,
  theme: 'light',
  colorTheme: 'persianRose',
  fontFamily: 'vazir',
  autoAzanEnabled: true,
  azanAlarmFajr: true,
  azanAlarmDhuhr: true,
  azanAlarmMaghrib: true,
  azanReciter: 'moazenzadeh',
  dailyNotificationEnabled: true,
  customEvents: []
};

export const STORAGE_KEYS = {
  SETTINGS: 'hooshyar_settings_v3',
  NOTES: 'hooshyar_notes_v3',
  TASKS: 'hooshyar_tasks_v3',
  REMINDERS: 'hooshyar_reminders_v3',
  EXPENSES: 'hooshyar_expenses_v3',
  DEBTS: 'hooshyar_debts_v3',
  QURAN_BOOKMARKS: 'hooshyar_quran_bookmarks_v1',
  SHIA_BOOKMARKS: 'hooshyar_shia_bookmarks_v1',
  HAS_SEEN_WELCOME: 'hooshyar_seen_welcome_v1',
  MIGRATION_VERSION: 'hooshyar_migration_v3_done'
} as const;

// Legacy keys to migrate from seamlessly without data loss
const LEGACY_KEYS = {
  SETTINGS: ['persian_calendar_settings_v3', 'yar_man_calendar_settings', 'adel_calendar_settings'],
  NOTES: ['persian_calendar_notes_v3', 'yar_man_calendar_notes', 'adel_calendar_notes'],
  TASKS: ['persian_calendar_tasks_v3', 'yar_man_calendar_tasks', 'adel_calendar_tasks'],
  REMINDERS: ['persian_calendar_reminders_v3', 'yar_man_calendar_reminders', 'adel_calendar_reminders'],
  EXPENSES: ['persian_calendar_expenses_v3', 'yar_man_calendar_expenses', 'adel_calendar_finances', 'adel_calendar_expenses'],
  DEBTS: ['persian_calendar_debts_v3', 'yar_man_calendar_debts', 'adel_calendar_debts'],
  QURAN_BOOKMARKS: ['quran_bookmarks'],
  SHIA_BOOKMARKS: ['shia_bookmarks']
};

/**
 * Automatically migrates existing user data from older key variations to unified v3 keys.
 */
export function runStorageMigrationIfNeeded(): void {
  if (typeof window === 'undefined') return;
  try {
    const isMigrated = localStorage.getItem(STORAGE_KEYS.MIGRATION_VERSION);
    if (isMigrated === 'true') return;

    // Migrate Settings
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      for (const oldKey of LEGACY_KEYS.SETTINGS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.SETTINGS, val);
          break;
        }
      }
    }

    // Migrate Notes
    if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
      for (const oldKey of LEGACY_KEYS.NOTES) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.NOTES, val);
          break;
        }
      }
    }

    // Migrate Tasks
    if (!localStorage.getItem(STORAGE_KEYS.TASKS)) {
      for (const oldKey of LEGACY_KEYS.TASKS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.TASKS, val);
          break;
        }
      }
    }

    // Migrate Reminders
    if (!localStorage.getItem(STORAGE_KEYS.REMINDERS)) {
      for (const oldKey of LEGACY_KEYS.REMINDERS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.REMINDERS, val);
          break;
        }
      }
    }

    // Migrate Expenses
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      for (const oldKey of LEGACY_KEYS.EXPENSES) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.EXPENSES, val);
          break;
        }
      }
    }

    // Migrate Debts
    if (!localStorage.getItem(STORAGE_KEYS.DEBTS)) {
      for (const oldKey of LEGACY_KEYS.DEBTS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.DEBTS, val);
          break;
        }
      }
    }

    // Migrate Bookmarks
    if (!localStorage.getItem(STORAGE_KEYS.QURAN_BOOKMARKS)) {
      for (const oldKey of LEGACY_KEYS.QURAN_BOOKMARKS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.QURAN_BOOKMARKS, val);
          break;
        }
      }
    }

    if (!localStorage.getItem(STORAGE_KEYS.SHIA_BOOKMARKS)) {
      for (const oldKey of LEGACY_KEYS.SHIA_BOOKMARKS) {
        const val = localStorage.getItem(oldKey);
        if (val) {
          localStorage.setItem(STORAGE_KEYS.SHIA_BOOKMARKS, val);
          break;
        }
      }
    }

    localStorage.setItem(STORAGE_KEYS.MIGRATION_VERSION, 'true');
  } catch (err) {
    console.warn('Storage migration warning:', err);
  }
}

// Initial migration execution on script load
runStorageMigrationIfNeeded();

// --- Settings ---
export function getStoredSettings(): CalendarSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load settings from storage', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveStoredSettings(settings: CalendarSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings to storage', e);
  }
}

/**
 * Normalizes valid Jalali date strings into canonical YYYY-MM-DD format.
 * If the input is not a valid Jalali date, preserves the original trimmed string
 * to prevent data loss.
 */
function normalizeCanonicalDateKey(val?: unknown): string {
  if (typeof val !== 'string') return '';
  const trimmed = val.trim();
  if (!trimmed) return '';
  const norm = normalizeDateKey(trimmed);
  return (/^\d{4}-\d{2}-\d{2}$/.test(norm)) ? norm : trimmed;
}

// --- Notes ---
export function getStoredNotes(): UserNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(n => n && typeof n === 'object')
          .map((n, idx) => {
            const body = typeof n.content === 'string' ? n.content : (typeof n.text === 'string' ? n.text : '');
            return {
              id: n.id || `note_${Date.now()}_${idx}`,
              dateKey: normalizeCanonicalDateKey(n.dateKey),
              title: typeof n.title === 'string' ? n.title : '',
              content: body,
              color: typeof n.color === 'string' ? n.color : undefined,
              category: typeof n.category === 'string' ? n.category : undefined,
              createdAt: typeof n.createdAt === 'number' ? n.createdAt : Date.now(),
              updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : Date.now()
            };
          })
          .filter(n => n.content.trim().length > 0 || n.title.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load notes from storage', e);
  }
  return [];
}

export function saveStoredNotes(notes: UserNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  } catch (e) {
    console.error('Failed to save notes to storage', e);
  }
}

// --- Tasks ---
export function getStoredTasks(): UserTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(t => t && typeof t === 'object')
          .map((t, idx) => ({
            id: t.id || `task_${Date.now()}_${idx}`,
            dateKey: normalizeCanonicalDateKey(t.dateKey),
            text: typeof t.text === 'string' ? t.text : '',
            completed: Boolean(t.completed),
            priority: t.priority === 'high' || t.priority === 'low' ? t.priority : 'medium',
            createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now()
          }))
          .filter(t => t.text.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load tasks from storage', e);
  }
  return [];
}

export function saveStoredTasks(tasks: UserTask[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  } catch (e) {
    console.error('Failed to save tasks to storage', e);
  }
}

// --- Reminders ---
export function getStoredReminders(): UserReminder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(r => r && typeof r === 'object')
          .map((r, idx) => {
            const isYearly = r.repeatYearly === true || r.repeat === 'yearly';
            return {
              id: r.id || `rem_${Date.now()}_${idx}`,
              dateKey: normalizeCanonicalDateKey(r.dateKey),
              time: typeof r.time === 'string' ? r.time : undefined,
              title: typeof r.title === 'string' ? r.title : '',
              type: (r.type === 'birthday' || r.type === 'bill' || r.type === 'event') ? r.type : 'reminder',
              category: (r.category || r.type || 'reminder') as any,
              repeatYearly: isYearly ? true : (typeof r.repeatYearly === 'boolean' ? r.repeatYearly : undefined),
              repeat: isYearly ? 'yearly' : ((r.repeat === 'monthly' || r.repeat === 'weekly') ? r.repeat : 'none'),
              enabled: typeof r.enabled === 'boolean' ? r.enabled : (typeof r.isEnabled === 'boolean' ? r.isEnabled : true),
              isEnabled: typeof r.isEnabled === 'boolean' ? r.isEnabled : (typeof r.enabled === 'boolean' ? r.enabled : true),
              notificationId: typeof r.notificationId === 'number' ? r.notificationId : undefined,
              notes: typeof r.notes === 'string' ? r.notes : undefined,
              createdAt: typeof r.createdAt === 'number' ? r.createdAt : Date.now()
            };
          })
          .filter(r => r.title.trim().length > 0 && r.dateKey.trim().length > 0 && Boolean(normalizeDateKey(r.dateKey)));
      }
    }
  } catch (e) {
    console.error('Failed to load reminders from storage', e);
  }
  return [];
}

export function saveStoredReminders(reminders: UserReminder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
  } catch (e) {
    console.error('Failed to save reminders to storage', e);
  }
}

// --- Expenses ---
export function getStoredExpenses(): ExpenseItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(e => e && typeof e === 'object')
          .map((e, idx) => {
            const numAmount = typeof e.amount === 'number' ? e.amount : parseFloat(String(e.amount || 0).replace(/,/g, ''));
            const itemType: 'income' | 'expense' = e.type === 'income' ? 'income' : 'expense';
            return {
              id: e.id || `exp_${Date.now()}_${idx}`,
              dateKey: normalizeCanonicalDateKey(e.dateKey),
              amount: isNaN(numAmount) ? 0 : Math.max(0, numAmount),
              type: itemType,
              category: typeof e.category === 'string' && e.category.trim() ? e.category.trim() : 'سایر',
              description: typeof e.description === 'string' ? e.description : ''
            };
          })
          .filter(e => e.amount > 0 || e.description.trim().length > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load expenses from storage', e);
  }
  return [];
}

export function saveStoredExpenses(expenses: ExpenseItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
  } catch (e) {
    console.error('Failed to save expenses to storage', e);
  }
}

// --- Debts ---
export function getStoredDebts(): DebtItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DEBTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(d => d && typeof d === 'object')
          .map((d, idx) => {
            const numAmount = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount || 0).replace(/,/g, ''));
            const safeAmount = isNaN(numAmount) ? 0 : Math.max(0, numAmount);

            const rawPayments = Array.isArray(d.payments) ? d.payments : [];
            const safePayments: DebtPayment[] = rawPayments
              .filter((p: unknown): p is Record<string, unknown> => p !== null && typeof p === 'object')
              .map((p, pIdx: number) => {
                const pNum = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || 0).replace(/,/g, ''));
                return {
                  id: (typeof p.id === 'string' && p.id) ? p.id : `pay_${Date.now()}_${pIdx}`,
                  amount: isNaN(pNum) ? 0 : Math.max(0, pNum),
                  dateKey: normalizeCanonicalDateKey(p.dateKey),
                  note: typeof p.note === 'string' ? p.note : undefined,
                  createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now()
                };
              });

            const paymentsSum = safePayments.reduce((acc, p) => acc + p.amount, 0);
            const numSettled = typeof d.settledAmount === 'number' ? d.settledAmount : paymentsSum;
            const safeSettled = isNaN(numSettled) ? paymentsSum : Math.max(0, numSettled);
            const isSettled = typeof d.isSettled === 'boolean' ? d.isSettled : (safeSettled >= safeAmount && safeAmount > 0);
            const debtType: 'debt' | 'credit' = d.type === 'debt' ? 'debt' : 'credit';

            return {
              id: d.id || `debt_${Date.now()}_${idx}`,
              type: debtType,
              personName: typeof d.personName === 'string' ? d.personName.trim() : 'بدون نام',
              phone: typeof d.phone === 'string' ? d.phone : undefined,
              amount: safeAmount,
              settledAmount: safeSettled,
              isSettled,
              category: typeof d.category === 'string' ? d.category : 'سایر موارد',
              startDate: normalizeCanonicalDateKey(d.startDate),
              dueDate: typeof d.dueDate === 'string' && d.dueDate.trim().length > 0 
                ? normalizeCanonicalDateKey(d.dueDate) 
                : undefined,
              description: typeof d.description === 'string' ? d.description : undefined,
              payments: safePayments,
              createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now()
            };
          })
          .filter(d => d.personName.length > 0 && d.amount > 0);
      }
    }
  } catch (e) {
    console.error('Failed to load debts from storage', e);
  }
  return [];
}

export function saveStoredDebts(debts: DebtItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(debts));
  } catch (e) {
    console.error('Failed to save debts to storage', e);
  }
}

// --- Quran Bookmarks ---
export function getStoredQuranBookmarks(): number[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QURAN_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load Quran bookmarks', e);
  }
  return [];
}

export function saveStoredQuranBookmarks(bookmarks: number[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.QURAN_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save Quran bookmarks', e);
  }
}

// --- Shia Bookmarks ---
export function getStoredShiaBookmarks(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHIA_BOOKMARKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load Shia bookmarks', e);
  }
  return [];
}

export function saveStoredShiaBookmarks(bookmarks: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SHIA_BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {
    console.error('Failed to save Shia bookmarks', e);
  }
}

// --- Welcome Modal Status ---
export function getHasSeenWelcome(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME) === 'true';
}

export function setHasSeenWelcome(seen: boolean = true): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.HAS_SEEN_WELCOME, seen ? 'true' : 'false');
  } catch {}
}

// --- Backup & Restore Structure ---
export interface HooshyarBackupPayload {
  app: 'هوشیار';
  schemaVersion: '3.1';
  exportDate: string;
  data: {
    settings: CalendarSettings;
    notes: UserNote[];
    tasks: UserTask[];
    reminders: UserReminder[];
    expenses: ExpenseItem[];
    debts: DebtItem[];
    quranBookmarks: number[];
    shiaBookmarks: string[];
  };
}

/**
 * Creates a comprehensive, schema-versioned backup payload of all user data.
 */
export function createBackupPayload(): HooshyarBackupPayload {
  return {
    app: 'هوشیار',
    schemaVersion: '3.1',
    exportDate: new Date().toISOString(),
    data: {
      settings: getStoredSettings(),
      notes: getStoredNotes(),
      tasks: getStoredTasks(),
      reminders: getStoredReminders(),
      expenses: getStoredExpenses(),
      debts: getStoredDebts(),
      quranBookmarks: getStoredQuranBookmarks(),
      shiaBookmarks: getStoredShiaBookmarks()
    }
  };
}

export interface RestoreResult {
  success: boolean;
  message: string;
  itemCounts?: {
    notes: number;
    tasks: number;
    reminders: number;
    expenses: number;
    debts: number;
  };
  restoredData?: HooshyarBackupPayload['data'];
}

/**
 * Validates and restores a backup JSON string or object, supporting backward compatibility.
 */
export function validateAndRestoreBackup(jsonString: string): RestoreResult {
  try {
    const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'ساختار فایل پشتیبان نامعتبر است.' };
    }

    // Validate authentic Hooshyar payload structure before any mutation
    const isV31 = (parsed.app === 'هوشیار' || Boolean(parsed.schemaVersion)) && parsed.data && typeof parsed.data === 'object';
    const isLegacy = !isV31 && Boolean(
      parsed.settings ||
      parsed.userNotes ||
      parsed.notes ||
      parsed.userTasks ||
      parsed.tasks ||
      parsed.userReminders ||
      parsed.reminders ||
      parsed.userFinances ||
      parsed.expenses ||
      parsed.debts ||
      parsed.userDebts ||
      parsed.persian_calendar_settings_v3
    );

    if (!isV31 && !isLegacy) {
      return {
        success: false,
        message: 'فایل انتخابی یک فایل پشتیبان معتبر هوشیار نیست و داده‌های فعلی بدون تغییر حفظ شدند.'
      };
    }

    let settings: CalendarSettings = getStoredSettings();
    let notes: UserNote[] = getStoredNotes();
    let tasks: UserTask[] = getStoredTasks();
    let reminders: UserReminder[] = getStoredReminders();
    let expenses: ExpenseItem[] = getStoredExpenses();
    let debts: DebtItem[] = getStoredDebts();
    let quranBookmarks: number[] = getStoredQuranBookmarks();
    let shiaBookmarks: string[] = getStoredShiaBookmarks();

    // Format v3.1: contains parsed.data object
    if (parsed.data && typeof parsed.data === 'object') {
      const d = parsed.data;
      if (d.settings) settings = { ...DEFAULT_SETTINGS, ...d.settings };
      if (Array.isArray(d.notes)) notes = d.notes;
      if (Array.isArray(d.tasks)) tasks = d.tasks;
      if (Array.isArray(d.reminders)) reminders = d.reminders;
      if (Array.isArray(d.expenses)) expenses = d.expenses;
      if (Array.isArray(d.debts)) debts = d.debts;
      if (Array.isArray(d.quranBookmarks)) quranBookmarks = d.quranBookmarks;
      if (Array.isArray(d.shiaBookmarks)) shiaBookmarks = d.shiaBookmarks;
    } else {
      // Legacy Format Support (e.g. flat keys or old naming)
      if (parsed.settings) settings = { ...DEFAULT_SETTINGS, ...parsed.settings };
      if (Array.isArray(parsed.userNotes || parsed.notes)) notes = parsed.userNotes || parsed.notes;
      if (Array.isArray(parsed.userTasks || parsed.tasks)) tasks = parsed.userTasks || parsed.tasks;
      if (Array.isArray(parsed.userReminders || parsed.reminders)) reminders = parsed.userReminders || parsed.reminders;
      if (Array.isArray(parsed.userFinances || parsed.expenses)) expenses = parsed.userFinances || parsed.expenses;
      if (Array.isArray(parsed.debts || parsed.userDebts)) debts = parsed.debts || parsed.userDebts;
      if (Array.isArray(parsed.quranBookmarks)) quranBookmarks = parsed.quranBookmarks;
      if (Array.isArray(parsed.shiaBookmarks)) shiaBookmarks = parsed.shiaBookmarks;
    }

    // Persist restored data
    saveStoredSettings(settings);
    saveStoredNotes(notes);
    saveStoredTasks(tasks);
    saveStoredReminders(reminders);
    saveStoredExpenses(expenses);
    saveStoredDebts(debts);
    saveStoredQuranBookmarks(quranBookmarks);
    saveStoredShiaBookmarks(shiaBookmarks);

    // Retrieve cleanly normalized and sanitized versions
    const cleanSettings = getStoredSettings();
    const cleanNotes = getStoredNotes();
    const cleanTasks = getStoredTasks();
    const cleanReminders = getStoredReminders();
    const cleanExpenses = getStoredExpenses();
    const cleanDebts = getStoredDebts();
    const cleanQuranBookmarks = getStoredQuranBookmarks();
    const cleanShiaBookmarks = getStoredShiaBookmarks();

    // Re-save cleanly sanitized versions to ensure stored JSON is normalized
    saveStoredNotes(cleanNotes);
    saveStoredTasks(cleanTasks);
    saveStoredReminders(cleanReminders);
    saveStoredExpenses(cleanExpenses);
    saveStoredDebts(cleanDebts);

    return {
      success: true,
      message: 'بازیابی اطلاعات با موفقیت انجام شد.',
      itemCounts: {
        notes: cleanNotes.length,
        tasks: cleanTasks.length,
        reminders: cleanReminders.length,
        expenses: cleanExpenses.length,
        debts: cleanDebts.length
      },
      restoredData: {
        settings: cleanSettings,
        notes: cleanNotes,
        tasks: cleanTasks,
        reminders: cleanReminders,
        expenses: cleanExpenses,
        debts: cleanDebts,
        quranBookmarks: cleanQuranBookmarks,
        shiaBookmarks: cleanShiaBookmarks
      }
    };
  } catch (err: any) {
    return {
      success: false,
      message: `خطا در بازخوانی فایل پشتیبان: ${err?.message || 'قالب فایل نامعتبر است'}`
    };
  }
}

/**
 * Resets all user data safely and clears storage.
 */
export function resetAllStorageData(): void {
  if (typeof window === 'undefined') return;
  try {
    Object.values(STORAGE_KEYS).forEach(k => {
      localStorage.removeItem(k);
    });
    // Also clean any legacy keys
    Object.values(LEGACY_KEYS).forEach(list => {
      list.forEach(k => localStorage.removeItem(k));
    });
  } catch (e) {
    console.error('Failed to reset storage data', e);
  }
}

// Aliases for compatibility
export const loadSettings = getStoredSettings;
export const saveSettings = saveStoredSettings;
export const loadNotes = getStoredNotes;
export const saveNotes = saveStoredNotes;
export const loadTasks = getStoredTasks;
export const saveTasks = saveStoredTasks;
export const loadReminders = getStoredReminders;
export const saveReminders = saveStoredReminders;
export const loadExpenses = getStoredExpenses;
export const saveExpenses = saveStoredExpenses;
export const loadDebts = getStoredDebts;
export const saveDebts = saveStoredDebts;
