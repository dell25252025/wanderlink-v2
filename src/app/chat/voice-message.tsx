'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, Trash2, Play, Pause, Loader2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// --- Reusable Audio Player ---
interface AudioPlayerProps {
  audioUrl: string;
  isSender: boolean;
}

export const AudioPlayer = ({ audioUrl, isSender }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const setAudioData = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / audio.duration) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const floorSeconds = Math.floor(seconds);
    const minutes = Math.floor(floorSeconds / 60);
    const remainingSeconds = floorSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const displayTime = formatTime(duration - currentTime);

  return (
    <div className="flex items-center gap-2 w-[200px]">
      <Button onClick={togglePlay} size="icon" variant="ghost" className={`rounded-full flex-shrink-0 h-9 w-9 ${isSender ? 'text-primary-foreground hover:bg-primary/80' : 'text-secondary-foreground hover:bg-secondary/80'}`}>
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-grow h-1 bg-muted-foreground/30 rounded-full relative">
        <div className={`h-1 rounded-full ${isSender ? 'bg-primary-foreground' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs font-mono w-10 text-right opacity-70">{displayTime}</span>
    </div>
  );
};


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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
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
        if (event.data.size > 0) chunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if(blob.size > 0){
            setAudioBlob(blob);
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
        }
        stream.getTracks().forEach(track => track.stop());
      });

      mediaRecorderRef.current.start();
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erreur',
        description: "Veuillez autoriser l'accès au microphone.",
        variant: 'destructive',
      });
      onCancel();
    }
  }, [toast, onCancel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  }, [isRecording]);

  useEffect(() => {
    startRecording();
    return () => {
      clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if(previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [startRecording, previewUrl]);

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (previewUrl) {
    return (
      <div className="flex items-center gap-2 p-2 w-full">
        <AudioPlayer audioUrl={previewUrl} isSender={true} />
        <Button onClick={handleSend} size="icon" className="rounded-full h-10 w-10 flex-shrink-0" disabled={isSending}>
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
        <Button onClick={onCancel} size="icon" variant="ghost" className="rounded-full h-10 w-10 flex-shrink-0" disabled={isSending}>
          <Trash2 className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-2 w-full bg-background h-14">
      <div className="flex items-center gap-2">
          <Button onClick={stopRecording} size="icon" variant="destructive" className="rounded-full h-10 w-10">
               <Square className="h-5 w-5" />
          </Button>
          <div className="text-sm text-muted-foreground font-mono w-12">{formatTime(recordingTime)}</div>
      </div>
      <div className="flex items-center gap-2 text-red-500">
          <Mic className="h-5 w-5 animate-pulse" />
          <span className="text-sm">Enregistrement...</span>
      </div>
       <Button onClick={onCancel} size="icon" variant="ghost" className="rounded-full h-10 w-10">
         <Trash2 className="h-5 w-5" />
       </Button>
    </div>
  );
}
