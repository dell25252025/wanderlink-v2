
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, CheckCircle, MessageSquare, User, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getFriends, removeFriend } from '@/lib/firebase-actions';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { DocumentData } from 'firebase/firestore';
import WanderlinkHeader from '@/components/wanderlink-header';
import BottomNav from '@/components/bottom-nav';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function FriendsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<DocumentData[]>([]);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
  
  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;
    const result = await removeFriend(currentUser.uid, friendId);
    if (result.success) {
      setFriends(prevFriends => prevFriends.filter(friend => friend.id !== friendId));
      toast({ title: 'Ami retiré' });
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.firstName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <WanderlinkHeader />
      <main className="flex-1 pb-24 pt-20">
        <div className="container mx-auto max-w-7xl px-2">
            <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un ami..."
                  className="pl-10 h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredFriends.length > 0 ? (
                <ul className="divide-y divide-border">
                    {filteredFriends.map((friend) => (
                        <li key={friend.id} className="flex items-center gap-2 p-3 hover:bg-muted/50">
                            <Link href={`/profile?id=${friend.id}`} className="flex flex-1 items-center gap-4 min-w-0">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={friend.profilePictures?.[0]} alt={friend.firstName} />
                                    <AvatarFallback>{friend.firstName?.charAt(0) || 'A'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-semibold truncate flex items-center gap-1.5">
                                      {friend.firstName}
                                      {friend.isVerified && <CheckCircle className="h-4 w-4 text-blue-500" />}
                                    </p>
                                    <p className="text-sm text-muted-foreground truncate">
                                      {friend.location || 'Lieu non spécifié'}
                                    </p>
                                </div>
                            </Link>
                            <div className="flex items-center gap-1">
                                <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                                    <Link href={`/chat?id=${friend.id}`}>
                                        <MessageSquare className="h-5 w-5" />
                                    </Link>
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive">
                                            <UserX className="h-5 w-5" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Retirer {friend.firstName} de vos amis ?</AlertDialogTitle>
                                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleRemoveFriend(friend.id)} className="bg-destructive hover:bg-destructive/90">
                                                Retirer
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="flex min-h-[calc(100vh-250px)] flex-col items-center justify-center text-center px-4">
                    <User className="h-16 w-16 text-muted-foreground" />
                    <h2 className="mt-6 text-2xl font-bold">
                      {searchTerm ? "Aucun ami trouvé" : "Vous n'avez aucun ami"}
                    </h2>
                    <p className="mt-2 max-w-xs text-muted-foreground">
                      {searchTerm ? "Essayez une recherche différente." : "Commencez à explorer pour vous faire de nouveaux amis voyageurs !"}
                    </p>
                    <Button asChild className="mt-6">
                        <Link href="/">Découvrir</Link>
                    </Button>
                </div>
            )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
