package com.wanderlink.app;

import android.content.Intent;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFCMService";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "🚨 FCM DATA RECEIVED: " + remoteMessage.getData());

        if (remoteMessage.getData().size() > 0) {
            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");
            Log.d(TAG, "Message type: " + type);

            if ("INCOMING_CALL".equals(type)) {
                Log.d(TAG, "🎯 INCOMING CALL DETECTED - Starting CallForegroundService");
                Intent serviceIntent = new Intent(this, CallForegroundService.class);
                serviceIntent.putExtra("callId", data.get("callId"));
                serviceIntent.putExtra("callerName", data.get("callerName"));
                serviceIntent.putExtra("channel", data.get("channel"));
                serviceIntent.putExtra("isVideo", data.get("isVideo"));
                startForegroundService(serviceIntent);
            } else if ("CALL_ENDED".equals(type)) {
                Log.d(TAG, "🔚 CALL ENDED - Stopping CallForegroundService");
                Intent serviceIntent = new Intent(this, CallForegroundService.class);
                stopService(serviceIntent);
            }
        }
    }
}
