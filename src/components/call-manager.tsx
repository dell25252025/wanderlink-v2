'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { getUserProfile } from '@/lib/firebase-actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, X } from 'lucide-react';

interface CallData {
  id: string;
  callerId: string;
  receiverId: string; 
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  isVideo: boolean;
  [key: string]: any;
}

export function CallManager() { // Changement ici: export nommé
  const [currentUser] = useAuthState(auth);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);
  const [callerProfile, setCallerProfile] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    if (!currentUser) return;

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('receiverId', '==', currentUser.uid), where('status', '==', 'ringing'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = { id: callDoc.id, ...callDoc.data() } as CallData;
        
        if(window.location.pathname.startsWith('/call/')) return;

        setIncomingCall(callData);
        const profile = await getUserProfile(callData.callerId);
        setCallerProfile(profile);
      } else {
        setIncomingCall(null);
        setCallerProfile(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAcceptCall = useCallback(async () => {
    if (!incomingCall) return;
    const callDocRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callDocRef, { status: 'active' });
    setIncomingCall(null);
    router.push(`/call/${incomingCall.id}?type=${incomingCall.isVideo ? 'video' : 'audio'}`);
  }, [incomingCall, router]);

  const handleRejectCall = useCallback(async () => {
    if (!incomingCall) return;
    const callDocRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callDocRef, { status: 'rejected' });
    setIncomingCall(null);
  }, [incomingCall]);

  if (!incomingCall || !callerProfile) {
    return null;
  }

  return (
    <Dialog open={!!incomingCall} onOpenChange={(isOpen) => !isOpen && handleRejectCall()}>
        <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-gray-900 text-white border-0 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center justify-center text-center space-y-4 pt-12">
                <Avatar className="w-24 h-24 border-4 border-white/20">
                    <AvatarImage src={callerProfile?.profilePictures?.[0]} />
                    <AvatarFallback className="text-4xl bg-gray-600">{callerProfile?.firstName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <DialogHeader>
                    <DialogTitle className="text-3xl font-bold">{callerProfile?.firstName || 'Quelqu\'un'}</DialogTitle>
                    <DialogDescription className="text-lg text-white/80">
                        Appel {incomingCall.isVideo ? 'vidéo' : 'audio'} entrant...
                    </DialogDescription>
                </DialogHeader>
            </div>

            <DialogFooter className="absolute bottom-16 left-0 right-0 flex flex-row items-center justify-around w-full">
                <div className="flex flex-col items-center space-y-2">
                    <Button variant="destructive" size="icon" className="rounded-full w-16 h-16" onClick={handleRejectCall}>
                        <X className="h-8 w-8" />
                    </Button>
                    <span className="text-sm">Refuser</span>
                </div>
                <div className="flex flex-col items-center space-y-2">
                    <Button variant="success" size="icon" className="rounded-full w-16 h-16 bg-green-500 hover:bg-green-600" onClick={handleAcceptCall}>
                        {incomingCall.isVideo ? <Video className="h-8 w-8" /> : <Phone className="h-8 w-8" />}
                    </Button>
                    <span className="text-sm">Accepter</span>
                </div>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );
}
