
package com.wanderlink.app;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.coordinatorlayout.widget.CoordinatorLayout;

import com.getcapacitor.BridgeActivity;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {

    private static final String ADMOB_TAG = "AdMobBanner"; // TAG pour les logs

    private AdView adView;
    private boolean isBannerRequestedVisible = false;
    private boolean isAdLoaded = false; // Suivi de l'état du chargement de la pub

    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d(ADMOB_TAG, "-> onCreate() started.");

        Log.d(ADMOB_TAG, "Registering AdMobPlugin.class...");
        registerPlugin(AdMobPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d(ADMOB_TAG, "super.onCreate() finished.");

        MobileAds.initialize(this, initializationStatus -> {
            Log.d(ADMOB_TAG, "MobileAds.initialize() onInitializationComplete.");
        });

        // B-7 Change: Register the WebView to enable communication with the Google Mobile Ads SDK for inline ads.
        Log.d(ADMOB_TAG, "Registering WebView with Mobile Ads SDK...");
        MobileAds.registerWebView(this.getBridge().getWebView());
        Log.d(ADMOB_TAG, "WebView registered.");

        Log.d(ADMOB_TAG, "Creating new AdView...");
        adView = new AdView(this);
        adView.setAdUnitId("ca-app-pub-3940256099942544/9214589741"); // ID de test AdMob
        Log.d(ADMOB_TAG, "Ad Unit ID set.");

        WebView webView = getBridge().getWebView();
        CoordinatorLayout container = (CoordinatorLayout) webView.getParent();

        CoordinatorLayout.LayoutParams adParams = new CoordinatorLayout.LayoutParams(
            CoordinatorLayout.LayoutParams.WRAP_CONTENT,
            CoordinatorLayout.LayoutParams.WRAP_CONTENT
        );
        adParams.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.CENTER_HORIZONTAL;
        container.addView(adView, adParams);
        Log.d(ADMOB_TAG, "AdView added to the container.");

        adView.setVisibility(View.GONE);
        Log.d(ADMOB_TAG, "AdView visibility set to GONE.");
        adjustWebViewMargin(0);

        loadBanner();

        // --- LOGIQUE EXISTANTE PRÉSERVÉE ---
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("messages", "Messages", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications de messages");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
        Log.d(ADMOB_TAG, "<- onCreate() finished.");
    }

    public void showBanner() {
        runOnUiThread(() -> {
            Log.d(ADMOB_TAG, "-> showBanner() called on UI thread.");
            isBannerRequestedVisible = true;
            adView.setVisibility(View.VISIBLE);

            if (isAdLoaded) {
                Log.d(ADMOB_TAG, "Ad is already loaded. Adjusting margin and notifying WebView.");
                int heightInPixels = adView.getAdSize().getHeightInPixels(MainActivity.this);
                adjustWebViewMargin(heightInPixels);
                notifyWebViewOfBannerHeight(heightInPixels);
            } else {
                Log.d(ADMOB_TAG, "Ad is not loaded yet. Margin will be adjusted in onAdLoaded if successful.");
            }
            Log.d(ADMOB_TAG, "<- showBanner() finished.");
        });
    }

    public void hideBanner() {
        runOnUiThread(() -> {
            Log.d(ADMOB_TAG, "-> hideBanner() called on UI thread.");
            isBannerRequestedVisible = false;
            adView.setVisibility(View.GONE);
            adjustWebViewMargin(0);
            notifyWebViewOfBannerHeight(0);
            Log.d(ADMOB_TAG, "<- hideBanner() finished.");
        });
    }

    private void loadBanner() {
        Log.d(ADMOB_TAG, "-> loadBanner() started.");

        AdSize adSize = getAdSize();
        adView.setAdSize(adSize);
        Log.d(ADMOB_TAG, "AdSize configured.");

        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                super.onAdLoaded();
                isAdLoaded = true;
                Log.d(ADMOB_TAG, "SUCCESS: onAdLoaded() fired. Ad is now ready to be shown.");
                if (isBannerRequestedVisible) {
                    Log.d(ADMOB_TAG, "Banner was requested to be visible, adjusting margin and notifying WebView.");
                    int heightInPixels = adView.getAdSize().getHeightInPixels(MainActivity.this);
                    adjustWebViewMargin(heightInPixels);
                    notifyWebViewOfBannerHeight(heightInPixels);
                }
            }

            @Override
            public void onAdFailedToLoad(LoadAdError loadAdError) {
                super.onAdFailedToLoad(loadAdError);
                isAdLoaded = false;
                // Log détaillé de l'erreur
                Log.e(ADMOB_TAG, "ERROR: onAdFailedToLoad. Code: " + loadAdError.getCode() + ", Message: " + loadAdError.getMessage() + ", Domain: " + loadAdError.getDomain());
                adjustWebViewMargin(0);
                notifyWebViewOfBannerHeight(0);
            }
        });

        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);
        Log.d(ADMOB_TAG, "adView.loadAd() called. Waiting for ad to load...");
        Log.d(ADMOB_TAG, "<- loadBanner() finished.");
    }

    private void adjustWebViewMargin(int margin) {
        Log.d(ADMOB_TAG, "-> adjustWebViewMargin(" + margin + ") called.");
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
            if (params.bottomMargin != margin) {
                params.bottomMargin = margin;
                webView.setLayoutParams(params);
                Log.d(ADMOB_TAG, "Margin updated.");
            }
        }
    }

    /**
     * Notifie la WebView de la hauteur actuelle de la bannière via un événement JavaScript.
     * @param heightInPixels La hauteur de la bannière en pixels physiques.
     */
    private void notifyWebViewOfBannerHeight(int heightInPixels) {
        // Convertir les pixels physiques en pixels indépendants de la densité (CSS pixels)
        DisplayMetrics metrics = getResources().getDisplayMetrics();
        float density = metrics.density;
        int heightInCssPx = (int) (heightInPixels / density);

        Log.d(ADMOB_TAG, "Notifying WebView of banner height. Physical px: " + heightInPixels + ", CSS px: " + heightInCssPx);

        final WebView webView = getBridge().getWebView();
        if (webView != null) {
            String script = String.format(
                java.util.Locale.US,
                "window.dispatchEvent(new CustomEvent('bannerHeightChange', { detail: { bannerHeight: %d } }));",
                heightInCssPx
            );
            // L'évaluation doit se faire sur le thread UI, ce qui est déjà le cas pour les méthodes appelantes.
            // webView.evaluateJavascript(script, null); // Neutralisé pour le test d'isolation.
        }
    }

    private AdSize getAdSize() {
        Display display = getWindowManager().getDefaultDisplay();
        DisplayMetrics outMetrics = new DisplayMetrics();
        display.getMetrics(outMetrics);

        float widthPixels = outMetrics.widthPixels;
        float density = outMetrics.density;

        int adWidth = (int) (widthPixels / density);
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, adWidth);
    }

    // --- Cycle de vie avec Logs ---

    @Override
    public void onStart() {
        super.onStart();
        // L'enregistrement du plugin existant est préservé (commenté).
    }

    @Override
    public void onPause() {
        Log.d(ADMOB_TAG, "onPause() called.");
        if (adView != null) {
            adView.pause();
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        Log.d(ADMOB_TAG, "onResume() called.");
        if (adView != null) {
            adView.resume();
        }
    }

    @Override
    public void onDestroy() {
        Log.d(ADMOB_TAG, "onDestroy() called.");
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
    }
}
