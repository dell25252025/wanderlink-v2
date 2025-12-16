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
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (event) => { chunksRef.current.push(event.data); };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                chunksRef.current = [];
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setIsRecording(true);
            setAudioBlob(null);
            setRecordingTime(0);
            timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            toast({
                title: "Erreur d'enregistrement",
                description: "Impossible d'accéder au microphone. Veuillez vérifier les autorisations de votre navigateur.",
                variant: "destructive",
            });
            onCancel();
        }
    }, [toast, onCancel]);

    const stopRecording = () => {
        if (mediaRecorderRef.current?.state === "recording") {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, recordingTime);
        }
    };

    // Start recording automatically
    useEffect(() => {
        startRecording();
    }, [startRecording]);

    // Cleanup function
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center w-full gap-2 px-2">
            {isSending ? (
                <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm text-muted-foreground flex-1">Envoi en cours...</span>
                </>
            ) : (
                <>
                    <Button onClick={onCancel} variant="ghost" size="icon">
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </Button>
                    
                    <div className="flex-1 flex items-center justify-center gap-2 font-mono text-sm">
                         <Mic className={`h-5 w-5 ${isRecording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                         <span>{formatTime(recordingTime)}</span>
                    </div>

                    <Button 
                        onClick={isRecording ? stopRecording : handleSend}
                        size="icon" 
                        className="h-9 w-9 bg-primary text-primary-foreground rounded-full shadow-lg disabled:bg-secondary"
                        disabled={!isRecording && !audioBlob}
                    >
                        {isRecording ? <Pause className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    </Button>
                </>
            )}
        </div>
    );
}

// --- Voice Player Component ---
interface VoicePlayerProps {
    audioUrl: string;
}

export function VoicePlayer({ audioUrl }: VoicePlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        const setAudioData = () => { setDuration(audio.duration); };
        const setAudioTime = () => {
            setCurrentTime(audio.currentTime);
            setProgress((audio.currentTime / audio.duration) * 100);
        };
        const setAudioEnd = () => {
            setIsPlaying(false);
            setProgress(0);
            setCurrentTime(0);
        };

        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        audio.addEventListener('ended', setAudioEnd);

        return () => {
            audio.pause();
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
            audio.removeEventListener('ended', setAudioEnd);
        };
    }, [audioUrl]);

    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                if(audioRef.current.ended) audioRef.current.currentTime = 0;
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };
    
    const formatTime = (seconds: number) => {
        if (isNaN(seconds) || seconds === Infinity) return '00:00';
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center gap-2 w-full max-w-[250px]" style={{ direction: 'ltr' }}>
            <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0">
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </Button>
            <div className="flex-1 flex items-center gap-2">
                 <div className="w-full bg-secondary rounded-full h-1.5">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-xs text-muted-foreground font-mono w-12 tabular-nums">
                    {formatTime(duration - currentTime)}
                </span>
            </div>
        </div>
    );
}
