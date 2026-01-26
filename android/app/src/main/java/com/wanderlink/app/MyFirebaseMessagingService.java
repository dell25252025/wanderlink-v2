
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

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
            handleDataMessage(remoteMessage.getData());
        }
    }

    private void handleDataMessage(Map<String, String> data) {
        String type = data.get("type");
        if (type == null) {
            Log.w(TAG, "Message type is missing in data payload");
            return;
        }

        if ("MESSAGE".equals(type)) {
            String title = data.get("title");
            String body = data.get("body");
            sendBasicMessageNotification(title, body);
        }
        // Future steps will handle "INCOMING_CALL"
    }

    private void sendBasicMessageNotification(String title, String body) {
        String channelId = "messages_channel";
        String channelName = "Messages";

        NotificationManager notificationManager =
                (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        // Create the NotificationChannel, but only on API 26+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId,
                    channelName,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications for new messages");
            notificationManager.createNotificationChannel(channel);
        }

        // Create an intent that will open the app when the notification is tapped
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder notificationBuilder =
                new NotificationCompat.Builder(this, channelId)
                        .setSmallIcon(R.mipmap.ic_launcher) // Make sure you have this icon
                        .setContentTitle(title)
                        .setContentText(body)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC) // Visible on lockscreen
                        .setAutoCancel(true)
                        .setContentIntent(pendingIntent);

        notificationManager.notify((int) System.currentTimeMillis(), notificationBuilder.build());
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed token: " + token);
        // If you need to send this token to your application server, do it here.
    }
}
