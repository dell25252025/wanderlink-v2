
'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, BellOff, MessageSquare, Heart, UserPlus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
    id: string;
    type: 'message' | 'like' | 'friend_request';
    chatId?: string; 
    photoUrl?: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
    read: boolean;
}

export default function NotificationsPage() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(collection(db, `users/${user.uid}/notifications`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(notifs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching notifications: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notif: Notification) => {
        if (!user) return;
        const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
        if (!notif.read) {
            const batch = writeBatch(db);
            batch.update(notifRef, { read: true });
            await batch.commit();
        }

        if (notif.type === 'message' && notif.chatId) {
            router.push(`/chat?id=${notif.chatId}`);
        } else if (notif.type === 'like') {
            router.push(`/profile?id=${notif.senderId}`);
        } else if (notif.type === 'friend_request') {
            router.push(`/profile?id=${notif.senderId}`);
        }
    };

    const markAllAsRead = async () => {
        if (!user || notifications.length === 0) return;
        const batch = writeBatch(db);
        notifications.forEach(notif => {
            if (!notif.read) {
                const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
                batch.update(notifRef, { read: true });
            }
        });
        await batch.commit();
    };

    const renderIcon = (type: 'message' | 'like' | 'friend_request') => {
        switch (type) {
            case 'message':
                return <MessageSquare className="h-5 w-5 text-primary" />;
            case 'like':
                return <Heart className="h-5 w-5 text-red-500" />;
            case 'friend_request':
                return <UserPlus className="h-5 w-5 text-blue-500" />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[80vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto my-4 shadow-none border-0">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Notifications</CardTitle>
                <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={notifications.every(n => n.read)}>
                    Tout marquer comme lu
                </Button>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="text-center py-20">
                        <BellOff className="mx-auto h-12 w-12 text-muted-foreground" />
                        <h3 className="mt-2 text-sm font-medium">Aucune notification</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Les nouvelles notifications apparaîtront ici.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {notifications.map((notif) => (
                            <li
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={cn(
                                    'p-3 flex items-start space-x-3 cursor-pointer hover:bg-muted/50',
                                    !notif.read && 'bg-primary/5'
                                )}
                            >
                                <div className="mt-1">{renderIcon(notif.type)}</div>
                                <div className="flex-1">
                                    <p className="text-sm">
                                        <span className="font-semibold">{notif.senderName}</span>{' '}
                                        {notif.text}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {notif.createdAt && formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                                {!notif.read && (
                                    <div className="mt-2 w-2 h-2 rounded-full bg-primary"></div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
