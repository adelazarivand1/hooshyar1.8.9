import { Capacitor, registerPlugin } from '@capacitor/core';
import { createBackupPayload, HooshyarBackupPayload } from './storage';
import { getTodayJalali } from './jalali';

export interface NativeBackupPluginInterface {
  saveBackupFile(options: { fileName: string; content: string }): Promise<{
    status: 'success' | 'canceled';
    uri?: string;
    message?: string;
  }>;
  readBackupFile(): Promise<{
    status: 'success' | 'canceled';
    content?: string;
    fileName?: string;
    uri?: string;
    message?: string;
  }>;
}

export const NativeBackup = registerPlugin<NativeBackupPluginInterface>('NativeBackup');

export interface BackupExportResult {
  success: boolean;
  isCanceled?: boolean;
  message: string;
  fileName: string;
  filePath?: string;
  isNative: boolean;
  itemCounts?: {
    notes: number;
    tasks: number;
    reminders: number;
    expenses: number;
    debts: number;
  };
  error?: string;
}

/**
 * Generates a unique, meaningful, timestamped backup file name.
 * Format: hooshyar-backup-YYYY-MM-DD_HH-mm.json
 */
export function generateBackupFileName(): string {
  const today = getTodayJalali();
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const jy = today.jy;
  const jm = pad(today.jm);
  const jd = pad(today.jd);
  const hour = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `hooshyar-backup-${jy}-${jm}-${jd}_${hour}-${min}.json`;
}

/**
 * Exports user data backup:
 * - On Native Android (Capacitor): Uses Android Storage Access Framework (ACTION_CREATE_DOCUMENT)
 *   via NativeBackupPlugin, allowing the user to choose their preferred folder (Downloads, Drive, SD Card, etc.)
 *   and writes the JSON file directly into user storage with real UTF-8 encoding.
 * - On Web Browser: Uses standard client Blob download anchor.
 */
export async function exportBackupFile(): Promise<BackupExportResult> {
  const fileName = generateBackupFileName();
  let backupPayload: HooshyarBackupPayload;
  let jsonStr: string;

  try {
    backupPayload = createBackupPayload();
    jsonStr = JSON.stringify(backupPayload, null, 2);
  } catch (err: any) {
    console.error('[BackupService] Failed to generate backup payload:', err);
    return {
      success: false,
      message: `خطا در ایجاد ساختار پشتیبان: ${err?.message || 'خطای ناشناخته'}`,
      fileName,
      isNative: Capacitor.isNativePlatform(),
      error: String(err)
    };
  }

  const itemCounts = {
    notes: backupPayload.data.notes?.length || 0,
    tasks: backupPayload.data.tasks?.length || 0,
    reminders: backupPayload.data.reminders?.length || 0,
    expenses: backupPayload.data.expenses?.length || 0,
    debts: backupPayload.data.debts?.length || 0
  };

  // 1. Android Native Platform implementation via Storage Access Framework
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await NativeBackup.saveBackupFile({
        fileName,
        content: jsonStr
      });

      if (result.status === 'canceled') {
        return {
          success: false,
          isCanceled: true,
          message: 'عملیات ذخیره فایل لغو شد.',
          fileName,
          isNative: true
        };
      }

      if (result.status === 'success') {
        return {
          success: true,
          message: `فایل پشتیبان با نام «${fileName}» با موفقیت در محل انتخابی شما ذخیره شد.`,
          fileName,
          filePath: result.uri,
          isNative: true,
          itemCounts
        };
      }

      throw new Error(result.message || 'پاسخ نامشخص از سیستم‌عامل');
    } catch (nativeErr: any) {
      console.error('[BackupService] Native Android backup save failed:', nativeErr);
      return {
        success: false,
        message: `خطا در ذخیره‌سازی فایل پشتیبان در حافظه دستگاه: ${nativeErr?.message || String(nativeErr)}`,
        fileName,
        isNative: true,
        error: String(nativeErr)
      };
    }
  }

  // 2. Web Browser Fallback Implementation (Standard Blob Download)
  try {
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = url;
    downloadAnchor.download = fileName;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();

    setTimeout(() => {
      if (downloadAnchor.parentNode) {
        downloadAnchor.parentNode.removeChild(downloadAnchor);
      }
      URL.revokeObjectURL(url);
    }, 250);

    return {
      success: true,
      message: `فایل پشتیبان با موفقیت ایجاد و دانلود شد (${fileName}).`,
      fileName,
      isNative: false,
      itemCounts
    };
  } catch (webErr: any) {
    console.error('[BackupService] Browser download failed:', webErr);
    return {
      success: false,
      message: `خطا در دانلود فایل در مرورگر: ${webErr?.message || 'خطای سیستمی'}`,
      fileName,
      isNative: false,
      error: String(webErr)
    };
  }
}
