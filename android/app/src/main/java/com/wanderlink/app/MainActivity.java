package com.wanderlink.app;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.DisplayMetrics;
import android.view.Display;
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

    private AdView adView;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initialisation du SDK Google Mobile Ads
        MobileAds.initialize(this, initializationStatus -> {});

        // Création de la AdView par programmation
        adView = new AdView(this);
        adView.setAdUnitId("ca-app-pub-3940256099942544/9214589741"); // ID de test AdMob

        // Récupération du conteneur racine de Capacitor
        WebView webView = getBridge().getWebView();
        CoordinatorLayout container = (CoordinatorLayout) webView.getParent();

        // Création des paramètres pour positionner la bannière en bas
        CoordinatorLayout.LayoutParams adParams = new CoordinatorLayout.LayoutParams(
            CoordinatorLayout.LayoutParams.WRAP_CONTENT,
            CoordinatorLayout.LayoutParams.WRAP_CONTENT
        );
        adParams.gravity = android.view.Gravity.BOTTOM | android.view.Gravity.CENTER_HORIZONTAL;
        container.addView(adView, adParams);

        // Chargement de la bannière
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
    }

    private void loadBanner() {
        AdSize adSize = getAdSize();
        adView.setAdSize(adSize);

        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                super.onAdLoaded();
                int adHeight = adView.getAdSize().getHeightInPixels(MainActivity.this);
                adjustWebViewMargin(adHeight);
            }

            @Override
            public void onAdFailedToLoad(LoadAdError loadAdError) {
                super.onAdFailedToLoad(loadAdError);
                adjustWebViewMargin(0);
            }
        });

        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);
    }

    private void adjustWebViewMargin(int margin) {
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            ViewGroup.MarginLayoutParams params = (ViewGroup.MarginLayoutParams) webView.getLayoutParams();
            params.bottomMargin = margin;
            webView.setLayoutParams(params);
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

    // --- LOGIQUE EXISTANTE PRÉSERVÉE ---
    @Override
    public void onStart() {
        super.onStart();
        // L'enregistrement du plugin existant est préservé.
        // registerPlugin(CallKitPlugin.class);
    }

    @Override
    public void onPause() {
        if (adView != null) {
            adView.pause();
        }
        super.onPause();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (adView != null) {
            adView.resume();
        }
    }

    @Override
    public void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        super.onDestroy();
    }
}
