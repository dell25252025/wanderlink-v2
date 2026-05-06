'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

    const handleNotificationClick = async (notification: Notification) => {
        if (notification.type === 'message') {
            router.push(`/chat/${notification.chatId}`);
        }
        // Pour d'autres types de notifications, la navigation peut être différente
        // Par exemple: router.push(`/profile/${notification.senderId}`);

        if (!notification.read) {
            const notifRef = doc(db, `users/${user!.uid}/notifications`, notification.id);
            await updateDoc(notifRef, { read: true });
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
                                <li key={notif.id} onClick={() => handleNotificationClick(notif)}>
                                   <Card className={cn(
                                        "transition-colors hover:bg-card/80",
                                        !notif.read ? "bg-card" : "bg-card/60"
                                    )}>
                                        <CardContent className="p-3 flex items-start gap-3 relative">
                                            <Avatar className="h-10 w-10">
                                                {/* Idéalement, vous auriez l'URL de l'avatar de l'expéditeur ici */}
                                                <AvatarFallback>{notif.senderName.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-sm">
                                                <p className="text-foreground">
                                                    <span className="font-semibold">{notif.senderName}</span>
                                                    {' '}{notif.text}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {new Date(notif.createdAt?.toDate()).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <div className="absolute top-1/2 -translate-y-1/2 right-3 h-2 w-2 rounded-full bg-primary" />
                                            )}
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
