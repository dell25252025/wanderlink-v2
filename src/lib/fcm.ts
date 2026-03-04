import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Channel } from '@capacitor/push-notifications';

// Assurez-vous que votre fichier firebase.ts exporte `app`
import { app } from '@/lib/firebase'; 

const db = getFirestore(app);

// Fonction pour créer le canal de notification
const createNotificationChannel = async () => {
  const channel: Channel = {
    id: "messages", // **CRITICAL: Must match the ID sent from the backend**
    name: "Messages",
    description: "Notifications for new messages",
    importance: 5, // Max importance
    visibility: 1, // Publicly visible
    sound: "default",
    vibration: true,
  };
  await PushNotifications.createChannel(channel);
  console.log('Notification channel "messages" created or already exists.');
};

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not initialized: Not a native platform.');
    return;
  }

  try {
    // **CRITICAL: Create the channel first**
    await createNotificationChannel();

    // Demander la permission
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      throw new Error('User denied permissions!');
    }

    // S'enregistrer auprès de Push Notifications
    await PushNotifications.register();

    // Le reste de la logique reste le même...
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      const fcmToken = token.value;
      await saveTokenToFirestore(userId, fcmToken);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification.notification.data);
      const chatId = notification.notification.data.chatId;
      if (chatId) {
        console.log(`Should navigate to chat: ${chatId}`);
        // Vous pouvez ajouter la logique de navigation ici, par exemple :
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
    // J'ai corrigé le chemin vers `fcmTokens` pour correspondre à votre base de données
    const tokenRef = doc(db, `users/${userId}/fcmTokens/${token}`);
    await setDoc(tokenRef, { createdAt: new Date() });
    console.log(`Token ${token} saved for user ${userId}`);
  } catch (e) {
    console.error("Error saving token to Firestore", e);
  }
};
