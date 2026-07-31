
package com.wanderlink.app;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CallKit")
public class CallKitPlugin extends Plugin {

    private static final String TAG = "CallKitPlugin";

    @PluginMethod
    public void showIncomingCall(PluginCall call) {
        String callerName = call.getString("callerName");
        String callerPhotoUrl = call.getString("callerPhotoUrl");
        String channelId = call.getString("channelId");

        if (callerName == null || channelId == null) {
            call.reject("Missing required parameters: callerName and channelId");
            return;
        }

        Log.d(TAG, "showIncomingCall called for: " + callerName);

        Intent intent = new Intent(getContext(), CallForegroundService.class);
        intent.setAction(CallForegroundService.ACTION_INCOMING_CALL);
        intent.putExtra("callerName", callerName);
        intent.putExtra("callerPhotoUrl", callerPhotoUrl);
        intent.putExtra("channelId", channelId);

        getContext().startService(intent);

        call.resolve();
    }
    
    @PluginMethod
    public void dismissCall(PluginCall call) {
        Log.d(TAG, "dismissCall called");
 
        // Envoyer un broadcast qui sera intercepté par CallNotificationActionReceiver
        Intent broadcastIntent = new Intent(getContext(), CallNotificationActionReceiver.class);
        broadcastIntent.setAction(CallForegroundService.ACTION_DISMISS_CALL);
        getContext().sendBroadcast(broadcastIntent);
 
        call.resolve();
    }
}
