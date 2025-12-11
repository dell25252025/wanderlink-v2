
import React from 'react';

// Props interface to define the functions and states passed to the component
interface CallControlsProps {
  onHangUp: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  isMicMuted: boolean;
  isCameraOff: boolean;
}

// SVG Icon Components for clarity
const MicOnIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
  </svg>
);

const MicOffIcon = () => (
  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.084A2.96 2.96 0 008 8v1a1 1 0 002 0V8a1 1 0 112 0v1a1 1 0 102 0V8a3 3 0 00-3-2.916z"></path>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 8a1 1 0 01-2 0V5a1 1 0 112 0v3zM19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3zM5 5l14 14"></path>
  </svg>
);

const CameraOnIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
    </svg>
);

const CameraOffIcon = () => (
    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 10l2.553-1.276A1 1 0 0117 9.618v4.764a1 1 0 01-1.447.894L13.5 14M5 18h4.5a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2zm16-13l-14 14"></path>
    </svg>
);

const HangUpIcon = () => (
  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .38-.21.71-.53.88-1.55.82-2.84 2.11-3.66 3.66-.17.32-.5.54-.88.54H.72C.25 17.9-.03 17.4 0 16.8c.34-5.22 4.53-9.4 9.75-9.75.6-.03 1.05.24 1.05.72V9zM22.95 21.84c-.32.17-.65.24-.98.24-.32 0-.64-.07-.95-.21l-3.23-1.53c-.39-.18-.63-.56-.63-.98V15.5c0-1.01-.82-1.83-1.83-1.83H14.5c-.38 0-.71-.21-.88-.53-.82-1.55-2.11-2.84-3.66-3.66-.32-.17-.54-.5-.54-.88V8.72c0-.47-.39-.82-.82-.82H3.1c-.38 0-.71.21-.88.53-1.55.82-2.84 2.11-3.66 3.66-.17.32-.5.53-.88.53H-.75c-.47 0-.82-.39-.82-.82v-.75c.03-6.44 5.28-11.69 11.72-11.72h.75c.47 0 .82.39.82.82v4.59c0 .38.21.71.53.88 1.55.82 2.84 2.11 3.66 3.66.32.17.54.5.88.54h.82c.47 0 .82.39.82.82v.82c0 .38.21.71.53.88 1.55.82 2.84 2.11 3.66 3.66.17.32.5.53.88.53h.75c.47 0 .82.39.82.82l-.01.99z"></path>
  </svg>
);

export const CallControls: React.FC<CallControlsProps> = ({
  onHangUp,
  onToggleMic,
  onToggleCamera,
  isMicMuted,
  isCameraOff,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
      <div className="max-w-xs mx-auto bg-black/40 backdrop-blur-md rounded-full shadow-lg">
        <div className="flex justify-evenly items-center p-2 space-x-2">
          
          {/* Microphone Toggle Button */}
          <button
            onClick={onToggleMic}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300
                        ${isMicMuted ? 'bg-white/80' : 'bg-white/30 hover:bg-white/40'}`}
            aria-label={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMicMuted ? <MicOffIcon /> : <MicOnIcon />}
          </button>

          {/* Camera Toggle Button */}
          <button
            onClick={onToggleCamera}
            className={`w-14 h-14 flex items-center justify-center rounded-full transition-all duration-300
                        ${isCameraOff ? 'bg-white/80' : 'bg-white/30 hover:bg-white/40'}`}
            aria-label={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? <CameraOffIcon /> : <CameraOnIcon />}
          </button>

          {/* Hang Up Button */}
          <button
            onClick={onHangUp}
            className="w-16 h-16 flex items-center justify-center bg-red-500 hover:bg-red-600 rounded-full transition-all duration-300"
            aria-label="Hang Up"
          >
            <HangUpIcon />
          </button>

        </div>
      </div>
    </div>
  );
};

export default CallControls;
