package com.wanderlink.app;

import android.content.Intent;
import android.util.Log;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;
import android.content.BroadcastReceiver;
import android.content.Context;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFCMService";
    public static final String ACTION_END_CALL = "com.wanderlink.app.END_CALL";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "🚨 FCM DATA RECEIVED: " + remoteMessage.getData());

        if (remoteMessage.getData().size() > 0) {
            Map<String, String> data = remoteMessage.getData();
            String type = data.get("type");
            Log.d(TAG, "Message type: " + type);

            if ("INCOMING_CALL".equals(type)) {
                Log.d(TAG, "🎯 INCOMING CALL DETECTED - Starting IncomingCallActivity");
                Intent intent = new Intent(this, IncomingCallActivity.class);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                intent.putExtra("callId", data.get("callId"));
                intent.putExtra("callerName", data.get("callerName"));
                intent.putExtra("channel", data.get("channel"));
                intent.putExtra("isVideo", "true".equals(data.get("isVideo")));
                startActivity(intent);

            } else if ("CALL_ENDED".equals(type)) {
                Log.d(TAG, "🔚 CALL ENDED - Broadcasting to IncomingCallActivity");
                Intent intent = new Intent(ACTION_END_CALL);
                intent.putExtra("callId", data.get("callId"));
                LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
            
            } else {
                // Si ce n'est pas un appel, passez le message au gestionnaire de Capacitor
                Log.d(TAG, "Passing notification to Capacitor FirebaseMessagingService");
                super.onMessageReceived(remoteMessage);
            }
        } else {
             Log.d(TAG, "Passing notification to Capacitor FirebaseMessagingService (no data)");
             super.onMessageReceived(remoteMessage);
        }
    }
}
