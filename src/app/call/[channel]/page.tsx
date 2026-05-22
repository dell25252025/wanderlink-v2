'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { agoraConfig } from '@/lib/agora-config';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserProfile, sendCallSystemMessage } from '@/lib/firebase-actions';

import { Loader2 } from 'lucide-react';
import CallControls from '@/components/CallControls';

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
const ringingSound = new Audio('https://ik.imagekit.io/fip3ktm2p/telephone-tonalite-Europe-retour-appel-425Hz.mp3');
ringingSound.loop = true;

// Fonction pour mettre à jour le statut de l'appel à 'active'
const acceptCall = async (channelName: string) => {
  const callDocRef = doc(db, 'calls', channelName);
  try {
    await updateDoc(callDocRef, { status: 'active' });
  } catch (error) {
    console.error("Error accepting call:", error);
  }
};

const getAgoraToken = async (channelName: string, uid: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated for token generation.');

  const idToken = await user.getIdToken();
  const response = await fetch('https://us-central1-wanderlink-c1a35.cloudfunctions.net/generateAgoraToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ channelName, uid, role: 'publisher' }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get token: ${errorText}`);
  }

  const result = await response.json();
  return result.token;
};

interface CallData {
  callerId: string;
  receiverId: string;
  status: 'ringing' | 'active' | 'rejected' | 'ended';
  isVideo: boolean;
}

export default function CallPage() {
  const router = useRouter();
  const params = useParams<{ channel: string }>();
  const { toast } = useToast();
  const channelName = params.channel;

  const [currentUser] = useAuthState(auth);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<[IMicrophoneAudioTrack, ICameraVideoTrack] | [IMicrophoneAudioTrack] | []>([]);
  const [callData, setCallData] = useState<CallData | null>(null);
  const [otherUserData, setOtherUserData] = useState<any>(null);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
 
  const isJoinedRef = useRef(false);
  const isLeavingRef = useRef(false);
  const callDataRef = useRef(callData);

  useEffect(() => {
      callDataRef.current = callData;
  }, [callData]);

  const leaveCall = useCallback(async (updateStatus: boolean) => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;

    ringingSound.pause();
    ringingSound.currentTime = 0;

    const currentCallData = callDataRef.current;

    if (updateStatus && currentCallData && currentUser && currentCallData.callerId === currentUser.uid && currentCallData.status === 'ringing') {
        const { callerId, receiverId } = currentCallData;
        const chatId = [callerId, receiverId].sort().join('_');
        
        try {
            await Promise.all([
                sendCallSystemMessage(chatId, callerId, receiverId, 'missed_call'),
                addDoc(collection(db, `users/${receiverId}/notifications`), {
                    type: 'missed_call',
                    senderId: callerId,
                    senderName: currentUser.displayName || 'Un utilisateur',
                    senderPhotoURL: currentUser.photoURL || null,
                    chatId: chatId,
                    text: 'a essayé de vous appeler 📞',
                    createdAt: serverTimestamp(),
                    read: false
                })
            ]);
        } catch (error) {
            console.error('[Missed Call Actions Error]', error);
        }
    }

    try {
        for (const track of localTracks) {
            track.stop();
            track.close();
        }
        if (isJoinedRef.current) {
            await client.leave();
            isJoinedRef.current = false;
        }
        
        if (updateStatus && channelName) {
            const callDocRef = doc(db, 'calls', channelName);
            await updateDoc(callDocRef, { status: 'ended' }).catch(e => console.error('Error ending call in db', e));
        }
    } catch (e) {
        console.error("Error during leaveCall", e);
    } finally {
        setLocalTracks([]);
        setRemoteUsers([]);
        if (router) {
            router.back();
        }
    }
}, [localTracks, channelName, router, currentUser]);

  const joinChannel = useCallback(async (isVideoCall: boolean) => {
    if (!channelName || !currentUser || isJoinedRef.current) return;

    try {
      isJoinedRef.current = true;
      ringingSound.pause();
      ringingSound.currentTime = 0;

      client.on('user-published', async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        setRemoteUsers(prev => prev.find(u => u.uid === user.uid) ? prev : [...prev, user]);

        if (mediaType === 'video' && user.videoTrack) {
           user.videoTrack.play(`remote-video-${user.uid}`);
        }
        if (mediaType === 'audio' && user.audioTrack) {
          user.audioTrack.play();
        }
      });

      client.on('user-left', user => {
        setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
        leaveCall(true);
      });

      const token = await getAgoraToken(channelName, currentUser.uid);
      await client.join(agoraConfig.appId, channelName, token, currentUser.uid);

      const tracks = isVideoCall
        ? await AgoraRTC.createMicrophoneAndCameraTracks()
        : [await AgoraRTC.createMicrophoneAudioTrack()];

      // @ts-ignore
      setLocalTracks(tracks);
      setIsVideoMuted(!isVideoCall);

      if (tracks.length > 1) {
        (tracks[1] as ICameraVideoTrack).play('local-video');
      }

      await client.publish(tracks);

    } catch (error: any) {
      console.error('FATAL ERROR in joinChannel:', error);
      toast({ title: "Erreur d\'appel", description: error.message, variant: 'destructive' });
      leaveCall(true);
    }
  }, [channelName, currentUser, toast, leaveCall]);

  useEffect(() => {
    if (!channelName || !currentUser) return;

    const callDocRef = doc(db, 'calls', channelName);

    const unsubscribe = onSnapshot(callDocRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CallData;
        setCallData(data);

        if (data.status === 'ringing' && data.callerId === currentUser.uid && !isJoinedRef.current) {
            ringingSound.play().catch(e => console.error("Ringing sound play failed", e));
        }

        if (!otherUserData) {
            const otherId = data.callerId === currentUser.uid ? data.receiverId : data.callerId;
            getUserProfile(otherId).then(setOtherUserData);
        }

        switch(data.status) {
            case 'active':
                ringingSound.pause();
                if (!isJoinedRef.current) {
                    joinChannel(data.isVideo);
                }
                break;
            case 'rejected':
                toast({ title: "Appel refusé", description: "L\'utilisateur a refusé l\'appel.", variant: 'destructive' });
                leaveCall(false);
                break;
            case 'ended':
                toast({ title: "Appel terminé" });
                leaveCall(false);
                break;
        }
      } else {
        toast({ title: "Appel introuvable", variant: 'destructive' });
        router.back();
      }
    });

    return () => {
        unsubscribe();
        ringingSound.pause();
        ringingSound.currentTime = 0;
        if (isLeavingRef.current) {
          leaveCall(true);
        }
    }
  }, [channelName, currentUser, router, toast, joinChannel, leaveCall]);

  const toggleAudio = async () => {
    if (localTracks[0]) {
      await localTracks[0].setMuted(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = async () => {
    if (localTracks.length > 1) {
      const videoTrack = localTracks[1] as ICameraVideoTrack;
      await videoTrack.setMuted(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
    }
  };

  if (!callData || !otherUserData) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-900 text-white">
            <Loader2 className="h-16 w-16 animate-spin" />
            <p className="mt-4 text-lg">Préparation de l'appel...</p>
        </div>
    );
  }

  if (callData.status === 'ringing') {
      const isReceiver = currentUser && callData.receiverId === currentUser.uid;
      return (
          <div className="flex h-screen w-full flex-col items-center justify-between bg-gray-900 text-white py-20">
                <div className="text-center space-y-4">
                    <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                        <AvatarImage src={otherUserData?.profilePictures?.[0]} />
                        <AvatarFallback className="text-4xl bg-gray-700">{otherUserData?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold">{otherUserData?.firstName}</h1>
                    <p className="text-lg text-white/70">
                        {isReceiver ? 'Appel entrant...' : 'Sonnerie en cours...'}
                    </p>
                </div>
                <CallControls 
                    onHangUp={() => leaveCall(true)} 
                    onAccept={isReceiver ? () => acceptCall(channelName) : undefined}
                    isRinging={true} 
                    onToggleMic={()=>{}} 
                    onToggleCamera={()=>{}} 
                    isMicMuted={false} 
                    isCameraOff={false} 
                />
          </div>
      )
  }

  return (
    <div className="relative h-screen w-full bg-black">
        {/* Vidéo de l'utilisateur distant */}
         <div className="h-full w-full absolute top-0 left-0">
            {remoteUsers.map(user => (
                <div key={user.uid} id={`remote-video-${user.uid}`} className="h-full w-full" />
            ))}
        </div>
        
        {(remoteUsers.length === 0 || (callData.isVideo && remoteUsers.every(u => !u.hasVideo))) && (
             <div className="flex h-full w-full items-center justify-center">
                <div className="text-center text-white space-y-4">
                     <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                        <AvatarImage src={otherUserData?.profilePictures?.[0]} />
                        <AvatarFallback className="text-4xl bg-gray-700">{otherUserData?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <p className="text-lg font-semibold">{otherUserData?.firstName}</p>
                    <p>En attente...</p>
                </div>
            </div>
        )}

        {callData.isVideo && (
            <div className={`absolute top-4 right-4 h-48 w-36 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}>
                <div id="local-video" className="h-full w-full"></div>
            </div>
        )}

        <CallControls
          onHangUp={() => leaveCall(true)}
          onToggleMic={toggleAudio}
          onToggleCamera={toggleVideo}
          isMicMuted={isAudioMuted}
          isCameraOff={isVideoMuted}
          isVideoCall={callData.isVideo}
        />
    </div>
  );
}
