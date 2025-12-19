
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserPlus, Loader2, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFriends } from '@/lib/firebase-actions';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { DocumentData } from 'firebase/firestore';
import { SettingsHeader } from '@/components/settings/settings-header';

export default function FriendsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<DocumentData[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUser(user);
        fetchFriends(user.uid);
      } else {
        router.push('/login');
      }
    });

    const fetchFriends = async (uid: string) => {
      setLoading(true);
      try {
        const friendsList = await getFriends(uid);
        setFriends(friendsList);
      } catch (error) {
        console.error('Failed to fetch friends:', error);
      } finally {
        setLoading(false);
      }
    };
    
    return () => unsubscribe();
  }, [router]);

  const filteredFriends = friends.filter(friend =>
    friend.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen flex-col bg-secondary/30">
      <SettingsHeader title="Mes Amis" />
      <main className="flex-1 overflow-y-auto pt-16">
        <div className="container mx-auto max-w-2xl px-2">
            <Card>
                <CardHeader className="p-3">
                    <CardTitle className="text-sm">Mes Amis</CardTitle>
                    <CardDescription className="text-xs">Retrouvez ici les voyageurs avec qui vous avez connecté.</CardDescription>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                    <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                        placeholder="Rechercher un ami..."
                        className="pl-9 h-8 text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {loading ? (
                      <div className="flex justify-center items-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : filteredFriends.length > 0 ? (
                        <ul className="space-y-2">
                        {filteredFriends.map((friend) => (
                            <li key={friend.id} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-muted/50">
                                <Link href={`/profile?id=${friend.id}`} className="flex flex-1 items-center gap-2 min-w-0">
                                    <Avatar className="h-8 w-8">
                                    <AvatarImage src={friend.profilePictures?.[0]} alt={friend.firstName} />
                                    <AvatarFallback>{friend.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold truncate text-xs flex items-center gap-1">
                                          {friend.firstName}
                                          {friend.isVerified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                                        </p>
                                    </div>
                                </Link>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => router.push(`/chat?id=${friend.id}`)}>
                                    Message
                                </Button>
                            </li>
                        ))}
                        </ul>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-xs text-muted-foreground mb-3">Vous n'avez aucun ami pour le moment.</p>
                            <Button size="sm" onClick={() => router.push('/')} className="text-xs">
                                <UserPlus className="mr-2 h-3 w-3" />
                                Découvrir des profils
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </main>
    </div>
  );
}
