
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

export const sendNewMessageNotification = functions.firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snapshot, context) => {
    const messageData = snapshot.data();
    const { chatId } = context.params;

    if (!messageData) return;
    const { senderId, text } = messageData;
    if (!senderId) return;

    let senderName = "Un utilisateur";
    try {
        const senderDoc = await db.collection("users").doc(senderId).get();
        if (senderDoc.exists) {
            const data = senderDoc.data()!;
            senderName = data.displayName || data.name || data.username || "Un utilisateur";
        }
    } catch (error) {
        console.error(`Erreur lors de la récupération du profil de l'expéditeur (ID: ${senderId}):`, error);
    }

    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists || !chatDoc.data()?.participants) return;
    const participants: string[] = chatDoc.data()!.participants;
    const recipientId = participants.find(id => id !== senderId);
    if (!recipientId) return;

    // --- DÉBUT DE LA MODIFICATION ---
    try {
      const userDoc = await db.collection('users').doc(recipientId).get();
      const messagesEnabled = userDoc.data()?.notificationSettings?.messages ?? true; // true par défaut

      if (!messagesEnabled) {
        console.log(`[Messages Notification] Recipient: ${recipientId} messages setting: false Notification skipped`);
        return; // On quitte la fonction
      } else {
        console.log(`[Messages Notification] Recipient: ${recipientId} messages setting: true Notification allowed`);
      }
    } catch (error) {
      console.error(`[Messages Notification] Erreur lors de la lecture des paramètres de ${recipientId}:`, error);
      // En cas d'erreur de lecture, on continue par sécurité pour ne pas bloquer les notifs
    }
    // --- FIN DE LA MODIFICATION ---

    // Le code existant continue ici, sans aucune modification
    try {
        await db.collection(`users/${recipientId}/notifications`).add({
            type: "message",
            chatId: chatId,
            senderId: senderId,
            senderName: senderName,
            text: text || "Vous a envoyé un message",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            read: false,
        });
    } catch (error) {
        console.error("Erreur lors de la création de la notif dans Firestore:", error);
    }
  });

export const onNotificationCreated = functions.firestore
    .document("users/{userId}/notifications/{notificationId}")
    .onCreate(async (snapshot, context) => {
        const { userId } = context.params;
        const notifData = snapshot.data();

        if (!notifData) {
            console.log("Aucune donnée de notification, on quitte.");
            return;
        }

        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists || !userDoc.data()?.fcmTokens) {
            console.log(`L'utilisateur ${userId} n'a pas de tokens FCM.`);
            return;
        }

        const tokens: string[] = userDoc.data()!.fcmTokens;
        if (tokens.length === 0) {
            console.log(`L'utilisateur ${userId} n'a pas de token valide.`);
            return;
        }

        const payload: admin.messaging.MulticastMessage = {
            tokens: tokens,
            notification: {
                title: notifData.senderName || "Nouvelle notification",
                body: notifData.text || "Vous avez une nouvelle notification.",
            },
            data: {
                type: notifData.type, // 'message' or 'like'
                chatId: notifData.chatId || '',
                photoUrl: notifData.photoUrl || '',
                senderId: notifData.senderId || '',
                channelId: notifData.channelId || '',
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "messages", // On réutilise le canal existant
                    tag: notifData.chatId || context.params.notificationId,
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        "content-available": 1,
                    },
                },
            },
        };

        try {
            await admin.messaging().sendEachForMulticast(payload);
            console.log("Notification push envoyée avec succès à", userId);
        } catch (error) {
            console.error("Erreur lors de l'envoi de la notification push:", error);
        }
    });
