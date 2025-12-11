
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db, functions } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { agoraConfig } from '@/lib/agora-config';
import { useToast } from '@/hooks/use-toast';

import { Loader2 } from 'lucide-react';
import CallControls from '@/components/CallControls'; // Import the new component

const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

const generateAgoraToken = httpsCallable(functions, 'generateAgoraToken');

export default function CallPage() {
  const router = useRouter();
  const params = useParams<{ channel: string }>();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const channelName = params.channel;
  const callType = searchParams.get('type') || 'audio';

  const [currentUser] = useAuthState(auth);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<[IMicrophoneAudioTrack] | [IMicrophoneAudioTrack, ICameraVideoTrack]>([]);
  
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === 'audio');
  const [isJoining, setIsJoining] = useState(true);

  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  const isJoinedRef = useRef(false);

  const leaveCall = useCallback(async () => {
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
  }, [localTracks, channelName, router]);

  useEffect(() => {
    if (!channelName || !currentUser || isJoinedRef.current) return;

    const joinChannel = async () => {
      try {
        isJoinedRef.current = true;

        client.on('user-published', async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          setRemoteUsers(prev => prev.find(u => u.uid === user.uid) ? prev : [...prev, user]);
          if (mediaType === 'video' && user.videoTrack && remoteVideoRef.current) {
            user.videoTrack.play(remoteVideoRef.current);
          }
          if (mediaType === 'audio' && user.audioTrack) {
            user.audioTrack.play();
          }
        });

        client.on('user-left', user => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            leaveCall(); 
        });

        const tokenResponse = await generateAgoraToken({ channelName, role: 'publisher', uid: 0 });
        const token = (tokenResponse.data as { token: string }).token;

        if (!token) throw new Error("Failed to generate Agora token.");

        if (client.connectionState !== 'CONNECTED' && client.connectionState !== 'CONNECTING') {
             await client.join(agoraConfig.appId, channelName, token, null);
        }

        let tracks: [IMicrophoneAudioTrack] | [IMicrophoneAudioTrack, ICameraVideoTrack];
        if (callType === 'video') {
            tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        } else {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            tracks = [audioTrack];
        }

        setLocalTracks(tracks);
        
        if (tracks.length > 1 && localVideoRef.current) {
            (tracks[1] as ICameraVideoTrack).play(localVideoRef.current);
        }
        
        await client.publish(tracks);
        setIsJoining(false);

      } catch (error: any) {
        console.error('FATAL ERROR in joinChannel:', error);
        toast({ 
            title: "Erreur d'appel", 
            description: error.code ? `Code: ${error.code} - ${error.message}` : "Impossible de démarrer l'appel. Vérifiez les permissions et la connexion.", 
            variant: 'destructive' 
        });
        isJoinedRef.current = false;
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
  }, [channelName, currentUser, router, toast, leaveCall, callType]);

    useEffect(() => {
        if (!channelName) return;
        const callDocRef = doc(db, 'calls', channelName);
        const unsubscribe = onSnapshot(callDocRef, (doc) => {
            if (doc.exists() && !isJoining) {
                const callData = doc.data();
                if (callData.status === 'ended' || callData.status === 'rejected') {
                     leaveCall();
                }
            }
        });
        return () => unsubscribe();
    }, [channelName, isJoining, leaveCall]);

  const toggleAudio = async () => {
    if (localTracks[0]) {
      const isNowMuted = !isAudioMuted;
      await localTracks[0].setMuted(isNowMuted);
      setIsAudioMuted(isNowMuted);
    }
  };

  const toggleVideo = async () => {
    if (callType === 'audio') return;
    const videoTrack = localTracks.find(track => track.trackMediaType === 'video') as ICameraVideoTrack | undefined;
    if (videoTrack) {
      const isNowMuted = !isVideoMuted;
      await videoTrack.setMuted(isNowMuted);
      setIsVideoMuted(isNowMuted);
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

        {localTracks.find(track => track.trackMediaType === 'video') && (
            <div className={`absolute top-4 right-4 h-48 w-36 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}>
                <div ref={localVideoRef} className="h-full w-full"></div>
            </div>
        )}

        {/* Use the new CallControls component */}
        <CallControls
          onHangUp={leaveCall}
          onToggleMic={toggleAudio}
          onToggleCamera={toggleVideo}
          isMicMuted={isAudioMuted}
          isCameraOff={isVideoMuted}
        />
    </div>
  );
}
