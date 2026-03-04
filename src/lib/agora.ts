import AgoraRTC from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '@/config'; // Importer la configuration

const client = AgoraRTC.createClient({ 
  mode: 'rtc', 
  codec: 'vp8' 
});

let localTracks: any[] = [];
let remoteUsers = {};

const appId = AGORA_CONFIG.appId; // Utiliser l'App ID depuis la config

// Fonction pour joindre un canal
export const joinChannel = async (channel: string, token: string, uid: any) => {
  try {
    await client.join(appId, channel, token, uid);
    console.log('Successfully joined channel');

    const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
    const cameraTrack = await AgoraRTC.createCameraVideoTrack();
    
    localTracks.push(audioTrack);
    localTracks.push(cameraTrack);

    await client.publish(localTracks);

    return {
      localTracks,
      client
    };

  } catch (error) {
    console.error('FATAL ERROR in joinChannel:', error);
    return null;
  }
};

// Fonction pour quitter un canal
export const leaveChannel = async () => {
  for (let track of localTracks) {
    track.stop();
    track.close();
  }
  localTracks = [];
  await client.leave();
};

// Gérer les événements des utilisateurs
client.on('user-published', async (user, mediaType) => {
  await client.subscribe(user, mediaType);
  if (mediaType === 'video') {
    const remoteVideoTrack = user.videoTrack;
    // Assurez-vous d'avoir un élément avec l'ID 'remote-video-container'
    const remotePlayerContainer = document.createElement('div');
    remotePlayerContainer.id = `player-container-${user.uid}`;
    remotePlayerContainer.style.width = '320px';
    remotePlayerContainer.style.height = '240px';
    document.getElementById('remote-video-container')?.append(remotePlayerContainer);
    remoteVideoTrack.play(remotePlayerContainer);
  }

  if (mediaType === 'audio') {
    const remoteAudioTrack = user.audioTrack;
    remoteAudioTrack.play();
  }
});

client.on('user-unpublished', user => {
  const playerContainer = document.getElementById(`player-container-${user.uid}`);
  if (playerContainer) {
    playerContainer.remove();
  }
});
