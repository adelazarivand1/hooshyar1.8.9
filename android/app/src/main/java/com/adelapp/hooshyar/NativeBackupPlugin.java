package com.adelapp.hooshyar;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "NativeBackup")
public class NativeBackupPlugin extends Plugin {

    private static final String TAG = "NativeBackupPlugin";
    private String pendingDataToSave = null;

    @PluginMethod
    public void saveBackupFile(PluginCall call) {
        try {
            String fileName = call.getString("fileName", "hooshyar-backup.json");
            String content = call.getString("content");

            if (content == null || content.isEmpty()) {
                call.reject("محتوای فایل پشتیبان خالی است.");
                return;
            }

            pendingDataToSave = content;

            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, fileName);

            startActivityForResult(call, intent, "saveFileResult");
        } catch (Exception e) {
            Log.e(TAG, "Error starting save file intent", e);
            call.reject("خطا در باز کردن پنجره ذخیره‌سازی اندروید: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    public void saveFileResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        try {
            if (result.getResultCode() == Activity.RESULT_CANCELED) {
                JSObject ret = new JSObject();
                ret.put("status", "canceled");
                ret.put("message", "عملیات ذخیره فایل توسط کاربر لغو شد.");
                call.resolve(ret);
                return;
            }

            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                Uri uri = result.getData().getData();
                if (uri != null) {
                    if (pendingDataToSave == null) {
                        call.reject("محتوای پشتیبان در حافظه موقت یافت نشد.");
                        return;
                    }

                    try (OutputStream outputStream = getContext().getContentResolver().openOutputStream(uri, "wt")) {
                        if (outputStream == null) {
                            call.reject("امکان دسترسی به مسیر ذخیره‌سازی انتخاب شده وجود ندارد.");
                            return;
                        }
                        byte[] bytes = pendingDataToSave.getBytes(StandardCharsets.UTF_8);
                        outputStream.write(bytes);
                        outputStream.flush();

                        JSObject ret = new JSObject();
                        ret.put("status", "success");
                        ret.put("uri", uri.toString());
                        ret.put("message", "فایل پشتیبان با موفقیت در محل انتخابی ذخیره شد.");
                        call.resolve(ret);
                        return;
                    } catch (Exception writeEx) {
                        Log.e(TAG, "Error writing data to URI: " + uri, writeEx);
                        call.reject("خطا در نوشتن اطلاعات روی فایل در حافظه: " + writeEx.getMessage(), writeEx);
                        return;
                    }
                }
            }

            call.reject("مسیر فایل معتبر از انتخاب‌گر حافظه دریافت نشد.");
        } catch (Exception ex) {
            Log.e(TAG, "Unexpected error in saveFileResult", ex);
            call.reject("خطای سیستمی در فرآیند ذخیره‌سازی: " + ex.getMessage(), ex);
        } finally {
            pendingDataToSave = null;
        }
    }

    @PluginMethod
    public void readBackupFile(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("*/*");
            String[] mimeTypes = {"application/json", "text/plain", "application/octet-stream", "*/*"};
            intent.putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes);

            startActivityForResult(call, intent, "readFileResult");
        } catch (Exception e) {
            Log.e(TAG, "Error starting open file intent", e);
            call.reject("خطا در باز کردن انتخاب‌گر فایل اندروید: " + e.getMessage(), e);
        }
    }

    @ActivityCallback
    public void readFileResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            return;
        }

        try {
            if (result.getResultCode() == Activity.RESULT_CANCELED) {
                JSObject ret = new JSObject();
                ret.put("status", "canceled");
                ret.put("message", "انتخاب فایل لغو شد.");
                call.resolve(ret);
                return;
            }

            if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
                Uri uri = result.getData().getData();
                if (uri != null) {
                    String fileName = getFileNameFromUri(uri);
                    try (InputStream inputStream = getContext().getContentResolver().openInputStream(uri);
                         BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {

                        StringBuilder stringBuilder = new StringBuilder();
                        String line;
                        while ((line = reader.readLine()) != null) {
                            stringBuilder.append(line).append("\n");
                        }

                        JSObject ret = new JSObject();
                        ret.put("status", "success");
                        ret.put("content", stringBuilder.toString());
                        ret.put("fileName", fileName);
                        ret.put("uri", uri.toString());
                        call.resolve(ret);
                        return;
                    } catch (Exception readEx) {
                        Log.e(TAG, "Error reading data from URI: " + uri, readEx);
                        call.reject("خطا در خواندن محتوای فایل پشتیبان: " + readEx.getMessage(), readEx);
                        return;
                    }
                }
            }

            call.reject("فایلی انتخاب نشد.");
        } catch (Exception ex) {
            Log.e(TAG, "Unexpected error in readFileResult", ex);
            call.reject("خطای سیستمی در خواندن فایل: " + ex.getMessage(), ex);
        }
    }

    private String getFileNameFromUri(Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        result = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception ignored) {}
        }
        if (result == null) {
            result = uri.getLastPathSegment();
        }
        return result != null ? result : "hooshyar-backup.json";
    }
}
