import { useEffect } from 'react';
import { User } from 'firebase/auth';

// Version de diagnostic minimale du hook.
// Elle accepte l'argument 'user' pour correspondre à l'appel existant, mais ne l'utilise pas.
export const useUserPresence = (user: User | null) => {
  useEffect(() => {
    if (user) {
      console.log("[DIAGNOSTIC] Le hook useUserPresence (version vide) est monté pour l'utilisateur:", user.uid);
    } else {
      console.log("[DIAGNOSTIC] Le hook useUserPresence (version vide) est monté, mais il n'y a pas d'utilisateur.");
    }
    // Ce hook ne fait absolument rien d'autre.
    // Pas d'accès à la base de données, pas de logique complexe.
  }, [user]);
};
