
package com.wanderlink.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import java.util.Objects;


public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            sendNotification(remoteMessage.getData());
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        // If you need to send the token to your app server, do it here.
    }

    private void sendNotification(Map<String, String> data) {
        String type = data.get("type");
        if (Objects.equals(type, "INCOMING_CALL")) {
            handleIncomingCall(data);
        } else {
            handleRegularNotification(data);
        }
    }

    private void handleIncomingCall(Map<String, String> data) {
        String channelId = "incoming_calls_channel";
        String channelName = "Appels Entrants";

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications pour les appels entrants");
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000});
            channel.enableVibration(true);
            notificationManager.createNotificationChannel(channel);
        }

        String callId = data.get("callId");

        // Intent for full screen - launches the main activity
        Intent fullScreenIntent = new Intent(this, MainActivity.class);
        fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        fullScreenIntent.putExtra("callId", callId);
        // Pass all data to the intent so the JS layer can receive it
        for (Map.Entry<String, String> entry : data.entrySet()) {
            fullScreenIntent.putExtra(entry.getKey(), entry.getValue());
        }
        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(this, callId.hashCode() + 1, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Action: Accept
        Intent acceptIntent = new Intent(this, MainActivity.class);
        acceptIntent.setAction("ACCEPT_CALL");
        acceptIntent.putExtra("actionId", "accept"); // ID for Capacitor
        for (Map.Entry<String, String> entry : data.entrySet()) {
            acceptIntent.putExtra(entry.getKey(), entry.getValue());
        }
        PendingIntent acceptPendingIntent = PendingIntent.getActivity(this, callId.hashCode() + 2, acceptIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        
        // Action: Reject
        Intent rejectIntent = new Intent(this, MainActivity.class);
        rejectIntent.setAction("REJECT_CALL");
        rejectIntent.putExtra("actionId", "reject"); // ID for Capacitor
        for (Map.Entry<String, String> entry : data.entrySet()) {
            rejectIntent.putExtra(entry.getKey(), entry.getValue());
        }
        PendingIntent rejectPendingIntent = PendingIntent.getActivity(this, callId.hashCode() + 3, rejectIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(data.get("title"))
                        .setContentText(data.get("body"))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setCategory(NotificationCompat.CATEGORY_CALL)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .addAction(0, "Refuser", rejectPendingIntent)
                        .addAction(0, "Accepter", acceptPendingIntent)
                        .setAutoCancel(true)
                        .setOngoing(true);
        
        final int NOTIFICATION_ID = 120; // Use a fixed ID for the call notification
        notificationManager.notify(NOTIFICATION_ID, notificationBuilder.build());
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
}
