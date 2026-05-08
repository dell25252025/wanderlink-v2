
'use client';

import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, writeBatch, where, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, BellOff, MessageSquare, Heart, UserPlus, UserCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addFriend } from '@/lib/firebase-actions';
import { useToast } from "@/hooks/use-toast";

interface Notification {
    id: string;
    type: 'message' | 'like' | 'friend_request' | 'friend_accept';
    chatId?: string; 
    photoUrl?: string;
    senderId: string;
    senderName: string;
    text: string;
    createdAt: any;
    read: boolean;
    requestId?: string; 
}

export default function NotificationsPage() {
    const [user] = useAuthState(auth);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();
    const [handlingRequest, setHandlingRequest] = useState<string | null>(null);

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
        if (notif.type === 'friend_request' && !notif.read) return;

        if (!user) return;
        const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
        if (!notif.read) {
            await updateDoc(notifRef, { read: true });
        }

        if (notif.type === 'message' && notif.chatId) {
            router.push(`/chat?id=${notif.chatId}`);
        } else if (notif.type === 'like' || notif.type === 'friend_request' || notif.type === 'friend_accept') {
            router.push(`/profile?id=${notif.senderId}`);
        }
    };
    
    const handleFriendRequest = async (notif: Notification, action: 'accept' | 'decline') => {
        if (!user || handlingRequest) return;
        setHandlingRequest(notif.id);

        try {
            const requestsRef = collection(db, "friend_requests");
            const q = query(requestsRef, 
                            where("senderId", "==", notif.senderId),
                            where("receiverId", "==", user.uid),
                            where("status", "==", "pending"));
            const requestSnapshot = await getDocs(q);

            if (requestSnapshot.empty) {
                toast({ title: "Demande introuvable", description: "Cette demande d’ami n’existe plus.", variant: "destructive" });
                 const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
                await updateDoc(notifRef, { read: true });
                return;
            }
            
            const requestDoc = requestSnapshot.docs[0];

            if (action === 'accept') {
                await addFriend(user.uid, notif.senderId);
                await updateDoc(requestDoc.ref, { status: 'accepted' });
                
                // Envoyer une notification à l'expéditeur initial
                await addDoc(collection(db, `users/${notif.senderId}/notifications`), {
                    type: "friend_accept",
                    senderId: user.uid,
                    senderName: user.displayName || "Un utilisateur",
                    text: "a accepté votre demande d’ami.",
                    createdAt: serverTimestamp(),
                    read: false,
                });

                toast({ title: "Ami ajouté!", description: `Vous et ${notif.senderName} êtes maintenant amis.` });
            } else {
                await updateDoc(requestDoc.ref, { status: 'rejected' });
                toast({ title: "Demande refusée" });
            }
            
            const notifRef = doc(db, `users/${user.uid}/notifications`, notif.id);
            await updateDoc(notifRef, { read: true });

        } catch(error) {
            console.error("Erreur lors du traitement de la demande d’ami:", error);
            toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive"});
        } finally {
            setHandlingRequest(null);
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

    const renderIcon = (type: Notification['type']) => {
        switch (type) {
            case 'message':
                return <MessageSquare className="h-5 w-5 text-primary" />;
            case 'like':
                return <Heart className="h-5 w-5 text-red-500" />;
            case 'friend_request':
                return <UserPlus className="h-5 w-5 text-blue-500" />;
            case 'friend_accept':
                return <UserCheck className="h-5 w-5 text-green-500" />;
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
                                    'p-3 flex items-start space-x-3',
                                    !notif.read && 'bg-primary/5',
                                    !((notif.type === 'friend_request' && !notif.read)) && 'cursor-pointer hover:bg-muted/50'
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
                                     {notif.type === 'friend_request' && !notif.read && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Button size="sm" className="h-7 px-2" onClick={(e) => {e.stopPropagation(); handleFriendRequest(notif, 'accept');}} disabled={handlingRequest === notif.id}>
                                                {handlingRequest === notif.id ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Accepter'}
                                            </Button>
                                            <Button size="sm" className="h-7 px-2" variant="ghost" onClick={(e) => {e.stopPropagation(); handleFriendRequest(notif, 'decline');}} disabled={handlingRequest === notif.id}>
                                                Refuser
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {!notif.read && (
                                    <div className="w-2 h-2 mt-2 rounded-full bg-primary shrink-0"></div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
