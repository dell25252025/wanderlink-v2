package com.wanderlink.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("callAction")) {
            String action = intent.getStringExtra("callAction");
            String callId = intent.getStringExtra("callId");
            String channelName = intent.getStringExtra("channel");

            Log.d("MainActivity", "Call action received: " + action + " for callId: " + callId);

            if ("accept".equals(action)) {
                // The JS side will handle the navigation
                getBridge().eval("window.handleCallAction('accept', '" + callId + "', '" + channelName + "')", null);
            } else if ("reject".equals(action)) {
                // The JS side will handle the firestore update
                getBridge().eval("window.handleCallAction('reject', '" + callId + "')", null);
            }
        }
    }
}
