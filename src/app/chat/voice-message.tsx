
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, Trash2, Play, Pause, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// --- Voice Recorder Component ---
interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
  isSending: boolean;
}

export function VoiceRecorder({ onSend, onCancel, isSending }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', (event) => {
        chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop()); // Stop the microphone access
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0); // Reset timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description: 'Could not start recording. Please ensure you have given microphone permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
    }
  };

  const handleCancelRecording = () => {
      if (isRecording) {
          stopRecording();
      }
      setAudioBlob(null);
      setRecordingTime(0);
      if (mediaRecorderRef.current) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      onCancel();
  };


  useEffect(() => {
    // Cleanup on unmount
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg">
        <AudioPlayer blob={audioBlob} />
        <Button onClick={handleSend} size="icon" disabled={isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
        <Button onClick={handleCancelRecording} size="icon" variant="ghost" disabled={isSending}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 p-2">
      {!isRecording ? (
        <Button onClick={startRecording} size="icon" className="rounded-full">
          <Mic className="h-5 w-5" />
        </Button>
      ) : (
        <div className="flex items-center space-x-2 flex-grow bg-muted p-2 rounded-lg">
           <Button onClick={stopRecording} size="icon" variant="destructive" className="rounded-full">
                <Mic className="h-5 w-5" />
           </Button>
          <div className="text-sm text-red-500 font-mono w-12">{formatTime(recordingTime)}</div>
          <div className="text-sm text-muted-foreground">Recording...</div>
           <Button onClick={handleCancelRecording} size="icon" variant="ghost">
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>
      )}
    </div>
  );
}

// --- Audio Player for preview ---
interface AudioPlayerProps {
    blob: Blob;
}

function AudioPlayer({ blob }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);


    useEffect(() => {
        const url = URL.createObjectURL(blob);
        audioRef.current = new Audio(url);

        const handleTimeUpdate = () => {
            if(audioRef.current) {
                setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
        };

        audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.addEventListener('ended', handleEnded);

        return () => {
            URL.revokeObjectURL(url);
            if (audioRef.current) {
                audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
                audioRef.current.removeEventListener('ended', handleEnded);
            }
        };
    }, [blob]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (audioRef.current && progressRef.current) {
            const rect = progressRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const width = rect.width;
            const duration = audioRef.current.duration;
            const newTime = (x/width) * duration;
            audioRef.current.currentTime = newTime;
        }
    }

    const formatDuration = (seconds: number): string => {
        if (isNaN(seconds) || seconds === 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }


    return (
        <div className="flex items-center space-x-2 flex-grow">
            <Button onClick={togglePlay} size="icon" variant="ghost">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div ref={progressRef} onClick={handleSeek} className="w-full h-2 bg-gray-300 rounded-full cursor-pointer">
                <div style={{ width: `${progress}%`}} className="h-full bg-primary rounded-full"></div>
            </div>
            {audioRef.current && <span className="text-sm font-mono text-muted-foreground">{formatDuration(audioRef.current.duration)}</span>}
        </div>
    );
}
