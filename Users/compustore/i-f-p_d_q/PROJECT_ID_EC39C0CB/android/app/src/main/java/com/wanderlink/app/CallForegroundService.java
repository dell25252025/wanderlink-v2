package com.wanderlink.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class CallForegroundService extends Service {

    private static final String TAG = "CallForegroundService";
    private static final String CHANNEL_ID = "incoming_call_channel";
    private static final int NOTIFICATION_ID = 999;

    private Ringtone ringtone;
    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WanderLink::CallWakeLock");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String callId = intent.getStringExtra("callId");
        String callerName = intent.getStringExtra("callerName");
        String channelName = intent.getStringExtra("channel");

        Log.d(TAG, "Service started for call: " + callId);

        // Acquire WakeLock
        if (!wakeLock.isHeld()) {
            wakeLock.acquire(30*1000L /*30 seconds timeout*/);
        }

        // Play Ringtone
        try {
            Uri notificationSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(this, notificationSoundUri);
            if (ringtone != null) {
                ringtone.setLooping(true);
                ringtone.play();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing ringtone", e);
        }
        
        // Build Notification
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        fullScreenIntent.putExtra("callAction", "accept");
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("channel", channelName);
        
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 101, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Decline action
        Intent declineIntent = new Intent(this, MainActivity.class);
        declineIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        declineIntent.putExtra("callAction", "reject");
        declineIntent.putExtra("callId", callId);
        PendingIntent declinePendingIntent = PendingIntent.getActivity(this, 102, declineIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Action declineAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_call_end, "Refuser", declinePendingIntent
        ).build();

        // Accept action
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        acceptIntent.putExtra("callAction", "accept");
        acceptIntent.putExtra("callId", callId);
        acceptIntent.putExtra("channel", channelName);
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(this, 103, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Action acceptAction = new NotificationCompat.Action.Builder(
                R.drawable.ic_call, "Accepter", acceptPendingIntent
        ).build();
        
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Appel Entrant")
                .setContentText(callerName != null ? callerName : "Quelqu'un vous appelle")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .addAction(declineAction)
                .addAction(acceptAction)
                .setOngoing(true)
                .setAutoCancel(false)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .build();
        
        Log.d(TAG, "Starting foreground service with notification.");
        startForeground(NOTIFICATION_ID, notification);

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service destroyed.");
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        stopForeground(true);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Appels Entrants WanderLink";
            String description = "Notifications pour les appels audio et vidéo entrants.";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);
            channel.setSound(null, null); // Sound is handled manually
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000});

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created.");
        }
    }
}
