package com.wanderlink.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.NonNull;
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
            Log.d("MainActivity", "Call action received: " + action + " for callId: " + callId);

            if ("reject".equals(action) && callId != null) {
                // Stop the foreground service
                Intent serviceIntent = new Intent(this, CallForegroundService.class);
                stopService(serviceIntent);

                // Execute JS to update Firestore
                if (getBridge() != null && getBridge().getWebView() != null) {
                    getBridge().getWebView().post(() -> {
                        getBridge().eval("window.rejectCall('" + callId + "')", null);
                    });
                }
            }
            // "accept" action is handled by bringing the activity to the front
            // The JS logic will then pick up the navigation from capacitor-setup
        }
    }
}
