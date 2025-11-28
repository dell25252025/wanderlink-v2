package com.wanderlink.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = (WebView) getBridge().getWebView();

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
          // Grant microphone/camera permission to the webview origin
          runOnUiThread(() -> request.grant(request.getResources()));
        }
      });
    }
  }
}
