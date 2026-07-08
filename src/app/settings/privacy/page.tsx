
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext'; // Chemin confirmé
import { db } from '@/lib/firebase'; // Corrigé : utilise 'db' au lieu de 'firestore'

import { Eye, MessageSquare, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { SettingsHeader } from '@/components/settings/settings-header';

export default function PrivacySettingsPage() {
  const { currentUser } = useAuth();
  const [showOnlineStatus, setShowOnlineStatus] = useState(true); 

  // ... (les autres états sont conservés pour la complétude de votre page)
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid); // Corrigé
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data();
        setShowOnlineStatus(userData.showOnlineStatus !== false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleToggleOnlineStatus = async (isActive: boolean) => {
    if (!currentUser?.uid) return;

    const userRef = doc(db, 'users', currentUser.uid); // Corrigé
    try {
      await updateDoc(userRef, {
        showOnlineStatus: isActive,
        isOnline: isActive,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut en ligne:", error);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
        <SettingsHeader title="Confidentialité" />
        <main className="px-2 py-4 md:px-4 pt-16">
            <div className="mx-auto max-w-2xl space-y-4">
                <Card>
                    <CardHeader className="p-4">
                        <CardTitle className="flex items-center gap-2 text-base"><Eye className="h-5 w-5"/> Visibilité</CardTitle>
                        <CardDescription className="text-sm">Contrôlez qui peut voir votre profil.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 p-4 pt-0">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="online-status" className="text-sm">Afficher mon statut "En ligne"</Label>
                            <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={handleToggleOnlineStatus} />
                        </div>
                         <div className="flex items-center justify-between rounded-lg border p-4">
                            <Label htmlFor="recent-activity" className="text-sm">Afficher mon activité récente</Label>
                            <Switch id="recent-activity" checked={showRecentActivity} onCheckedChange={setShowRecentActivity} disabled />
                        </div>
                    </CardContent>
                </Card>
                {/* ... Autres cartes ... */}
            </div>
        </main>
    </div>
  );
}
