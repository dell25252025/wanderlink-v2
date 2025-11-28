package com.wanderlink.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();

        // Récupérer la WebView utilisée par Capacitor
        WebView webView = this.bridge.getWebView();

        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // --- Configuration critique pour WebRTC / Agora ---
            
            // Obligatoire pour exécuter le JS d'Agora
            settings.setJavaScriptEnabled(true);
            
            // Permet l'accès au LocalStorage/SessionStorage
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            
            // CRUCIAL : Permet la lecture vidéo/audio sans geste utilisateur explicite (autoplay)
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Active l'accès aux fichiers et contenus
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
            
            // Permet de charger du contenu HTTP dans une page HTTPS (ou inversement), utile en dev
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // Active le débogage distant (chrome://inspect)
            WebView.setWebContentsDebuggingEnabled(true);

            // --- Gestion des Permissions WebRTC (Caméra/Micro) ---
            // Sans cela, la WebView rejette silencieusement les demandes de getUserMedia
            // même si l'application a les permissions Android OS.
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    // Accorde toutes les permissions demandées (caméra, micro)
                    runOnUiThread(() -> {
                        request.grant(request.getResources());
                    });
                }
            });
        }
    }
}
