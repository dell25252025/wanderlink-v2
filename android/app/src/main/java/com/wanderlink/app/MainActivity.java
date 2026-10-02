
package com.wanderlink.app;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;
import android.view.ContextMenu;
import android.view.View;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // --- LOGIQUE EXISTANTE PRÉSERVÉE ---
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("messages", "Messages", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications de messages");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }

        // --- START: NATIVE-WEBVIEW-AUDIT INSTRUMENTATION ---
        // This code is for forensic purposes only and should be removed after the audit.
        final WebView webView = this.getBridge().getWebView();

        if (webView != null) {
            webView.setOnCreateContextMenuListener(new View.OnCreateContextMenuListener() {
                @Override
                public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
                    long timestamp = System.currentTimeMillis();
                    String menuInfoClass = (menuInfo == null) ? "null" : menuInfo.getClass().getName();
                    Log.d("NATIVE-WEBVIEW-AUDIT",
                        "onCreateContextMenu triggered at: " + timestamp +
                        " | WebView Class: " + v.getClass().getName() +
                        " | WebView hasFocus: " + v.hasFocus() +
                        " | hasWindowFocus: " + v.hasWindowFocus() +
                        " | ContextMenuInfo type: " + menuInfoClass
                    );

                    if (menuInfo instanceof WebView.HitTestResult) {
                        WebView.HitTestResult result = (WebView.HitTestResult) menuInfo;
                        int hitTestType = result.getType();
                        String typeString;
                        switch (hitTestType) {
                            case WebView.HitTestResult.UNKNOWN_TYPE: typeString = "UNKNOWN"; break;
                            case WebView.HitTestResult.PHONE_TYPE: typeString = "PHONE"; break;
                            case WebView.HitTestResult.GEO_TYPE: typeString = "GEO"; break;
                            case WebView.HitTestResult.EMAIL_TYPE: typeString = "EMAIL"; break;
                            case WebView.HitTestResult.IMAGE_TYPE: typeString = "IMAGE"; break;
                            case WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE: typeString = "SRC_IMAGE_ANCHOR"; break;
                            case WebView.HitTestResult.SRC_ANCHOR_TYPE: typeString = "SRC_ANCHOR"; break;
                            case WebView.HitTestResult.EDIT_TEXT_TYPE: typeString = "EDIT_TEXT"; break;
                            default: typeString = "UNHANDLED_CASE (" + hitTestType + ")"; break;
                        }
                        Log.d("NATIVE-WEBVIEW-AUDIT",
                            "HitTestResult Details | Type: " + typeString +
                            " | Extra: " + result.getExtra()
                        );
                    }
                    // We call super to allow the default behavior to continue for this audit.
                    // This is observation-only. We do not modify the menu.
                    MainActivity.super.onCreateContextMenu(menu, v, menuInfo);
                }
            });

            webView.setOnLongClickListener(new View.OnLongClickListener() {
                @Override
                public boolean onLongClick(View v) {
                    long timestamp = System.currentTimeMillis();
                    Log.d("NATIVE-WEBVIEW-AUDIT",
                        "OnLongClickListener.onLongClick triggered at: " + timestamp +
                        " | WebView Class: " + v.getClass().getName() +
                        " | WebView hasFocus: " + v.hasFocus() +
                        " | hasWindowFocus: " + v.hasWindowFocus()
                    );
                    // --- EXPERIMENT (STEP 10) ---
                    // Returning true to consume the long click event natively,
                    // attempting to prevent the default context menu from appearing
                    // and thus preventing the keyboard from hiding.
                    Log.d("NATIVE-WEBVIEW-AUDIT", "onLongClick is consuming the event and returning true.");
                    return true;
                }
            });
        }
        // --- END: NATIVE-WEBVIEW-AUDIT INSTRUMENTATION ---
    }

    // --- Cycle de vie avec Logs (simplifié) ---

    @Override
    public void onStart() {
        super.onStart();
        // L'enregistrement du plugin existant est préservé (commenté).
        // registerPlugin(CallKitPlugin.class);
    }

    @Override
    public void onPause() {
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }

    // --- START: ANDROID-WINDOW-AUDIT INSTRUMENTATION ---
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        Log.d("ANDROID-WINDOW-AUDIT", "MainActivity onWindowFocusChanged. hasFocus: " + hasFocus);
    }
    // --- END: ANDROID-WINDOW-AUDIT INSTRUMENTATION ---
}
