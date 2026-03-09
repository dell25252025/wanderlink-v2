import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Channel } from '@capacitor/push-notifications';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

// Assurez-vous que votre fichier firebase.ts exporte `app`
import { app } from '@/lib/firebase'; 

const db = getFirestore(app);

const CHANNEL_ID = "messages";

// Fonction pour créer le canal de notification
const createNotificationChannel = async () => {
  const channel: Channel = {
    id: CHANNEL_ID,
    name: "Messages",
    description: "Notifications for new messages",
    importance: 5, // Max importance
    visibility: 1, // Publicly visible
    sound: "default",
    vibration: true,
  };
  await PushNotifications.createChannel(channel);
  console.log(`Notification channel "${CHANNEL_ID}" created or already exists.`);
};

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not initialized: Not a native platform.');
    return;
  }

  try {
    await createNotificationChannel();

    // Demander la permission pour les notifications PUSH
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      throw new Error('User denied push permissions!');
    }

    // Demander la permission pour les notifications LOCALES
    let localPerms: PermissionStatus = await LocalNotifications.checkPermissions();
    if (localPerms.display === 'prompt') {
      localPerms = await LocalNotifications.requestPermissions();
    }
    if (localPerms.display !== 'granted') {
      console.warn('User denied local notification permissions!');
      // On peut continuer même si c'est refusé, l'app ne plantera pas
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      await saveTokenToFirestore(userId, token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received:', notification);
      
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: Date.now(),
              title: notification.data.title || "Nouveau message",
              body: notification.data.body || "Vous avez reçu un message",
              schedule: { at: new Date(Date.now() + 100) },
              extra: notification.data,
              channelId: CHANNEL_ID // **LA CORRECTION FINALE**
            }
          ]
        });
        console.log("Local notification successfully scheduled on channel 'messages'.");
      } catch (e) {
        console.error("Error scheduling local notification", e);
      }
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification.notification.data);
      const chatId = notification.notification.data.chatId;
      if (chatId) {
        console.log(`Should navigate to chat: ${chatId}`);
        // window.location.href = `/chat/${chatId}`;
      }
    });

  } catch (e) {
    console.error('Error initializing push notifications', e);
  }
};

const saveTokenToFirestore = async (userId: string, token: string) => {
  if (!userId) {
    console.error("User ID is not provided.");
    return;
  }
  try {
    const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
    await setDoc(tokenRef, { createdAt: new Date() });
    console.log(`Token ${token} saved for user ${userId}`);
  } catch (e) {
    console.error("Error saving token to Firestore", e);
  }
};
