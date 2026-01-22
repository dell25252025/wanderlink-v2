
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
        (notification: ActionPerformed) => {
          const data = notification.notification.data;
          console.log('Action de notification effectuée : ', notification.actionId, data);

          if (data.type === 'INCOMING_CALL' && data.callId) {
              // L'action "accept" est pour notre bouton personnalisé, "tap" est pour un appui sur la notification elle-même
              if (notification.actionId === 'accept' || notification.actionId === 'tap') { 
                  router.push(`/call/${data.callId}`);
              } 
              // L'action "reject" pour refuser l'appel
              else if (notification.actionId === 'reject') {
                  const callDocRef = doc(db, 'calls', data.callId);
                  updateDoc(callDocRef, { status: 'rejected' }).catch(err => {
                      console.error("Impossible de refuser l'appel depuis la notification", err);
                  });
              }
          } else if (data.type === 'MESSAGE' && data.senderId) {
              router.push(`/chat?id=${data.senderId}`);
          }
        }
      );
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        updateUserPresence(user.uid, true);

        App.addListener('appStateChange', ({ isActive }) => {
          updateUserPresence(user.uid, isActive);
        });

        if (!Capacitor.isNativePlatform()) {
          const handleVisibilityChange = () => {
            updateUserPresence(user.uid, document.visibilityState === 'visible');
          };
          const handleBeforeUnload = () => {
            updateUserPresence(user.uid, false);
          };

          window.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('beforeunload', handleBeforeUnload);

          return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
          };
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  return null; 
};

export default CapacitorSetup;
