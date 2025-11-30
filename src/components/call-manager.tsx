'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video, X } from 'lucide-react';
import { getUserProfile } from '@/lib/firebase-actions';

interface CallData {
  id: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  callerImage: string;
  status: 'ringing' | 'active' | 'ended' | 'rejected';
  isVideo: boolean;
}

export function CallManager() {
  const router = useRouter();
  const [currentUser] = useAuthState(auth);
  const [incomingCall, setIncomingCall] = useState<CallData | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    const callsRef = collection(db, 'calls');
    const q = query(callsRef, where('calleeId', '==', currentUser.uid), where('status', '==', 'ringing'));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const callDoc = snapshot.docs[0];
        const callData = { id: callDoc.id, ...callDoc.data() } as CallData;
        
        const callerProfile = await getUserProfile(callData.callerId);
        callData.callerName = callerProfile?.firstName || 'Quelqu\'un';
        callData.callerImage = callerProfile?.profilePictures?.[0] || `https://picsum.photos/seed/${callData.callerId}/200`;

        setIncomingCall(callData);
      } else {
        setIncomingCall(null);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const callDocRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callDocRef, { status: 'active' });
    const callUrl = `/call/${incomingCall.id}?type=${incomingCall.isVideo ? 'video' : 'audio'}`;
    router.push(callUrl);
    setIncomingCall(null);
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    const callDocRef = doc(db, 'calls', incomingCall.id);
    await updateDoc(callDocRef, { status: 'rejected' });
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <Dialog open={!!incomingCall} onOpenChange={(isOpen) => !isOpen && handleRejectCall()}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Appel entrant</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
            <Avatar className="h-24 w-24 border-4 border-primary">
                <AvatarImage src={incomingCall.callerImage} alt={incomingCall.callerName} />
                <AvatarFallback>{incomingCall.callerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="text-lg font-semibold">{incomingCall.callerName} vous appelle</p>
            <div className="flex items-center gap-2 text-muted-foreground">
                {incomingCall.isVideo ? <Video className="h-5 w-5" /> : <Phone className="h-5 w-5" />}
                <span>Appel {incomingCall.isVideo ? 'vidéo' : 'audio'}</span>
            </div>
        </div>
        <DialogFooter className="flex justify-around gap-4">
          <Button onClick={handleRejectCall} variant="destructive" size="lg" className="rounded-full flex-1">
            <X className="mr-2 h-5 w-5" /> Refuser
          </Button>
          <Button onClick={handleAcceptCall} variant="success" size="lg" className="rounded-full flex-1">
            <Phone className="mr-2 h-5 w-5" /> Accepter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
