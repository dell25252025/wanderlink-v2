'use client';

import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { updateUserPresence } from '@/lib/firebase-actions';
import { PushNotifications, ActionPerformed } from '@capacitor/push-notifications';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';

declare global {
  interface Window {
    handleCallAction: (action: 'accept' | 'reject', callId: string, channelName?: string) => void;
  }
}

const CapacitorSetup = () => {
  const router = useRouter();
  
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      console.log('Initialisation de Capacitor...');

      GoogleAuth.initialize({
        clientId: '186522309970-kimg8pa9cd9lrmbl9uajk129nb0lrre2.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      SplashScreen.hide();

       PushNotifications.addListener('pushNotificationActionPerformed',
        (action: ActionPerformed) => {
          const data = action.notification.data;
          console.log('Action de notification effectuée : ', action.actionId, data);
          if (data.callAction === 'accept' && data.channel) {
             router.push(`/call/${data.channel}`);
           } else if (data.callAction === 'reject' && data.callId) {
             window.handleCallAction('reject', data.callId);
           } else if (data.type === 'MESSAGE' && data.senderId) {
              router.push(`/chat?id=${data.senderId}`);
           }
        }
      );
    }

    window.handleCallAction = (action, callId, channelName) => {
        if (action === 'accept' && channelName) {
            router.push(`/call/${channelName}`);
        } else if (action === 'reject') {
            const callDocRef = doc(db, 'calls', callId);
            updateDoc(callDocRef, { status: 'rejected' }).catch(err => {
                console.error("Impossible de refuser l'appel via la fonction window", err);
            });
        }
    };
    

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        updateUserPresence(user.uid, true);
        App.addListener('appStateChange', ({ isActive }) => {
          updateUserPresence(user.uid, isActive);
        });
      }
    });

    return () => {
      unsubscribe();
      // @ts-ignore
      delete window.handleCallAction;
    };
  }, [router]);

  return null; 
};

export default CapacitorSetup;
