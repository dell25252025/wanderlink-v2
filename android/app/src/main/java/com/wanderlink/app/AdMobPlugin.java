
package com.wanderlink.app;

import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdMob")
public class AdMobPlugin extends Plugin {

    private static final String PLUGIN_TAG = "AdMobPlugin";

    @PluginMethod
    public void showBanner(PluginCall call) {
        Log.d(PLUGIN_TAG, "-> showBanner() received from JS.");
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            Log.d(PLUGIN_TAG, "Activity found. Calling MainActivity.showBanner().");
            activity.showBanner();
            call.resolve();
        } else {
            Log.e(PLUGIN_TAG, "ERROR: MainActivity instance not found.");
            call.reject("Activity not available");
        }
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        Log.d(PLUGIN_TAG, "-> hideBanner() received from JS.");
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            Log.d(PLUGIN_TAG, "Activity found. Calling MainActivity.hideBanner().");
            activity.hideBanner();
            call.resolve();
        } else {
            Log.e(PLUGIN_TAG, "ERROR: MainActivity instance not found.");
            call.reject("Activity not available");
        }
    }
}
