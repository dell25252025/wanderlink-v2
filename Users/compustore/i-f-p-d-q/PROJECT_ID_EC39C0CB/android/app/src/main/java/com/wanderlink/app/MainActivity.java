package com.wanderlink.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginMethod;
import androidx.annotation.NonNull;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Log pour vérifier que cette méthode est bien exécutée au lancement.
        android.util.Log.e("FLAG_SECURE_TEST", "onCreate MainActivity executing");
        
        // Appliquer le drapeau de sécurité AVANT l'initialisation de l'activité parente
        // C'est la méthode la plus robuste pour s'assurer que le flag n'est pas écrasé.
        getWindow().setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        );

        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        
        WebView webView = this.bridge.getWebView();

        if (webView != null) {
            WebSettings settings = webView.getSettings();
            
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            WebView.setWebContentsDebuggingEnabled(true);

            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> {
                        request.grant(request.getResources());
                    });
                }
            });
        }
    }

    @Override
    public void onPause() {
        super.onPause();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}
