package com.wanderlink.app;

import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFCMService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        // Log de base pour confirmer la réception
        Log.d(TAG, "\uD83D\uDEA8 \uD83D\uDEA8 \uD83D\uDEA8 FCM MESSAGE RECEIVED IN JAVA \uD83D\uDEA8 \uD83D\uDEA8 \uD83D\uDEA8");
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Vérifier si le message contient un payload de données
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
        }

        // Vérifier si le message contient un payload de notification
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Message Notification Body: " + remoteMessage.getNotification().getBody());
        }
    }
}
