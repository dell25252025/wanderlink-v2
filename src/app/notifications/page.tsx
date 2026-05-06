'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: string;
    chatId: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
    read: boolean;
}

export default function NotificationsPage() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const router = useRouter();

    // Étape 1: Récupérer les notifications en temps réel
    useEffect(() => {
        if (!user) return;

        const notificationsRef = collection(db, `users/${user.uid}/notifications`);
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
        });

        return () => unsubscribe();
    }, [user]);

    // Étape 2: Marquer toutes les notifications comme lues à l'ouverture de la page
    useEffect(() => {
        if (!user || notifications.length === 0) return;

        const unreadNotifications = notifications.filter(n => !n.read);

        if (unreadNotifications.length > 0) {
            const batch = writeBatch(db);
            unreadNotifications.forEach(notif => {
                const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
                batch.update(notifRef, { read: true });
            });

            batch.commit().catch(console.error);
        }
    }, [notifications, user]); // Se déclenche quand les notifications sont chargées

    const handleNotificationClick = (notification: Notification) => {
        // La redirection se produit, et le useEffect ci-dessus s'occupe déjà de marquer comme lu.
        if (notification.type === 'message') {
            router.push(`/chat/${notification.chatId}`);
        }
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            <SettingsHeader title="Notifications" />
            <main className="px-2 py-4 md:px-4 pt-16">
                <div className="mx-auto max-w-2xl space-y-2">
                    {notifications.length > 0 ? (
                        <ul className="space-y-2">
                            {notifications.map((notif) => (
                                <li key={notif.id} onClick={() => handleNotificationClick(notif)} className="cursor-pointer">
                                   <Card className={cn(
                                        "transition-colors hover:bg-card/80",
                                        !notif.read ? "bg-card" : "bg-card/60"
                                    )}>
                                        <CardContent className="p-3 flex items-start gap-3 relative">
                                            <Avatar className="h-10 w-10">
                                                <AvatarFallback>{notif.senderName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-sm">
                                                <p className="text-foreground">
                                                    <span className="font-semibold">{notif.senderName}</span>
                                                    {' '}{notif.text}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {notif.createdAt?.toDate ? new Date(notif.createdAt.toDate()).toLocaleString() : ''}
                                                </p>
                                            </div>
                                            {/* Le point bleu n'est plus nécessaire car tout est lu immédiatement */}
                                        </CardContent>
                                    </Card>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-16">
                            <p className="text-muted-foreground">Vous n'avez aucune notification.</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
