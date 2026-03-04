package com.wanderlink.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// Importez le plugin PushNotifications
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enregistrez le plugin ici
        registerPlugin(PushNotificationsPlugin.class);
    }
}
