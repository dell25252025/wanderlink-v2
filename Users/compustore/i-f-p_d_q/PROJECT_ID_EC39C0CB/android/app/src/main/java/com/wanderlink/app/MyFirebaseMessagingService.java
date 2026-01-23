
package com.wanderlink.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import java.util.Objects;


public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private static final int INCOMING_CALL_NOTIFICATION_ID = 999;
    private static final String INCOMING_CALL_CHANNEL_ID = "incoming_call_channel";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            String type = remoteMessage.getData().get("type");
            if ("INCOMING_CALL".equals(type)) {
                createIncomingCallNotification(remoteMessage.getData());
            } else if ("CALL_ENDED".equals(type)) {
                // Cancel the notification when the call ends
                NotificationManagerCompat.from(this).cancel(INCOMING_CALL_NOTIFICATION_ID);
            } else {
                 handleRegularNotification(remoteMessage.getData());
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        // If you need to send the token to your app server, do it here.
    }

    private void createIncomingCallNotification(Map<String, String> data) {
        createCallNotificationChannel();

        String callId = data.get("callId");
        String callerName = data.get("callerName");
        String channelName = data.get("channel");
        String isVideo = data.get("isVideo");

        // Intent to launch the app when the notification is tapped (accept action)
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        fullScreenIntent.putExtra("callAction", "accept");
        fullScreenIntent.putExtra("callId", callId);
        fullScreenIntent.putExtra("channel", channelName);
        fullScreenIntent.putExtra("isVideo", isVideo);
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, 1, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent for the "Reject" action
        Intent rejectIntent = new Intent(this, MainActivity.class);
        rejectIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        rejectIntent.putExtra("callAction", "reject");
        rejectIntent.putExtra("callId", callId);
        PendingIntent rejectPendingIntent = PendingIntent.getActivity(this, 2, rejectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, INCOMING_CALL_CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher) // Make sure you have this icon
                .setContentTitle("Appel Entrant")
                .setContentText(callerName + " vous appelle.")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setFullScreenIntent(fullScreenPendingIntent, true) // This is what shows the UI on lock screen
                .addAction(0, "Refuser", rejectPendingIntent)
                .addAction(0, "Accepter", fullScreenPendingIntent)
                .setOngoing(true)
                .setAutoCancel(false) // The notification should not be dismissed by a tap
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        
        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        notificationManager.notify(INCOMING_CALL_NOTIFICATION_ID, builder.build());
    }
    
    private void handleRegularNotification(Map<String, String> data) {
         String channelId = getString(R.string.default_notification_channel_id);
        String title = data.get("title");
        String body = data.get("body");

        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        for (Map.Entry<String, String> entry : data.entrySet()) {
            intent.putExtra(entry.getKey(), entry.getValue());
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent)
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId,
                    "Notifications Générales",
                    NotificationManager.IMPORTANCE_DEFAULT);
            notificationManager.createNotificationChannel(channel);
        }

        notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
    }


    private void createCallNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = "Appels Entrants";
            String description = "Notifications pour les appels audio et vidéo entrants";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            NotificationChannel channel = new NotificationChannel(INCOMING_CALL_CHANNEL_ID, name, importance);
            channel.setDescription(description);
            // Configure sound and vibration
            channel.setSound(null, null);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500});
            channel.enableVibration(true);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            notificationManager.createNotificationChannel(channel);
        }
    }
}
