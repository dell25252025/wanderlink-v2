import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, PermissionStatus } from '@capacitor/push-notifications';

// Assurez-vous que votre fichier firebase.ts exporte `app`
import { app } from '@/lib/firebase'; 

const db = getFirestore(app);

export const initPushNotifications = async (userId: string) => {
  if (!Capacitor.isNativePlatform()) {
    console.log('Push notifications not initialized: Not a native platform.');
    return;
  }

  try {
    // 1. Demander la permission
    let permStatus: PermissionStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }
    if (permStatus.receive !== 'granted') {
      throw new Error('User denied push permissions!');
    }

    // 2. S'enregistrer auprès de FCM
    await PushNotifications.register();

    // 3. Listener pour le token (succès de l'enregistrement)
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token:', token.value);
      await saveTokenToFirestore(userId, token.value);
    });

    // 4. Listener pour les erreurs
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    // 5. Listener pour l'ACTION de l'utilisateur (quand il tape sur la notif)
    // C'EST LE SEUL LISTENER DONT NOUS AVONS BESOIN POUR LA LOGIQUE APPLICATIVE
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
