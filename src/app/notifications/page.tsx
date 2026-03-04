
'use client';

import { useRouter } from 'next/navigation';
import { User, Heart, Eye, UserPlus, Sparkles, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SettingsHeader } from '@/components/settings/settings-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Données factices pour les notifications
const notifications = [
  {
    id: 1,
    type: 'new_match',
    user: { id: 'user123', name: 'Sophia', avatarUrl: 'https://picsum.photos/seed/user1/200', isVerified: true },
    text: 'Vous avez un nouveau match !',
    timestamp: 'il y a 5 minutes',
    read: false,
  },
  {
    id: 5,
    type: 'friend_request',
    user: { id: 'user101', name: 'Liam', avatarUrl: 'https://picsum.photos/seed/user4/200', isVerified: false },
    text: 'vous a envoyé une demande d\'ami.',
    timestamp: 'il y a 25 minutes',
    read: false,
  },
  {
    id: 2,
    type: 'profile_visit',
    user: { id: 'user456', name: 'James', avatarUrl: 'https://picsum.photos/seed/user2/200', isVerified: false },
    text: 'a visité votre profil.',
    timestamp: 'il y a 1 heure',
    read: false,
  },
   {
    id: 6,
    type: 'photo_like',
    user: { id: 'user789', name: 'Isabella', avatarUrl: 'https://picsum.photos/seed/user3/200', isVerified: true },
    text: 'a aimé votre photo.',
    timestamp: 'il y a 2 heures',
    read: true,
  },
  {
    id: 3,
    type: 'profile_visit',
    user: { id: 'user789', name: 'Isabella', avatarUrl: 'https://picsum.photos/seed/user3/200', isVerified: true },
    text: 'a visité votre profil.',
    timestamp: 'il y a 3 heures',
    read: true,
  },
  {
    id: 4,
    type: 'new_match',
    user: { id: 'user101', name: 'Liam', avatarUrl: 'https://picsum.photos/seed/user4/200', isVerified: false },
    text: 'Vous avez un nouveau match !',
    timestamp: 'Hier',
    read: true,
  },
];

const notificationIcons: { [key: string]: { icon: React.ElementType, color: string } } = {
  new_match: { icon: Sparkles, color: 'bg-yellow-500' },
  profile_visit: { icon: Eye, color: 'bg-blue-500' },
  photo_like: { icon: Heart, color: 'bg-pink-500' },
  friend_request: { icon: UserPlus, color: 'bg-green-500' },
};

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title="Notifications" />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-2">
            {notifications.length > 0 ? (
                <ul className="space-y-2">
                    {notifications.map((notif) => {
                        const IconComponent = notificationIcons[notif.type]?.icon || User;
                        const iconColor = notificationIcons[notif.type]?.color || 'bg-gray-500';

                        return (
                            <li key={notif.id}>
                                <Link href={`/profile?id=${notif.user.id}`} className="block">
                                    <Card className={cn(
                                        "transition-colors hover:bg-card/80",
                                        !notif.read ? "bg-card" : "bg-card/60"
                                    )}>
                                        <CardContent className="p-3 flex items-start gap-3 relative">
                                            <div className="relative">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={notif.user.avatarUrl} alt={notif.user.name} />
                                                    <AvatarFallback>{notif.user.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div className={cn(
                                                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full flex items-center justify-center text-white",
                                                    iconColor
                                                )}>
                                                    <IconComponent className="h-3 w-3" />
                                                </div>
                                            </div>
                                            <div className="flex-1 text-sm">
                                                <p className="text-foreground">
                                                    <span className="font-semibold">{notif.user.name}</span>
                                                    {notif.user.isVerified && <CheckCircle className="inline-block h-3.5 w-3.5 text-blue-500 ml-1" />}
                                                    {' '}{notif.text}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{notif.timestamp}</p>
                                            </div>
                                             {!notif.read && (
                                                <div className="absolute top-1/2 -translate-y-1/2 right-3 h-2 w-2 rounded-full bg-primary" />
                                            )}
                                        </CardContent>
                                    </Card>
                                </Link>
                            </li>
                        )
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
