import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Assurez-vous que votre fichier firebase.ts exporte `app`
import { app } from '@/lib/firebase'; 

const db = getFirestore(app);

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not initialized: Not a native platform.');
    return;
  }

  try {
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

    // Récupérer le jeton FCM
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      const fcmToken = token.value;
      await saveTokenToFirestore(userId, fcmToken);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    // Gérer les notifications entrantes pendant que l'app est ouverte
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received:', notification);
    });

    // Gérer l'action lorsque l'utilisateur appuie sur la notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification.notification.data);
      const chatId = notification.notification.data.chatId;
      if (chatId) {
        console.log(`Should navigate to chat: ${chatId}`);
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
    const tokenRef = doc(db, `users/${userId}/tokens/${token}`);
    await setDoc(tokenRef, { createdAt: new Date() });
    console.log(`Token ${token} saved for user ${userId}`);
  } catch (e) {
    console.error("Error saving token to Firestore", e);
  }
};
