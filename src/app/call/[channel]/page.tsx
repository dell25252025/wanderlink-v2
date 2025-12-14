'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import { agoraConfig } from '@/lib/agora-config';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserProfile } from '@/lib/firebase-actions';

import { Loader2 } from 'lucide-react';
import CallControls from '@/components/CallControls';

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

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
    body: JSON.stringify({ data: { channelName, uid, role: 'publisher' } }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get token: ${errorText}`);
  }

  const result = await response.json();
  return result.data.token;
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
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
 
  const isJoinedRef = useRef(false);
  const earpieceDeviceId = useRef<string | null>(null);
  const speakerDeviceId = useRef<string | null>(null);

  // Fonction pour initialiser les périphériques et définir la sortie par défaut
  const initializeAudioDevices = async (isVideoCall: boolean) => {
    try {
        const devices = await AgoraRTC.getPlaybackDevices();
        const earpiece = devices.find(d => d.kind === 'audiooutput' && d.label.toLowerCase().includes('earpiece'));
        const speaker = devices.find(d => d.kind === 'audiooutput' && d.label.toLowerCase().includes('speaker'));

        earpieceDeviceId.current = earpiece?.deviceId || null;
        // Utilise 'default' comme fallback solide pour le haut-parleur
        speakerDeviceId.current = speaker?.deviceId || 'default'; 

        if (isVideoCall) {
            await client.setPlaybackDevice(speakerDeviceId.current!);
            setIsSpeakerOn(true);
        } else {
            if (earpieceDeviceId.current) {
                await client.setPlaybackDevice(earpieceDeviceId.current);
                setIsSpeakerOn(false);
            } else {
                await client.setPlaybackDevice(speakerDeviceId.current!);
                setIsSpeakerOn(true);
            }
        }
    } catch (e) {
        console.error("Failed to initialize or set audio device", e);
        toast({ title: "Erreur Audio", description: "Impossible de définir le périphérique audio." })
    }
  };

  const leaveCall = useCallback(async (updateStatus: boolean) => {
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
    
    setLocalTracks([]);
    setRemoteUsers([]);
    router.back();
  }, [localTracks, channelName, router]);

  const joinChannel = useCallback(async (isVideoCall: boolean) => {
    if (!channelName || !currentUser || isJoinedRef.current) return;

    try {
      isJoinedRef.current = true; 

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
      
      // Initialise les périphériques audio ici
      await initializeAudioDevices(isVideoCall);

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

    const unsubscribe = onSnapshot(callDocRef, async (doc) => {
      if (doc.exists()) {
        const data = doc.data() as CallData;
        setCallData(data);

        if (!otherUserData) {
            const otherId = data.callerId === currentUser.uid ? data.receiverId : data.callerId;
            const profile = await getUserProfile(otherId);
            setOtherUserData(profile);
        }

        switch(data.status) {
            case 'active':
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

    return () => unsubscribe();
  }, [channelName, currentUser, router, toast, joinChannel, leaveCall, otherUserData]);

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

  // Fonction de bascule remise en place
  const toggleSpeaker = async () => {
    try {
      if (isSpeakerOn) {
        // Passer à l'écouteur s'il existe
        if (earpieceDeviceId.current) {
          await client.setPlaybackDevice(earpieceDeviceId.current);
          setIsSpeakerOn(false);
        } else {
          toast({ title: "Info", description: "Aucun écouteur détecté." });
        }
      } else {
        // Passer au haut-parleur
        if (speakerDeviceId.current) {
          await client.setPlaybackDevice(speakerDeviceId.current);
          setIsSpeakerOn(true);
        } else {
          toast({ title: "Erreur", description: "Aucun haut-parleur détecté.", variant: "destructive" });
        }
      }
    } catch (error) {
      console.error("Failed to switch audio output device", error);
      toast({ title: "Erreur", description: "Impossible de changer de périphérique audio.", variant: "destructive" });
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
      return (
          <div className="flex h-screen w-full flex-col items-center justify-between bg-gray-900 text-white py-20">
                <div className="text-center space-y-4">
                    <Avatar className="w-24 h-24 mx-auto border-4 border-white/20">
                        <AvatarImage src={otherUserData?.profilePictures?.[0]} />
                        <AvatarFallback className="text-4xl bg-gray-700">{otherUserData?.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h1 className="text-3xl font-bold">{otherUserData?.firstName}</h1>
                    <p className="text-lg text-white/70">Sonnerie en cours...</p>
                </div>
                <CallControls onHangUp={() => leaveCall(true)} isRinging={true} onToggleMic={()=>{}} onToggleCamera={()=>{}} onToggleSpeaker={()=>{}} isMicMuted={false} isCameraOff={false} isSpeakerOn={false} />
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
          onToggleSpeaker={toggleSpeaker}
          isMicMuted={isAudioMuted}
          isCameraOff={isVideoMuted}
          isSpeakerOn={isSpeakerOn}
          isVideoCall={callData.isVideo}
        />
    </div>
  );
}
