
"use client";

import { useUserPresence } from "@/hooks/useUserPresence";

// This component handles the user's online presence updates.
// It does not render any UI, it just runs the hook.
export function UserPresenceHandler() {
  useUserPresence();
  return null;
}
