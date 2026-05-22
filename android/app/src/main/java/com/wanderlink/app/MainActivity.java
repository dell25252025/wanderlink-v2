package com.wanderlink.app;

import android.os.Bundle;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;

import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "messages",
                "Messages",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Notifications de messages");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        registerPlugin(CallKitPlugin.class);
    }
}
