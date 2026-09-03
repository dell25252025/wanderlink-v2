package com.wanderlink.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AdMob")
public class AdMobPlugin extends Plugin {

    @PluginMethod
    public void showBanner(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.showBanner();
            call.resolve();
        } else {
            call.reject("Activity not available");
        }
    }

    @PluginMethod
    public void hideBanner(PluginCall call) {
        MainActivity activity = (MainActivity) getActivity();
        if (activity != null) {
            activity.hideBanner();
            call.resolve();
        } else {
            call.reject("Activity not available");
        }
    }
}
