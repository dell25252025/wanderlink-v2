
import React from 'react';

// Simplification des props : on enlève la gestion du haut-parleur
interface CallControlsProps {
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isRinging?: boolean;
  isVideoCall?: boolean;
}

// --- Icônes SVG (inchangées) ---
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
  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3.66 6.54a2.5 2.5 0 01-.18-3.08 1 1 0 011.6-.64c1.86 2.31 3.01 5.05 3.33 8.01.07.55-.37 1.04-.92 1.04-.5 0-.91-.4-.98-.9-.28-2.52-1.26-4.9-2.85-6.93zM21.52 3.48a1 1 0 01-.64 1.6 15.5 15.5 0 01-6.93 2.85c-.5.07-1.02-.33-1.02-.85s.42-.92.92-.98a17.5 17.5 0 008.01-3.33 1 1 0 011.6.65z"/><path fillRule="evenodd" d="M2.93 17.58a13.5 13.5 0 007.03 4.2 1.5 1.5 0 001.55-.91 3.5 3.5 0 000-2.73 1.5 1.5 0 00-1.25-1.12c-2.3-.65-4.44-1.92-6.2-3.69A1.5 1.5 0 002.5 14.5v-1.06a13.5 13.5 0 014.2 7.03 1.5 1.5 0 00-.91 1.55c-.21 1.15.54 2.24 1.63 2.52zm11.5-11.23a13.5 13.5 0 014.2 7.03v1.06a1.5 1.5 0 01-1.28 1.45c-2.3.65-4.44-1.92-6.2 3.69a1.5 1.5 0 01-1.45 0 3.5 3.5 0 01-2.73 0 1.5 1.5 0 01-1.45 0c-.8-.8-1.5-1.7-2.1-2.67l14.4-14.4c.97.6 1.87 1.3 2.67 2.1z" clipRule="evenodd"/></svg>
);

const SpeakerOnIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9.25 4.25a.75.75 0 01.75.75v10a.75.75 0 01-1.5 0V5a.75.75 0 01.75-.75zm-3.5 3.5a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H5.75zM4.25 12a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H5a.75.75 0 01-.75-.75zm5-5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H9.25zM9.25 12a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5H9.25z"/></svg>
);

export const CallControls: React.FC<CallControlsProps> = ({
  onHangUp,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOff,
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
  
  // Élément statique pour le haut-parleur
  const SpeakerInfo = () => (
    <div className="w-14 h-14 flex items-center justify-center rounded-full bg-white/20 text-white">
        <SpeakerOnIcon />
    </div>
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
          
          <ControlButton onClick={onToggleMic} active={!isMicMuted} ariaLabel={isMicMuted ? 'Unmute' : 'Mute'}>
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </ControlButton>

          {isVideoCall && (
            <ControlButton onClick={onToggleCamera} active={!isCameraOff} ariaLabel={isCameraOff ? 'Camera On' : 'Camera Off'}>
              {isCameraOff ? <CameraOffIcon /> : <CameraOnIcon />}
            </ControlButton>
          )}
          
          {/* Remplacement du bouton par l'élément statique */}
          <SpeakerInfo />

          <ControlButton onClick={onHangUp} danger ariaLabel="Hang Up" size="w-16 h-16">
            <HangUpIcon />
          </ControlButton>

        </div>
      </div>
    </div>
  );
};

export default CallControls;
