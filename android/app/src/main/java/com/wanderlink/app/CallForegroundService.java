package com.wanderlink.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

public class CallForegroundService extends Service {

    private static final String TAG = "CallForegroundService";
    public static final String CHANNEL_ID = "incoming_call_channel";
    private static final int NOTIFICATION_ID = 999;
    public static final String ACTION_DISMISS_CALL = "com.wanderlink.app.ACTION_DISMISS_CALL";

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "Service onCreate");

        PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "WanderLink::CallWakeLock");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "Service onStartCommand");
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(30*1000L /* 30 seconds timeout */);
            Log.d(TAG, "Wakelock acquired");
        }

        String callerName = intent.getStringExtra("callerName");
        String callerPhotoUrl = intent.getStringExtra("callerPhotoUrl");
        String channelId = intent.getStringExtra("channelId");

        createNotificationChannel();

        Notification notification = createNotification(callerName, callerPhotoUrl, channelId);
        startForeground(NOTIFICATION_ID, notification);

        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "Service onDestroy");
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "Wakelock released");
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private Notification createNotification(String callerName, String callerPhotoUrl, String channelId) {
        // Intent pour quand l'utilisateur appuie sur "Répondre"
        Intent answerIntent = new Intent(this, CallActivity.class);
        answerIntent.putExtra("channelId", channelId);
        answerIntent.putExtra("callerName", callerName);
        answerIntent.putExtra("callerPhotoUrl", callerPhotoUrl);
        answerIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent answerPendingIntent = PendingIntent.getActivity(this, 1, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour quand l'utilisateur appuie sur "Refuser"
        Intent dismissIntent = new Intent(this, CallNotificationActionReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS_CALL);
        dismissIntent.putExtra("channelId", channelId);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(this, 2, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // L'intent plein écran qui ouvre CallActivity
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 3, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle((callerName != null ? callerName : "Quelqu'un") + " vous appelle")
                .setContentText("Appel vidéo entrant...")
                .setSmallIcon(android.R.drawable.ic_menu_call) // CORRIGÉ: Utilise une icône système
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(false) // L'utilisateur doit répondre ou refuser
                .setFullScreenIntent(fullScreenPendingIntent, true) // Affiche l'activité en plein écran
                .addAction(new NotificationCompat.Action(R.drawable.ic_call_end_white_24dp, "Refuser", dismissPendingIntent))
                .addAction(new NotificationCompat.Action(R.drawable.ic_call_white_24dp, "Répondre", answerPendingIntent));

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Appels Entrants WanderLink";
            String description = "Notifications pour les appels audio et vidéo entrants.";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, importance);
            channel.setDescription(description);

            // CORRIGÉ: Utilise la sonnerie par défaut du téléphone
            Uri soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();
            channel.setSound(soundUri, audioAttributes);

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}
