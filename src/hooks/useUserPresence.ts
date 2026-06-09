import { useEffect } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from 'firebase/database';
import { App } from '@capacitor/app';
import { useAuth } from '@/context/AuthContext';
import { firestore, database } from '@/lib/firebase';

export const useUserPresence = () => {
  const { currentUser: user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    // Si il n'y a pas d'utilisateur, on ne fait rien.
    // La fonction de nettoyage de l'effet précédent (si il y en avait un)
    // aura déjà été appelée et aura mis l'utilisateur hors ligne.
    if (!uid) {
      return;
    }

    const userDocRef = doc(firestore, 'users', uid);
    const presenceRef = ref(database, `/status/${uid}`);

    // J'ai vu dans `firebase-actions.ts` que le champ est `isOnline`, et pas `online`.
    // Je corrige ici pour la cohérence.
    const amOnline = {
      isOnline: true,
      lastSeen: serverTimestamp(),
    };

    const amOffline = {
      isOnline: false,
      lastSeen: serverTimestamp(),
    };

    const goOffline = () => {
      updateDoc(userDocRef, amOffline).catch(err => console.error("Error setting offline status:", err));
      set(presenceRef, amOffline).catch(err => console.error("Error setting offline status in RTDB:", err));
    };

    const goOnline = () => {
      updateDoc(userDocRef, amOnline).catch(err => console.error("Error setting online status:", err));
      set(presenceRef, amOnline).catch(err => console.error("Error setting online status in RTDB:", err));
    };


    const connectedRef = ref(database, '.info/connected');
    const listener = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        goOnline();

        onDisconnect(presenceRef).set(amOffline);
        const userDocOnDisconnect = onDisconnect(userDocRef);
        userDocOnDisconnect.update(amOffline);
      }
    });

    const appStateListener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) goOnline();
      else goOffline();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') goOnline();
      else goOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', goOffline);

    // Lorsque le `user` change (y compris lors de la déconnexion),
    // la fonction de nettoyage de CET effet est appelée. C'est la clé pour corriger le bug.
    return () => {
      console.log(`[Presence] Nettoyage pour l'utilisateur ${uid}`); // Pour le débogage
      
      // Détacher tous les listeners pour éviter les fuites de mémoire
      listener();
      appStateListener.remove();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', goOffline);

      // Le plus important : mettre le statut à hors ligne lors du nettoyage.
      // Ceci va maintenant s'exécuter correctement quand l'utilisateur se déconnecte.
      goOffline();
    };

  }, [user]); // L'effet dépend UNIQUEMENT de l'objet `user`
};
