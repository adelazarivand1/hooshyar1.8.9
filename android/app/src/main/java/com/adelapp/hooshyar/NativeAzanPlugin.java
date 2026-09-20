package com.adelapp.hooshyar;

import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Capacitor Plugin bridging JavaScript/React Azan configuration to native Android.
 */
@CapacitorPlugin(name = "NativeAzan")
public class NativeAzanPlugin extends Plugin {
    private static final String TAG = "NativeAzanPlugin";
    private static volatile NativeAzanPlugin sInstance;

    @Override
    public void load() {
        super.load();
        sInstance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (sInstance == this) {
            sInstance = null;
        }
        super.handleOnDestroy();
    }

    public static void notifyPlaybackState(boolean isPlaying, String prayerName, String reciterId) {
        try {
            if (sInstance != null) {
                JSObject ret = new JSObject();
                ret.put("isPlaying", isPlaying);
                ret.put("prayerName", prayerName != null ? prayerName : "");
                ret.put("reciterId", reciterId != null ? reciterId : "");
                sInstance.notifyListeners("playbackStateChanged", ret);
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to notify playback state listener", e);
        }
    }

    @PluginMethod
    public void scheduleAlarms(PluginCall call) {
        try {
            boolean autoAzanEnabled = call.getBoolean("autoAzanEnabled", true);
            if (!autoAzanEnabled) {
                AzanAlarmManager.disableAzan(getContext());
                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("count", 0);
                ret.put("exact", AzanAlarmManager.canScheduleExactAlarms(getContext()));
                ret.put("scheduleMode", "DISABLED");
                call.resolve(ret);
                return;
            }

            JSArray alarmsArray = call.getArray("alarms");
            String reciterId = call.getString("reciterId", "moazenzadeh");
            String cityName = call.getString("cityName", "تهران");

            if (alarmsArray == null) {
                call.reject("Alarms array is required");
                return;
            }

            List<AzanAlarmManager.AlarmEntry> entries = new ArrayList<>();
            for (int i = 0; i < alarmsArray.length(); i++) {
                JSONObject obj = alarmsArray.getJSONObject(i);
                AzanAlarmManager.AlarmEntry entry = new AzanAlarmManager.AlarmEntry();
                entry.id = obj.optInt("id", AzanAlarmManager.BASE_ALARM_ID + i + 1);
                entry.triggerAtMillis = obj.optLong("timeMillis", 0);
                entry.prayerKey = obj.optString("prayerKey", "fajr");
                entry.prayerName = obj.optString("prayerName", "اذان");
                entry.cityName = obj.optString("cityName", cityName);
                entry.reciterId = obj.optString("reciterId", reciterId);

                if (entry.triggerAtMillis > 0) {
                    entries.add(entry);
                }
            }

            Double latitude = call.getDouble("latitude", Double.NaN);
            Double longitude = call.getDouble("longitude", Double.NaN);
            Double timezone = call.getDouble("timezone", Double.NaN);
            boolean fajrEnabled = call.getBoolean("fajrEnabled", true);
            boolean dhuhrEnabled = call.getBoolean("dhuhrEnabled", true);
            boolean maghribEnabled = call.getBoolean("maghribEnabled", true);

            int count = AzanAlarmManager.scheduleAlarms(
                    getContext(),
                    entries,
                    reciterId,
                    cityName,
                    latitude != null ? latitude : Double.NaN,
                    longitude != null ? longitude : Double.NaN,
                    timezone != null ? timezone : Double.NaN,
                    fajrEnabled,
                    dhuhrEnabled,
                    maghribEnabled
            );
            boolean exactPermitted = AzanAlarmManager.canScheduleExactAlarms(getContext());

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("count", count);
            ret.put("exact", exactPermitted);
            ret.put("scheduleMode", exactPermitted ? "EXACT" : "INEXACT_FALLBACK");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in scheduleAlarms", e);
            call.reject("خطا در زمان‌بندی اذان در اندروید: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelAllAlarms(PluginCall call) {
        try {
            AzanAlarmManager.disableAzan(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in cancelAllAlarms", e);
            call.reject("خطا در لغو هشدارهای اذان: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void stopPlayback(PluginCall call) {
        try {
            AzanPlaybackService.stopPlayback(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in stopPlayback", e);
            call.reject("خطا در توقف پخش اذان: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void isPlaybackActive(PluginCall call) {
        try {
            boolean active = AzanPlaybackService.isPlaybackActive();
            String prayer = AzanPlaybackService.getCurrentPrayerName();
            String reciter = AzanPlaybackService.getCurrentReciterId();

            JSObject ret = new JSObject();
            ret.put("isPlaying", active);
            ret.put("prayerName", prayer);
            ret.put("reciterId", reciter);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in isPlaybackActive", e);
            JSObject ret = new JSObject();
            ret.put("isPlaying", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        try {
            boolean canExact = AzanAlarmManager.canScheduleExactAlarms(getContext());
            JSObject ret = new JSObject();
            ret.put("canExact", canExact);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("canExact", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                android.content.Intent intent = new android.content.Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Failed to open exact alarm settings", e);
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }
}
