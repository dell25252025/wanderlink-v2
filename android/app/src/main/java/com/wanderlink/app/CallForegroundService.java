
package com.wanderlink.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.BridgeActivity;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class CallForegroundService extends Service {

    private static final String TAG = "CallForegroundService";
    public static final String CHANNEL_ID = "IncomingCallChannel";
    public static final int NOTIFICATION_ID = 1123;

    public static final String ACTION_INCOMING_CALL = "com.wanderlink.app.ACTION_INCOMING_CALL";
    public static final String ACTION_DISMISS_CALL = "com.wanderlink.app.ACTION_DISMISS_CALL";

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "CallForegroundService onCreate");
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.d(TAG, "onStartCommand received");
        if (intent != null && ACTION_INCOMING_CALL.equals(intent.getAction())) {
            Log.d(TAG, "Handling ACTION_INCOMING_CALL");

            String callerName = intent.getStringExtra("callerName");
            String callerPhotoUrl = intent.getStringExtra("callerPhotoUrl");
            String channelId = intent.getStringExtra("channelId");

            // Utiliser un Handler pour exécuter le code réseau sur un thread différent
            Handler handler = new Handler(Looper.getMainLooper());
            handler.post(() -> {
                Bitmap callerPhotoBitmap = null;
                if (callerPhotoUrl != null && !callerPhotoUrl.isEmpty()) {
                    callerPhotoBitmap = getBitmapFromURL(callerPhotoUrl);
                }
                startForeground(NOTIFICATION_ID, createNotification(callerName, callerPhotoUrl, channelId));
            });
        } else if (intent != null && ACTION_DISMISS_CALL.equals(intent.getAction())) {
            Log.d(TAG, "Handling ACTION_DISMISS_CALL");
            stopForeground(true);
            stopSelf();
        }
        return START_NOT_STICKY;
    }

    private Notification createNotification(String callerName, String callerPhotoUrl, String channelId) {
        Log.d(TAG, "Creating notification for " + callerName);

        // L'Intent plein écran qui ouvrira notre CallActivity
        Intent fullScreenIntent = new Intent(this, CallActivity.class);
        fullScreenIntent.putExtra("callerName", callerName);
        fullScreenIntent.putExtra("callerPhotoUrl", callerPhotoUrl);
        fullScreenIntent.putExtra("channelId", channelId);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 0, fullScreenIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour le bouton "Refuser"
        Intent dismissIntent = new Intent(this, CallNotificationActionReceiver.class);
        dismissIntent.setAction(ACTION_DISMISS_CALL);
        dismissIntent.putExtra("channelId", channelId);
        PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(this, 1, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent pour le bouton "Répondre"
        Intent answerIntent = new Intent(this, CallNotificationActionReceiver.class);
        answerIntent.setAction(ACTION_INCOMING_CALL); // On peut réutiliser l'action pour ouvrir l'app
        answerIntent.putExtra("channelId", channelId);
        PendingIntent answerPendingIntent = PendingIntent.getBroadcast(this, 2, answerIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);


        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle((callerName != null ? callerName : "Quelqu'un") + " vous appelle")
                .setContentText("Appel vidéo entrant...")
                .setSmallIcon(R.drawable.ic_notification) // Assurez-vous que cette icône existe
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setOngoing(true)
                .setAutoCancel(false)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .addAction(new NotificationCompat.Action(R.drawable.ic_call_end_white_24dp, "Refuser", dismissPendingIntent))
                .addAction(new NotificationCompat.Action(R.drawable.ic_call_white_24dp, "Répondre", answerPendingIntent));
        
        // Si on a l'URL de la photo, on la charge en arrière-plan pour la notification (mais l'Activity la chargera aussi)
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(() -> {
            Bitmap callerPhotoBitmap = null;
            if (callerPhotoUrl != null && !callerPhotoUrl.isEmpty()) {
                callerPhotoBitmap = getBitmapFromURL(callerPhotoUrl);
                if(callerPhotoBitmap != null) {
                     builder.setLargeIcon(callerPhotoBitmap);
                }
            }
        });

        return builder.build();
    }


    public Bitmap getBitmapFromURL(String src) {
        try {
            URL url = new URL(src);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            Log.e(TAG, "Error getting bitmap from URL: " + e.getMessage());
            return null;
        }
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

            Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + getPackageName() + "/" + R.raw.ringtone);
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            channel.setSound(soundUri, audioAttributes);

            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});

            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
            Log.d(TAG, "Notification channel created with custom sound.");
        }
    }
}
