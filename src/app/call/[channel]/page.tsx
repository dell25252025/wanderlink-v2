'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Camera } from '@capacitor/camera'; // Ajout pour les permissions
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import { agoraConfig } from '@/lib/agora-config';
import { useToast } from '@/hooks/use-toast';
import { generateAgoraToken } from '@/lib/firebase-actions';

import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

export default function CallPage() {
  const router = useRouter();
  const { channel: channelName } = useParams<{ channel: string }>();
  const { toast } = useToast();

  const [currentUser] = useAuthState(auth);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<[IMicrophoneAudioTrack, ICameraVideoTrack] | [IMicrophoneAudioTrack] | []>([]);
  
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isJoining, setIsJoining] = useState(true);

  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const isJoinedRef = useRef(false);

  useEffect(() => {
    if (!channelName || !currentUser || isJoinedRef.current) return;

    const joinChannel = async () => {
      try {
        console.log("Début de la tentative de jonction de canal.");

        // --- NOUVEAU: Demande explicite des permissions ---
        console.log("Demande des permissions pour caméra et microphone.");
        const permissions = await Camera.requestPermissions({ permissions: ['camera', 'microphone'] });

        if (permissions.camera !== 'granted' || permissions.microphone !== 'granted') {
            console.error('Permissions non accordées:', permissions);
            toast({
                title: 'Permissions requises',
                description: "L'accès à la caméra et au microphone est nécessaire pour passer des appels.",
                variant: 'destructive',
            });
            router.back();
            return; // Arrêter l'exécution ici
        }

        console.log("Permissions accordées. Continuation...");
        isJoinedRef.current = true;

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          setRemoteUsers(prev => {
            if (prev.find(u => u.uid === user.uid)) return prev;
            return [...prev, user];
          });
          if (mediaType === 'video' && user.videoTrack) {
            setTimeout(() => {
                if(remoteVideoRef.current) {
                    user.videoTrack?.play(remoteVideoRef.current);
                }
            }, 100);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on('user-left', user => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            leaveCall(); 
        });

        console.log("Génération du token Agora.");
        const tokenResult = await generateAgoraToken(channelName, 0);
        let token: string | null = null;
        if (tokenResult.success && tokenResult.token) {
            token = tokenResult.token;
        }

        console.log("Connexion au canal Agora.");
        if (client.connectionState !== 'CONNECTED' && client.connectionState !== 'CONNECTING') {
             await client.join(agoraConfig.appId, channelName, token, null);
        }

        console.log("Création des pistes média.");
        let tracks: [IMicrophoneAudioTrack, ICameraVideoTrack] | [IMicrophoneAudioTrack];
        try {
            tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        } catch (error: any) {
            console.warn("Impossible de créer les pistes vidéo et audio, tentative audio seulement...");
            try {
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                tracks = [audioTrack];
                toast({ 
                    title: "Caméra non disponible", 
                    description: "L'appel continuera en audio uniquement.",
                });
                setIsVideoMuted(true);
            } catch (audioError: any) {
                 console.error("Échec critique : Impossible de créer même la piste audio.", audioError);
                 throw audioError;
            }
        }

        setLocalTracks(tracks);
        
        if (tracks.length > 1 && localVideoRef.current) {
            (tracks[1] as ICameraVideoTrack).play(localVideoRef.current);
        }
        
        console.log("Publication des pistes locales.");
        await client.publish(tracks);
        setIsJoining(false);
        console.log("Jonction et publication réussies.");

      } catch (error: any) {
        console.error('ERREUR FATALE DANS joinChannel:', error);
        isJoinedRef.current = false;
        
        toast({ title: "Erreur d'appel", description: "Une erreur inattendue est survenue. Impossible de démarrer l'appel.", variant: 'destructive' });
        // NOTE: router.back() est commenté pour permettre le débogage dans la console.
        // router.back();
      }
    };

    joinChannel();

    return () => {
         localTracks.forEach(track => {
             track.stop();
             track.close();
         });
         if (isJoinedRef.current) {
             client.leave().then(() => { isJoinedRef.current = false; });
         }
    };
  }, [channelName, currentUser, router, toast]);

    useEffect(() => {
        if (!channelName) return;
        const callDocRef = doc(db, 'calls', channelName);
        const unsubscribe = onSnapshot(callDocRef, (doc) => {
            if (doc.exists()) {
                const callData = doc.data();
                if (callData.status === 'ended' || callData.status === 'rejected') {
                     if(!isJoining) {
                         leaveCall();
                     }
                }
            }
        });
        return () => unsubscribe();
    }, [channelName, isJoining, leaveCall]);

  const leaveCall = async () => {
    for (const track of localTracks) {
      track.stop();
      track.close();
    }
    await client.leave();
    isJoinedRef.current = false;
    
    setLocalTracks([]);
    setRemoteUsers([]);
    if(channelName) {
        const callDocRef = doc(db, 'calls', channelName);
        await updateDoc(callDocRef, { status: 'ended' }).catch(e => console.error('Error ending call in db', e));
    }
    router.back();
  };

  const toggleAudio = async () => {
    if (localTracks[0]) {
      const isNowMuted = !isAudioMuted;
      await localTracks[0].setMuted(isNowMuted);
      setIsAudioMuted(isNowMuted);
    }
  };

  const toggleVideo = async () => {
    if (localTracks.length > 1) {
      const isNowMuted = !isVideoMuted;
      await (localTracks[1] as ICameraVideoTrack).setMuted(isNowMuted);
      setIsVideoMuted(isNowMuted);
    } else {
        toast({ description: "Vidéo indisponible pour cet appel." });
    }
  };

  if (isJoining) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-black text-white">
            <Loader2 className="h-16 w-16 animate-spin" />
            <p className="mt-4 text-lg">Connexion à l\'appel...</p>
        </div>
    );
  }

  return (
    <div className="relative h-screen w-full bg-black">
        <div ref={remoteVideoRef} className="h-full w-full absolute top-0 left-0"></div>
        {remoteUsers.length === 0 && (
             <div className="flex h-full w-full items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                    <p className="mt-4">En attente de l\'autre participant...</p>
                </div>
            </div>
        )}

        {localTracks.length > 1 && (
            <div className={`absolute top-4 right-4 h-48 w-36 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}>
                <div ref={localVideoRef} className="h-full w-full"></div>
            </div>
        )}

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/50 p-3">
            <Button onClick={toggleAudio} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isAudioMuted ? 'bg-destructive' : ''}`}>
                {isAudioMuted ? <MicOff /> : <Mic />}
            </Button>
            <Button onClick={leaveCall} variant="destructive" size="icon" className="rounded-full h-16 w-16">
                <PhoneOff />
            </Button>
            <Button onClick={toggleVideo} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isVideoMuted ? 'bg-destructive' : ''}`} disabled={localTracks.length <= 1}>
                {isVideoMuted ? <VideoOff /> : <Video />}
            </Button>
        </div>
    </div>
  );
}
