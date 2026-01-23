package com.wanderlink.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import androidx.localbroadcastmanager.content.LocalBroadcastManager;
import android.util.Log;

public class IncomingCallActivity extends AppCompatActivity {

    private static final String TAG = "IncomingCallActivity";
    private Ringtone ringtone;

    private final BroadcastReceiver callEndReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Log.d(TAG, "Received call ended broadcast, finishing activity.");
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
            }
            finishAndRemoveTask();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                                 WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                                 WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }

        setContentView(R.layout.activity_incoming_call);

        TextView callerNameView = findViewById(R.id.caller_name);
        Button acceptButton = findViewById(R.id.accept_button);
        Button declineButton = findViewById(R.id.decline_button);

        Intent intent = getIntent();
        String callerName = intent.getStringExtra("callerName");
        String callId = intent.getStringExtra("callId");
        String channelName = intent.getStringExtra("channel");

        callerNameView.setText(callerName != null ? callerName : "Quelqu'un vous appelle");

        try {
            Uri notificationSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            ringtone = RingtoneManager.getRingtone(this, notificationSoundUri);
            if (ringtone != null) {
                ringtone.setLooping(true);
                ringtone.play();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing ringtone", e);
        }

        acceptButton.setOnClickListener(v -> {
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
            }
            Intent mainActivityIntent = new Intent(this, MainActivity.class);
            mainActivityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainActivityIntent.putExtra("callAction", "accept");
            mainActivityIntent.putExtra("callId", callId);
            mainActivityIntent.putExtra("channel", channelName);
            startActivity(mainActivityIntent);
            finish();
        });

        declineButton.setOnClickListener(v -> {
            if (ringtone != null && ringtone.isPlaying()) {
                ringtone.stop();
            }
            Intent mainActivityIntent = new Intent(this, MainActivity.class);
            mainActivityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            mainActivityIntent.putExtra("callAction", "reject");
            mainActivityIntent.putExtra("callId", callId);
            startActivity(mainActivityIntent);
            finish();
        });
        
        LocalBroadcastManager.getInstance(this).registerReceiver(callEndReceiver, new IntentFilter(MyFirebaseMessagingService.ACTION_END_CALL));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (ringtone != null && ringtone.isPlaying()) {
            ringtone.stop();
        }
        LocalBroadcastManager.getInstance(this).unregisterReceiver(callEndReceiver);
    }
}
