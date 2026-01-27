
package com.wanderlink.app;

import android.util.Log;
import androidx.annotation.NonNull;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";

    /**
     * Appelé lorsqu'un nouveau token est généré.
     * C'est le moment de récupérer le token et de l'envoyer à votre serveur
     * pour pouvoir cibler cet appareil spécifique.
     * @param token Le nouveau token d'enregistrement de l'appareil.
     */
    @Override
    public void onNewToken(@NonNull String token) {
        Log.d(TAG, "Refreshed token: " + token);

        // TODO: Implémentez votre logique pour envoyer ce token à votre backend.
        // Par exemple, via une API call.
        // sendRegistrationToServer(token);
    }

    /**
     * Appelé lorsque l'application reçoit un message push alors qu'elle est au premier plan.
     * Pour les messages reçus en arrière-plan, le comportement dépend du contenu de la notification.
     *
     * @param remoteMessage Objet représentant le message reçu de Firebase Cloud Messaging.
     */
    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        // Log de base pour confirmer la réception
        Log.d(TAG, "From: " + remoteMessage.getFrom());

        // Vérifier si le message contient une charge de données (data payload)
        if (remoteMessage.getData().size() > 0) {
            Log.d(TAG, "Message data payload: " + remoteMessage.getData());
        }

        // Vérifier si le message contient une charge de notification (notification payload)
        if (remoteMessage.getNotification() != null) {
            Log.d(TAG, "Message Notification Body: " + remoteMessage.getNotification().getBody());
        }

        // Ici, vous pourriez déclencher la construction d'une notification personnalisée
        // ou gérer les données reçues.
    }
}
