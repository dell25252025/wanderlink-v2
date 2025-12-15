
import React from 'react';

// Ajout des nouvelles props pour le haut-parleur
interface CallControlsProps {
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleSpeaker: () => void; // Nouvelle prop
  isMicMuted: boolean;
  isCameraOff: boolean;
  isSpeakerOn: boolean; // Nouvelle prop
  isRinging?: boolean; // Prop optionnelle pour la sonnerie
  isVideoCall?: boolean; // Savoir si c'est un appel vidéo
}

// --- Icônes SVG ---
const MicOnIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
);

const MicOffIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm-1 4a4 4 0 108 0V4a4 4 0 10-8 0v4zm10.96 1.15a.75.75 0 00-1.06-1.06l-1.02 1.02a4.98 4.98 0 00-1.41-.03l-1.63 1.63a.75.75 0 101.06 1.06L16.94 9.15zM2.53 7.85a.75.75 0 00-1.06 1.06l4.24 4.24a.75.75 0 001.06 0l1.27-1.27a.75.75 0 10-1.06-1.06l-1.27 1.27-3.18-3.18z" clipRule="evenodd" /></svg>
);

const CameraOnIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
);

const CameraOffIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm-8-2.5a.75.75 0 01.75-.75h.586l.28-.28A.75.75 0 014.28 9h1.44a.75.75 0 010 1.5H4.28a.75.75 0 01-.53-.22L3.47 10H2.75A.75.75 0 012 9.25zM6.9 7.22a.75.75 0 011.06 0l.72.72a.75.75 0 11-1.06 1.06l-.72-.72a.75.75 0 010-1.06zM8.72 5.85a.75.75 0 10-1.06-1.06l-.72.72a.75.75 0 101.06 1.06l.72-.72zM11 5.05a.75.75 0 01.75.75v.586l.28.28a.75.75 0 01-1.06 1.06l-1-1A.75.75 0 0111 5.05z" clipRule="evenodd" /><path d="M2.97 2.97a.75.75 0 011.06 0l12 12a.75.75 0 01-1.06 1.06l-12-12a.75.75 0 010-1.06z" /></svg>
);

const HangUpIcon = () => (
    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" transform="rotate(135)">
        <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.26 0-.51-.1-.7-.29l-1.8-1.8a.9959.9959 0 010-1.41c2.2-2.2 4.95-3.46 7.89-3.71.53-.04 1.01.03 1.48.19.52.17.88.66.88 1.23v3.25c0 .41-.21.78-.54.96-1.03.55-2.16.84-3.32.84-1.12 0-2.2-.26-3.18-.73l-1.52-1.52c-.68-.68-1.28-1.42-1.78-2.22-.1-.16-.25-.28-.42-.35-.3-.12-.64-.02-.84.2L3.5 12c1.73 2.83 4.54 4.85 7.79 5.54.21.05.43.07.64.07.59 0 1.15-.31 1.46-.82l.8-1.3c.2-.33.16-.77-.09-1.06-.62-.72-1.17-1.5-1.63-2.32.02-.02.04-.04.06-.06.01 0 .02-.02.03-.03.02-.02.03-.03.05-.05.78-.58 1.48-1.28 2.08-2.08.38-.5.71-1.03 1-1.59.32-.62.22-1.37-.23-1.89l-1.03-1.03c-.19-.21-.46-.33-.74-.33-.23 0-.46.08-.66.23-.62.47-1.32.84-2.06 1.1-.14.05-.28.08-.43.08z"/>
    </svg>
);

// Nouvelle icône pour le haut-parleur
const SpeakerOnIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.25 4.25a.75.75 0 01.75.75v10a.75.75 0 01-1.5 0V5a.75.75 0 01.75-.75zm-3.5 3.5a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H5.75zM4.25 12a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H5a.75.75 0 01-.75-.75zm5-5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H9.25zM9.25 12a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H9.25z" /></svg>
);

const SpeakerOffIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 11 8.22 7.28a.75.75 0 010-1.06z" clipRule="evenodd" transform="matrix(-1 0 0 1 20 0)" /></svg>

);

export const CallControls: React.FC<CallControlsProps> = ({
  onHangUp,
  onToggleMic,
  onToggleCamera,
  onToggleSpeaker,
  isMicMuted,
  isCameraOff,
  isSpeakerOn,
  isRinging,
  isVideoCall,
}) => {
  const ControlButton = ({ onClick, children, active, ariaLabel, danger, size = 'w-14 h-14' }: any) => (
    <button
        onClick={onClick}
        className={`${size} flex items-center justify-center rounded-full transition-all duration-300 text-white 
                    ${
                      danger 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : active 
                          ? 'bg-white/40 hover:bg-white/50' 
                          : 'bg-white/20 hover:bg-white/30'
                    }`}
        aria-label={ariaLabel}
    >
        {children}
    </button>
  );

  if (isRinging) {
    return (
        <div className="fixed bottom-16 left-0 right-0 p-4 z-50 flex justify-center">
            <ControlButton onClick={onHangUp} danger ariaLabel="Hang Up" size="w-16 h-16"><HangUpIcon /></ControlButton>
        </div>
    )
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 p-4 z-50">
      <div className="max-w-md mx-auto bg-black/30 backdrop-blur-sm rounded-full shadow-lg">
        <div className="flex justify-evenly items-center p-2">
          
          {/* Ordre corrigé : Micro, Caméra, Haut-parleur, Raccrocher */}
          
          <ControlButton onClick={onToggleMic} active={!isMicMuted} ariaLabel={isMicMuted ? 'Unmute' : 'Mute'}>
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </ControlButton>

          {isVideoCall && (
            <ControlButton onClick={onToggleCamera} active={!isCameraOff} ariaLabel={isCameraOff ? 'Camera On' : 'Camera Off'}>
              {isCameraOff ? <CameraOffIcon /> : <CameraOnIcon />}
            </ControlButton>
          )}
          
          <ControlButton onClick={onToggleSpeaker} active={isSpeakerOn} ariaLabel={isSpeakerOn ? 'Speaker Off' : 'Speaker On'}>
            {isSpeakerOn ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
          </ControlButton>

          <ControlButton onClick={onHangUp} danger ariaLabel="Hang Up" size="w-16 h-16">
            <HangUpIcon />
          </ControlButton>

        </div>
      </div>
    </div>
  );
};

export default CallControls;
