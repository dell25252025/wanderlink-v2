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
    // Start recording immediately on mount
    startRecording();

    // Cleanup on unmount
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
       if (mediaRecorderRef.current) {
           mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
       }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (audioBlob) {
    return (
      <div className="flex items-center space-x-2 p-2 bg-muted rounded-lg w-full">
        <AudioPlayer blob={audioBlob} duration={recordingTime} />
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
    <div className="flex items-center space-x-2 p-2 w-full">
        <div className="flex items-center space-x-3 flex-grow bg-muted p-2 rounded-lg">
           <Mic className="h-5 w-5 text-red-500 animate-pulse" />
           <div className="text-sm text-red-500 font-mono w-12">{formatTime(recordingTime)}</div>
           <div className="flex-grow text-sm text-muted-foreground">Enregistrement...</div>
            <Button onClick={stopRecording} size="icon" variant="secondary" className="rounded-full">
                 <CheckCircle className="h-5 w-5 text-green-500" />
            </Button>
           <Button onClick={handleCancelRecording} size="icon" variant="ghost">
             <Trash2 className="h-4 w-4" />
           </Button>
        </div>
    </div>
  );
}

// --- Audio Player for preview and chat messages ---
interface AudioPlayerProps {
    blob?: Blob;
    url?: string;
    duration: number; // duration in seconds
}

export function AudioPlayer({ blob, url, duration }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const audioUrl = url || (blob ? URL.createObjectURL(blob) : null);
        if (!audioUrl) return;

        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const handleTimeUpdate = () => {
            if(audioRef.current && audioRef.current.duration) {
                setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                setCurrentTime(audioRef.current.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
             if(audioRef.current) {
                setCurrentTime(0);
                setProgress(0);
             }
        }

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);

        return () => {
            if (blob && audioUrl && audioUrl.startsWith('blob:')) {
                URL.revokeObjectURL(audioUrl);
            }
            if (audio) {
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.pause();
                audio.src = '';
            }
        };
    }, [blob, url]);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleSeek = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if (audioRef.current && progressRef.current && audioRef.current.duration) {
            const rect = progressRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const width = rect.width;
            const newTime = (x/width) * audioRef.current.duration;
            audioRef.current.currentTime = newTime;
        }
    }

    const formatTime = (seconds: number): string => {
        if (isNaN(seconds) || seconds < 0) return "0:00";
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    }

    const displayDuration = audioRef.current?.duration && isFinite(audioRef.current.duration) ? audioRef.current.duration : duration;

    return (
        <div className="flex items-center space-x-2 flex-grow w-full">
            <Button onClick={togglePlay} size="icon" variant="ghost" className="shrink-0">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex items-center space-x-2 flex-grow">
                <div ref={progressRef} onClick={handleSeek} className="w-full h-1.5 bg-gray-300 rounded-full cursor-pointer relative group">
                    <div style={{ width: `${progress}%`}} className="h-full bg-primary rounded-full relative">
                       <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground w-16 text-right">{isPlaying ? formatTime(currentTime) : formatTime(displayDuration)}</span>
            </div>
        </div>
    );
}