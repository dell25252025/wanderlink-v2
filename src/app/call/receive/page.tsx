
'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PhoneOff, Mic, MicOff, Volume2, VolumeX, Loader2, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/lib/firebase-actions';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

function ReceiveCallUI() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [otherUser, setOtherUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, ended
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const callId = searchParams.get('callId');
  const isVideoCall = searchParams.get('video') === 'true';

  useEffect(() => {
    setIsVideoOn(isVideoCall);

    const initialize = async () => {
      if (!callId) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'ID d\'appel manquant.' });
        router.push('/');
        return;
      }
      
      const callDocRef = doc(db, 'calls', callId);
      const callDocSnap = await getDoc(callDocRef);

      if (!callDocSnap.exists()) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Appel non trouvé.' });
        router.push('/');
        return;
      }
      
      const callData = callDocSnap.data();
      const callerId = callData.callerId;
      const profile = await getUserProfile(callerId);
      setOtherUser(profile);
      setLoading(false);

      pc.current = new RTCPeerConnection(servers);
      remoteStream.current = new MediaStream();

      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: isVideoCall });
        localStream.current.getTracks().forEach((track) => {
          pc.current?.addTrack(track, localStream.current!);
        });
        if (localVideoRef.current && localStream.current) {
            localVideoRef.current.srcObject = localStream.current;
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur Média', description: 'Impossible d\'accéder au microphone ou à la caméra.' });
        handleEndCall();
        return;
      }

      pc.current.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        if (remoteVideoRef.current && remoteStream.current) {
            remoteVideoRef.current.srcObject = remoteStream.current;
        }
      };

      await answerCall(callDocRef, callData.offer);
    };

    const answerCall = async (callDocRef: any, offer: any) => {
        if (!pc.current) return;

        const answerCandidates = collection(callDocRef, 'answerCandidates');
        const offerCandidates = collection(callDocRef, 'offerCandidates');

        pc.current.onicecandidate = (event) => {
            event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
        };

        await pc.current.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(callDocRef, { answer, status: 'connected' });
        setCallStatus('connected');

        onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    pc.current?.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                }
            });
        });

        // Listen for call termination
        onSnapshot(callDocRef, (snapshot) => {
             if (!snapshot.exists()) {
                setCallStatus('ended');
                toast({ title: 'Appel terminé', description: 'Votre correspondant a raccroché.' });
                setTimeout(() => handleEndCall(false), 1500);
            }
        });
    };

    initialize();

    return () => {
      handleEndCall(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndCall = async (notify = true) => {
    setCallStatus('ended');
    pc.current?.close();
    localStream.current?.getTracks().forEach((track) => track.stop());

    if (callId) {
      const callDocRef = doc(db, 'calls', callId);
       if((await getDoc(callDocRef)).exists()){
        await deleteDoc(callDocRef);
      }
    }
    
    pc.current = null;
    localStream.current = null;
    remoteStream.current = null;

    if (notify) {
        router.back();
    }
  };
  
  const toggleMute = () => {
    if (localStream.current) {
        localStream.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(!isMuted);
    }
  };

   const toggleVideo = () => {
    if (localStream.current) {
        localStream.current.getVideoTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsVideoOn(!isVideoOn);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const otherUserName = otherUser?.firstName || 'Utilisateur';
  const otherUserImage = otherUser?.profilePictures?.[0] || `https://picsum.photos/seed/${otherUser?.id}/200`;

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-between bg-slate-900 text-white p-8">
       <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/30" />

      <video ref={localVideoRef} autoPlay muted playsInline className={cn(
          "absolute top-4 right-4 w-1/4 max-w-[150px] rounded-lg shadow-lg border-2 border-white/50",
          !isVideoOn && "hidden"
      )} />

      <div className="relative z-10 flex flex-col items-center text-center mt-16 [text-shadow:_0_1px_4px_rgb(0_0_0_/_50%)]">
        <Avatar className="h-32 w-32 border-4 border-white/50">
          <AvatarImage src={otherUserImage} alt={otherUserName} />
          <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
        </Avatar>
        <h1 className="mt-6 text-3xl font-bold">{otherUserName}</h1>
        <p className="mt-2 text-lg text-slate-300">
          {callStatus === 'connecting' && 'Connexion...'}
          {callStatus === 'connected' && 'Connecté'}
          {callStatus === 'ended' && 'Appel terminé'}
        </p>
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20"
            onClick={toggleMute}
          >
            {isMuted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20"
            onClick={toggleVideo}
            disabled={!isVideoCall}
          >
            {isVideoOn ? <Video className="h-7 w-7" /> : <VideoOff className="h-7 w-7" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-16 w-16 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setIsDeafened(!isDeafened)}
            disabled
          >
            {isDeafened ? <VolumeX className="h-7 w-7" /> : <Volume2 className="h-7 w-7" />}
          </Button>
        </div>
        <Button
          size="lg"
          className="h-16 w-16 rounded-full bg-red-600 hover:bg-red-700"
          onClick={() => handleEndCall()}
        >
          <PhoneOff className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

export default function ReceiveCallPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-900 text-white">
              <Loader2 className="h-16 w-16 animate-spin" />
            </div>
        }>
            <ReceiveCallUI />
        </Suspense>
    )
}
