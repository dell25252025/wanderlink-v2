
package com.wanderlink.app;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Button;
import androidx.appcompat.app.AppCompatActivity;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class CallActivity extends AppCompatActivity {

    private final ExecutorService executorService = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        // Récupérer les informations de l'intent
        String callerName = getIntent().getStringExtra("callerName");
        String callerPhotoUrl = getIntent().getStringExtra("callerPhotoUrl");
        final String channelId = getIntent().getStringExtra("channelId");

        // Mettre à jour l'interface utilisateur
        TextView callerNameTextView = findViewById(R.id.callerNameTextView);
        callerNameTextView.setText(callerName != null ? callerName : "Appel entrant");

        ImageView callerPhotoImageView = findViewById(R.id.callerPhotoImageView);
        if (callerPhotoUrl != null && !callerPhotoUrl.isEmpty()) {
            executorService.execute(() -> {
                Bitmap bitmap = getBitmapFromURL(callerPhotoUrl);
                if (bitmap != null) {
                    handler.post(() -> callerPhotoImageView.setImageBitmap(bitmap));
                }
            });
        }

        // Gérer les clics sur les boutons
        Button acceptButton = findViewById(R.id.acceptButton);
        acceptButton.setOnClickListener(v -> {
            Intent intent = new Intent(this, MainActivity.class);
            intent.setData(Uri.parse("https://app.wanderlink.fr/call/" + channelId));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            startActivity(intent);
            finish();
        });

        Button declineButton = findViewById(R.id.declineButton);
        declineButton.setOnClickListener(v -> {
            // Envoyer un broadcast pour refuser l'appel
            Intent dismissIntent = new Intent(this, CallNotificationActionReceiver.class);
            dismissIntent.setAction(CallForegroundService.ACTION_DISMISS_CALL);
            dismissIntent.putExtra("channelId", channelId);
            sendBroadcast(dismissIntent);
            finish();
        });
    }

    private Bitmap getBitmapFromURL(String src) {
        try {
            URL url = new URL(src);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setDoInput(true);
            connection.connect();
            InputStream input = connection.getInputStream();
            return BitmapFactory.decodeStream(input);
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }
}
