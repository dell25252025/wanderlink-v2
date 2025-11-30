'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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
  console.log("CallPage: Component rendering.");
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
    console.log("CallPage: leaveCall triggered.");
    for (const track of localTracks) {
      track.stop();
      track.close();
    }
    await client.leave();
    isJoinedRef.current = false;
    console.log("CallPage: Client left Agora channel.");
    
    setLocalTracks([]);
    setRemoteUsers([]);
    if(channelName) {
        const callDocRef = doc(db, 'calls', channelName);
        await updateDoc(callDocRef, { status: 'ended' }).catch(e => console.error('CallPage: Error ending call in db', e));
    }
    router.back();
  }, [localTracks, channelName, router]);

  useEffect(() => {
    console.log("CallPage: useEffect started.");

    if (!channelName) console.log("CallPage: useEffect aborting - no channelName.");
    if (!currentUser) console.log("CallPage: useEffect aborting - no currentUser.");
    if (isJoinedRef.current) console.log("CallPage: useEffect aborting - already joined (isJoinedRef.current is true).");

    if (!channelName || !currentUser || isJoinedRef.current) return;

    const joinChannel = async () => {
      console.log("CallPage: joinChannel function started.");
      try {
        console.log(`CallPage: Starting call setup for a ${callType} call.`);
        isJoinedRef.current = true;

        client.on('user-published', async (user, mediaType) => {
          console.log(`CallPage: Event 'user-published', user: ${user.uid}, media: ${mediaType}`);
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
            console.log(`CallPage: Event 'user-left', user: ${user.uid}`);
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            leaveCall(); 
        });

        console.log("CallPage: Requesting Agora token...");
        const tokenResult = await generateAgoraToken(channelName, 0);
        const token = (tokenResult.success && tokenResult.token) ? tokenResult.token : null;
        if (!token) {
          console.error("CallPage: Failed to generate Agora token.");
          throw new Error("Failed to generate Agora token.");
        }
        console.log("CallPage: Agora token received.");

        if (client.connectionState !== 'CONNECTED' && client.connectionState !== 'CONNECTING') {
             console.log(`CallPage: Joining Agora channel '${channelName}'`);
             await client.join(agoraConfig.appId, channelName, token, null);
             console.log("CallPage: Successfully joined Agora channel.");
        } else {
             console.log("CallPage: Already connected or connecting to Agora channel.");
        }

        console.log("CallPage: Requesting media tracks (mic/camera)... THIS WILL PROMPT FOR PERMISSIONS.");
        let tracks: [IMicrophoneAudioTrack] | [IMicrophoneAudioTrack, ICameraVideoTrack];
        if (callType === 'video') {
            tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        } else {
            const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
            tracks = [audioTrack];
        }
        console.log("CallPage: Media tracks created successfully.");

        setLocalTracks(tracks);
        
        if (tracks.length > 1 && localVideoRef.current) {
            console.log("CallPage: Playing local video track.");
            (tracks[1] as ICameraVideoTrack).play(localVideoRef.current);
        }
        
        console.log("CallPage: Publishing local tracks.");
        await client.publish(tracks);
        console.log("CallPage: Local tracks published. Setting isJoining to false.");
        setIsJoining(false);

      } catch (error: any) {
        console.error('CallPage: FATAL ERROR in joinChannel:', error);
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
         console.log("CallPage: useEffect cleanup function running.");
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
    console.log("CallPage: Status listener useEffect started.");
    if (!channelName) return;
    const callDocRef = doc(db, 'calls', channelName);
    const unsubscribe = onSnapshot(callDocRef, (doc) => {
        if (doc.exists() && !isJoining) {
            const callData = doc.data();
            console.log(`CallPage: Call status changed to '${callData.status}'`);
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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/50 p-3">
            <Button onClick={toggleAudio} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isAudioMuted ? 'bg-destructive' : ''}`}>
                {isAudioMuted ? <MicOff /> : <Mic />}
            </Button>
            <Button onClick={leaveCall} variant="destructive" size="icon" className="rounded-full h-16 w-16">
                <PhoneOff />
            </Button>
            <Button onClick={toggleVideo} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isVideoMuted ? 'bg-destructive' : ''}`} disabled={callType === 'audio'}>
                {isVideoMuted ? <VideoOff /> : <Video />}
            </Button>
        </div>
    </div>
  );
}
