"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/context/navigation-context";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";

export default function NavigationExecutor() {
  const router = useRouter();
  const { pendingRoute, setPendingRoute } = useNavigation();
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    if (!pendingRoute) return;

    // Attendre que Firebase soit prêt
    if (loading) {
      console.log("[NavigationExecutor] Auth en chargement...");
      return;
    }

    // Attendre que l'utilisateur soit chargé
    if (!user) {
      console.log("[NavigationExecutor] Pas d'utilisateur encore, annulation de la navigation.");
      setPendingRoute(null); // Annuler si pas d'utilisateur après chargement
      return;
    }

    console.log("[NavigationExecutor] Auth prête. Navigation vers:", pendingRoute);

    router.push(pendingRoute);
    setPendingRoute(null);

  }, [pendingRoute, loading, user, router, setPendingRoute]);

  return null;
}