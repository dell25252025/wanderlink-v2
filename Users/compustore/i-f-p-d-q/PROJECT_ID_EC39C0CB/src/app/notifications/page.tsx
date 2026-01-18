'use client';

import { useRouter } from 'next/navigation';
import { User, Heart, Eye, UserPlus, MessageSquare, Phone } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, type Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  type: 'PROFILE_VIEW' | 'LIKE_PHOTO' | 'FRIEND_REQUEST' | 'MESSAGE' | 'VIDEO_CALL';
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto: string;
  message: string;
  createdAt: Timestamp;
  read: boolean;
  targetId?: string; // e.g., chatId, callId
}

const notificationIcons: { [key in Notification['type']]: { icon: React.ElementType, color: string } } = {
  PROFILE_VIEW: { icon: Eye, color: 'bg-blue-500' },
  LIKE_PHOTO: { icon: Heart, color: 'bg-pink-500' },
  FRIEND_REQUEST: { icon: UserPlus, color: 'bg-green-500' },
  MESSAGE: { icon: MessageSquare, color: 'bg-purple-500' },
  VIDEO_CALL: { icon: Phone, color: 'bg-red-500' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    setLoading(true);
    const notifsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, router]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!user) return;

    if (!notification.read) {
      const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
      await updateDoc(notifRef, { read: true }).catch(err => console.error("Failed to mark as read:", err));
    }

    switch (notification.type) {
      case 'PROFILE_VIEW':
      case 'LIKE_PHOTO':
      case 'FRIEND_REQUEST':
        router.push(`/profile?id=${notification.fromUserId}`);
        break;
      case 'MESSAGE':
      case 'VIDEO_CALL':
        router.push(`/chat?id=${notification.fromUserId}`);
        break;
      default:
        console.log(`No redirect action for type: ${notification.type}`);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Notifications" />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-2">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length > 0 ? (
            <ul className="space-y-2">
              {notifications.map((notif) => {
                const IconComponent = notificationIcons[notif.type]?.icon || User;
                const iconColor = notificationIcons[notif.type]?.color || 'bg-gray-500';

                return (
                  <li key={notif.id} onClick={() => handleNotificationClick(notif)} className="cursor-pointer">
                    <Card className={cn("transition-colors hover:bg-card/80", !notif.read && "bg-card")}>
                      <CardContent className="p-3 flex items-start gap-3 relative">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={notif.fromUserPhoto} alt={notif.fromUserName} />
                            <AvatarFallback>{notif.fromUserName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={cn("absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-white", iconColor)}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                        </div>
                        <div className="flex-1 text-sm">
                          <p className="text-foreground">
                            <span className="font-semibold">{notif.fromUserName}</span> {notif.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {notif.createdAt ? formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true, locale: fr }) : ''}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="absolute top-1/2 -translate-y-1/2 right-3 h-2.5 w-2.5 rounded-full bg-primary" />
                        )}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
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
