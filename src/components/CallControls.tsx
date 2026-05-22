
import React from 'react';

interface CallControlsProps {
  onHangUp: () => void;
  onAccept?: () => void; // Nouvelle prop pour accepter l'appel
  onToggleMic: () => void;
  onToggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isRinging?: boolean;
  isVideoCall?: boolean;
}

// --- SVG Icons ---
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
    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" transform="rotate(135)">
        <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
    </svg>
);

// Icône pour accepter l'appel
const AcceptIcon = () => (
  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
  </svg>
);

export const CallControls: React.FC<CallControlsProps> = ({
  onHangUp,
  onAccept,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOff,
  isRinging,
  isVideoCall,
}) => {
  const ControlButton = ({ onClick, children, className, ariaLabel, size = 'w-14 h-14' }: any) => (
    <button
        onClick={onClick}
        className={`${size} flex items-center justify-center rounded-full transition-all duration-300 text-white ${className}`}
        aria-label={ariaLabel}
    >
        {children}
    </button>
  );

  if (isRinging) {
    return (
        <div className="fixed bottom-16 left-0 right-0 p-4 z-50 flex justify-around items-center max-w-xs mx-auto">
            <ControlButton onClick={onHangUp} className="bg-red-500 hover:bg-red-600" ariaLabel="Hang Up" size="w-16 h-16">
                <HangUpIcon />
            </ControlButton>
            {onAccept && (
                <ControlButton onClick={onAccept} className="bg-green-500 hover:bg-green-600 animate-pulse" ariaLabel="Accept Call" size="w-16 h-16">
                    <AcceptIcon />
                </ControlButton>
            )}
        </div>
    )
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 p-4 z-50">
      <div className="max-w-md mx-auto bg-black/30 backdrop-blur-sm rounded-full shadow-lg">
        <div className="flex justify-evenly items-center p-2">

          <ControlButton onClick={onToggleMic} className={isMicMuted ? 'bg-white/20 hover:bg-white/30' : 'bg-white/40 hover:bg-white/50'} ariaLabel={isMicMuted ? 'Unmute' : 'Mute'}>
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </ControlButton>

          {isVideoCall && (
            <ControlButton onClick={onToggleCamera} className={isCameraOff ? 'bg-white/20 hover:bg-white/30' : 'bg-white/40 hover:bg-white/50'} ariaLabel={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}>
              {isCameraOff ? <CameraOffIcon /> : <CameraOnIcon />}
            </ControlButton>
          )}

          <ControlButton onClick={onHangUp} className="bg-red-500 hover:bg-red-600" ariaLabel="Hang Up" size="w-16 h-16">
            <HangUpIcon />
          </ControlButton>

        </div>
      </div>
    </div>
  );
};

export default CallControls;
