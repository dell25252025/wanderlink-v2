'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AgoraRTC, { type IAgoraRTCClient, type ICameraVideoTrack, type IMicrophoneAudioTrack, type IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

import { agoraConfig } from '@/lib/agora-config';
import { useToast } from '@/hooks/use-toast';
import { generateAgoraToken } from '@/lib/firebase-actions';

import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- Types & Constants ---
// Create the client outside the component to avoid recreation on re-renders,
// BUT for strict mode / fast refresh safety in Next.js, it's sometimes better inside or checked.
// For now, keeping it global but we will ensure it's not joined multiple times.
const client: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

// --- Main Call Component ---
export default function CallPage() {
  const router = useRouter();
  const { channel: channelName } = useParams<{ channel: string }>();
  const { toast } = useToast();

  const [currentUser] = useAuthState(auth);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [localTracks, setLocalTracks] = useState<[IMicrophoneAudioTrack, ICameraVideoTrack] | []>([]);
  
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
        isJoinedRef.current = true; // Mark as joining/joined

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

        client.on('user-unpublished', user => {
             // Do not remove user immediately, just handle tracks if needed
             // Agora SDK handles stopping playback usually when unpublished
        });

        client.on('user-left', user => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
            leaveCall();
        });

        const tokenResult = await generateAgoraToken(channelName, 0);
        let token: string | null = null;
        if (tokenResult.success && tokenResult.token) {
            token = tokenResult.token;
        }

        // --- FIX FOR "Client already in connecting/connected state" ---
        if (client.connectionState === 'CONNECTED' || client.connectionState === 'CONNECTING') {
           // If already connected, do not join again.
        } else {
            await client.join(agoraConfig.appId, channelName, token, null);
        }
        
        // --- FIX FOR "can not find getUserMedia" on Android WebView ---
        // Ensure permissions are granted on the device level (AndroidManifest.xml).
        // On modern browsers/WebViews, getUserMedia requires HTTPS or localhost.
        // For Capacitor, we might need to handle permissions explicitly if the WebView doesn't prompt.
        // But usually, Capacitor android wrapper handles this if Manifest is correct.
        
        let tracks;
        try {
            tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
        } catch (err: any) {
            console.error("Error creating tracks:", err);
            // Fallback: try audio only if video fails (common issue)
             try {
                const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
                // Create a placeholder video track or just use audio
                // For simplicity here, just fail or toast.
                 toast({ title: "Erreur Caméra", description: "Impossible d\'accéder à la caméra. Essai audio seul...", variant: 'destructive' });
                 // If you want to support audio-only fallback, you'd need to adjust state types.
                 // For now, re-throw to stop.
                 throw err;
            } catch (audioErr) {
                 throw audioErr;
            }
        }

        setLocalTracks(tracks);
        
        if (localVideoRef.current) {
            tracks[1].play(localVideoRef.current);
        }
        await client.publish(tracks);

        setIsJoining(false);

      } catch (error: any) {
        console.error('Failed to join Agora channel', error);
        isJoinedRef.current = false; // Reset join flag on failure
        
        let errorMsg = "Impossible de rejoindre l\'appel.";
        if (error.code === 'WEB_SECURITY_RESTRICT') {
            errorMsg = "L'accès à la caméra/micro nécessite HTTPS.";
        } else if (error.message && error.message.includes('getUserMedia')) {
             errorMsg = "Impossible d'accéder aux périphériques (Caméra/Micro).";
        }

        toast({ title: "Erreur de connexion", description: errorMsg, variant: 'destructive' });
        router.back();
      }
    };

    joinChannel();

    return () => {
         // Cleanup is handled by leaveCall usually, but for unmount:
         localTracks.forEach(track => {
             track.stop();
             track.close();
         });
         // We do NOT leave the channel here automatically on unmount to prevent accidentally dropping calls on navigation
         // unless that is the intended behavior.
         // Given the routing, unmount usually means leaving the page.
         if (isJoinedRef.current) {
             client.leave().then(() => { isJoinedRef.current = false; });
         }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, currentUser, router, toast]);

    useEffect(() => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelName, isJoining]);

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
      await localTracks[0].setMuted(!isAudioMuted);
      setIsAudioMuted(!isAudioMuted);
    }
  };

  const toggleVideo = async () => {
    if (localTracks[1]) {
      await localTracks[1].setMuted(!isVideoMuted);
      setIsVideoMuted(!isVideoMuted);
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
        {/* Remote Video */}
        <div ref={remoteVideoRef} className="h-full w-full absolute top-0 left-0"></div>
        {remoteUsers.length === 0 && (
             <div className="flex h-full w-full items-center justify-center">
                <div className="text-center text-white">
                    <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                    <p className="mt-4">En attente de l\'autre participant...</p>
                </div>
            </div>
        )}

        {/* Local Video */}
        <div className={`absolute top-4 right-4 h-48 w-36 bg-gray-800 border-2 border-gray-600 rounded-lg overflow-hidden transition-all duration-300 ${isVideoMuted ? 'opacity-0' : 'opacity-100'}`}>
            <div ref={localVideoRef} className="h-full w-full"></div>
        </div>

        {/* Call Controls */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 rounded-full bg-black/50 p-3">
            <Button onClick={toggleAudio} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isAudioMuted ? 'bg-destructive' : ''}`}>
                {isAudioMuted ? <MicOff /> : <Mic />}
            </Button>
            <Button onClick={leaveCall} variant="destructive" size="icon" className="rounded-full h-16 w-16">
                <PhoneOff />
            </Button>
            <Button onClick={toggleVideo} variant="secondary" size="icon" className={`rounded-full h-14 w-14 ${isVideoMuted ? 'bg-destructive' : ''}`}>
                {isVideoMuted ? <VideoOff /> : <Video />}
            </Button>
        </div>
    </div>
  );
}
