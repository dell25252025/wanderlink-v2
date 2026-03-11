import { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications, PermissionStatus } from '@capacitor/local-notifications';

// Assurez-vous que votre fichier firebase.ts exporte `app`
import { app } from '@/lib/firebase'; 

const db = getFirestore(app);

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not initialized: Not a native platform.');
    return;
  }

  try {
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      throw new Error('User denied push permissions!');
    }

    await PushNotifications.register();

    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      await saveTokenToFirestore(userId, token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed:', notification.notification.data);
      const chatId = notification.notification.data.chatId;
      if (chatId) {
        console.log(`Dispatching openChat event for chat: ${chatId}`);
        const event = new CustomEvent('openChat', { detail: chatId });
        window.dispatchEvent(event);
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
