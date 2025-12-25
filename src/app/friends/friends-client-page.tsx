
"use client";

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getUserProfile } from '@/lib/firebase-actions';
import type { DocumentData } from 'firestore';
import { Loader2, UserX, Send, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
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
import { removeFriend } from '@/lib/firebase-actions';
import { useToast } from '@/hooks/use-toast';

export default function FriendsClientPage() {
  const [friends, setFriends] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        // @ts-ignore
        setCurrentUser(user);
        const userProfile = await getUserProfile(user.uid);
        if (userProfile && userProfile.friends) {
          const friendPromises = userProfile.friends.map((friendId: string) => getUserProfile(friendId));
          const friendsData = await Promise.all(friendPromises);
          // @ts-ignore
          setFriends(friendsData.filter(friend => friend)); // Filter out any null profiles
        }
      } else {
        setCurrentUser(null);
        setFriends([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser) return;

    // @ts-ignore
    const result = await removeFriend(currentUser.uid, friendId);
    if (result.success) {
      setFriends(prevFriends => prevFriends.filter(friend => friend.uid !== friendId));
      toast({ title: 'Ami retiré' });
    } else {
      toast({ variant: 'destructive', title: 'Erreur', description: result.error });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement des amis...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
        <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold">Veuillez vous connecter</h2>
            <p className="text-muted-foreground">Vous devez être connecté pour voir vos amis.</p>
            <Button asChild className="mt-4">
                <Link href="/login">Se connecter</Link>
            </Button>
        </div>
    );
  }

  if (friends.length === 0) {
    return (
        <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center text-center px-4">
            <User className="h-16 w-16 text-muted-foreground" />
            <h2 className="mt-6 text-2xl font-bold">Aucun ami pour le moment</h2>
            <p className="mt-2 text-muted-foreground">Partez à la découverte pour rencontrer de nouvelles personnes !</p>
            <Button asChild className="mt-6">
                <Link href="/discover">Découvrir</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl py-4 px-4">
      <h1 className="text-2xl font-bold mb-4">Mes Amis</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {friends.map(friend => (
          <div key={friend.uid} className="bg-card p-4 rounded-lg shadow-sm flex flex-col items-center text-center">
            <Link href={`/profile?id=${friend.uid}`} className="w-full">
                <div className="relative h-24 w-24 rounded-full overflow-hidden mx-auto">
                <Image 
                    src={friend.profilePictures?.[0] || '/default-avatar.png'} 
                    alt={friend.firstName} 
                    fill
                    className="object-cover"
                />
                </div>
                <h3 className="mt-2 text-lg font-semibold">{friend.firstName}, {friend.age}</h3>
                <p className="text-sm text-muted-foreground">{friend.location}</p>
            </Link>
            <div className="mt-4 flex w-full gap-2">
               <Button asChild size="sm" className="flex-1">
                 <Link href={`/chat?id=${friend.uid}`}>
                   <Send className="mr-2 h-4 w-4" /> Message
                 </Link>
               </Button>
               <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                        <UserX className="h-4 w-4" />
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Retirer {friend.firstName} de vos amis ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action ne peut pas être annulée.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemoveFriend(friend.uid)} className="bg-destructive hover:bg-destructive/90">
                      Retirer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
