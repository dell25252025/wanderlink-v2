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
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erreur de microphone',
        description: "Impossible d'accéder au microphone. Veuillez vérifier les permissions de votre navigateur.",
        variant: 'destructive',
      });
      onCancel(); // Go back if permission is denied
    }
  }, [toast, onCancel]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [startRecording]);

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, recordingTime);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center justify-between w-full h-full px-2">
        <Button onClick={onCancel} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <Trash2 className="h-4 w-4" />
        </Button>
      <div className="flex items-center gap-2">
        {isRecording && <Mic className="h-5 w-5 text-red-500 animate-pulse" />}
        {!audioBlob && <span className="text-sm font-mono">{formatTime(recordingTime)}</span>}
        {audioBlob && !isRecording && <span className="text-sm text-muted-foreground">Enregistrement terminé</span>}
      </div>
      
      {isRecording ? (
        <Button onClick={stopRecording} variant="default" size="icon" className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-600">
          <div className="h-3 w-3 bg-white rounded-sm"></div>
        </Button>
      ) : (
        <Button onClick={handleSend} variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!audioBlob || isSending}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}


// --- Voice Player Component ---
interface VoicePlayerProps {
  audioUrl: string;
}

export function VoicePlayer({ audioUrl }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
        if (isFinite(audio.duration)) {
            setDuration(audio.duration);
        }
        setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', () => setIsPlaying(false));
    };
  }, []);

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === 0) return '00:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !audioRef.current || !isFinite(duration)) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (x / width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 w-full max-w-[200px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata"></audio>
      <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <div className="flex-1 flex items-center gap-2">
        <div ref={progressRef} onClick={handleProgressClick} className="w-full h-1 bg-muted-foreground/30 rounded-full cursor-pointer">
            <div style={{ width: `${progress}%` }} className="h-full bg-primary rounded-full"></div>
        </div>
        <span className="text-xs font-mono text-muted-foreground">{formatTime(duration > 0 ? duration : 0)}</span>
      </div>
    </div>
  );
}