package com.wanderlink.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class CallNotificationActionReceiver extends BroadcastReceiver {

    private static final String TAG = "CallNotificationActionReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent != null) {
            String action = intent.getAction();
            Log.d(TAG, "Received broadcast with action: " + action);

            if (CallForegroundService.ACTION_DISMISS_CALL.equals(action)) {
                Log.d(TAG, "Handling dismiss call action. Stopping service.");
                
                // Arrête le service de premier plan qui gère la sonnerie et la notification
                Intent serviceIntent = new Intent(context, CallForegroundService.class);
                context.stopService(serviceIntent);
            }
        }
    }
}
