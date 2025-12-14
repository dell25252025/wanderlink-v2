
import React from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

interface CallControlsProps {
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
  isRinging?: boolean;
  isVideoCall?: boolean;
}

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

  if (isRinging) {
    return (
        <div className="fixed bottom-16 left-0 right-0 p-4 z-50 flex justify-center">
            <ControlButton onClick={onHangUp} danger ariaLabel="Hang Up" size="w-16 h-16">
              <PhoneOff className="w-8 h-8 text-white" />
            </ControlButton>
        </div>
    )
  }

  return (
    <div className="fixed bottom-16 left-0 right-0 p-4 z-50">
      <div className="max-w-md mx-auto bg-black/30 backdrop-blur-sm rounded-full shadow-lg">
        <div className="flex justify-evenly items-center p-2">
          
          <ControlButton onClick={onToggleMic} active={!isMicMuted} ariaLabel={isMicMuted ? 'Unmute' : 'Mute'}>
            {isMicMuted ? <MicOff /> : <Mic />}
          </ControlButton>

          {isVideoCall && (
            <ControlButton onClick={onToggleCamera} active={!isCameraOff} ariaLabel={isCameraOff ? 'Camera On' : 'Camera Off'}>
              {isCameraOff ? <VideoOff /> : <Video />}
            </ControlButton>
          )}

          <ControlButton onClick={onHangUp} danger ariaLabel="Hang Up" size="w-16 h-16">
            <PhoneOff className="w-8 h-8 text-white" />
          </ControlButton>

        </div>
      </div>
    </div>
  );
};

export default CallControls;
