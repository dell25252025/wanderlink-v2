package com.wanderlink.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import androidx.core.app.NotificationManagerCompat;

// This receiver is currently not used in the main flow, which directs actions to MainActivity.
// It is kept as a potential alternative implementation path.
public class DeclineCallReceiver extends BroadcastReceiver {

    private static final String TAG = "DeclineCallReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String callId = intent.getStringExtra("callId");
        Log.d(TAG, "Decline action received for callId: " + callId);
        
        // Stop the foreground service
        Intent serviceIntent = new Intent(context, CallForegroundService.class);
        context.stopService(serviceIntent);

        // Cancel the notification
        NotificationManagerCompat.from(context).cancel(999);

        // Here you would typically update your backend (e.g., Firestore) to set the call status to "rejected".
        // This is complex from a BroadcastReceiver. The current implementation handles this in MainActivity
        // by executing JavaScript in the WebView.
    }
}
