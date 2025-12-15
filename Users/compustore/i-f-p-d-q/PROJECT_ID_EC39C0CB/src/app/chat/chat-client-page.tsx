
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Ban, ShieldAlert, Image as ImageIcon, Mic, Camera, Smile, Circle, X, Phone, Video, Trash2, Plus, Play, Pause, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserProfile, submitAbuseReport } from '@/lib/firebase-actions';
import type { DocumentData } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Picker, { type EmojiClickData, Categories, EmojiStyle } from 'emoji-picker-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { ReportAbuseDialog } from '@/components/report-abuse-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { collection, addDoc } from 'firebase/firestore';


interface Message {
  id: number;
  text: string;
  sender: 'me' | 'other';
  image: string | null;
  audio: string | null;
}

// Mock messages for demonstration purposes
const initialMessages: Message[] = [
  { id: 1, text: 'Salut ! Ton profil est super intéressant.', sender: 'other', image: null, audio: null },
  { id: 2, text: 'Merci beaucoup ! Le tien aussi. Prêt pour l\'aventure ?', sender: 'me', image: null, audio: null },
  { id: 3, text: 'Toujours ! Où rêves-tu d\'aller en premier ?', sender: 'other', image: null, audio: null },
];

const CameraView = ({ onCapture, onClose }: { onCapture: (image: string) => void; onClose: () => void; }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Accès à la caméra refusé',
          description: 'Veuillez autoriser l\'accès à la caméra dans les paramètres de votre navigateur.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
         (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onCapture(dataUrl);
      }
    }
  };

  return (
    <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-black border-0 flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            <canvas ref={canvasRef} className="hidden" />

            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                    <Alert variant="destructive">
                        <AlertTitle>Accès à la caméra requis</AlertTitle>
                        <AlertDescription>
                            Impossible d'accéder à la caméra. Veuillez vérifier les autorisations dans les paramètres de votre navigateur.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
            
             <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 text-white bg-black/30 hover:bg-black/50 hover:text-white"
                onClick={onClose}
             >
                <X className="h-6 w-6" />
             </Button>
            
            {hasCameraPermission && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
                    <Button
                        size="icon"
                        className="w-20 h-20 rounded-full bg-white/30 border-4 border-white backdrop-blur-sm"
                        onClick={handleCapture}
                    >
                       <Circle className="w-12 h-12 text-white" fill="white" />
                    </Button>
                </div>
            )}
        </div>
    </DialogContent>
  );
};

const AudioPlayer = ({ audioUrl }: { audioUrl: string }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100);
    };
    const handleEnd = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', handleEnd);
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('ended', handleEnd);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 w-[150px]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <Button onClick={togglePlay} size="icon" variant="ghost" className="h-8 w-8 shrink-0">
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Progress value={progress} className="w-full h-1.5" />
    </div>
  );
};

const EmojiPickerContent = ({ onEmojiClick, onOutsideClick }: { onEmojiClick: (emojiData: EmojiClickData) => void; onOutsideClick?: () => void; }) => (
    <div className="h-[350px] overflow-y-auto">
        <Picker
            onEmojiClick={onEmojiClick}
            searchDisabled
            skinTonesDisabled
            emojiStyle={EmojiStyle.NATIVE}
            emojiSize={22}
            width="100%"
            height="100%"
            categories={[
              { category: Categories.SUGGESTED, name: "Suggérés" },
              { category: Categories.TRAVEL_PLACES, name: "Voyage & Lieux" },
              { category: Categories.ACTIVITIES, name: "Activités" },
              { category: Categories.SMILEYS_PEOPLE, name: "Émotions" },
              { category: Categories.ANIMALS_NATURE, name: "Nature" },
              { category: Categories.FOOD_DRINK, name: "Nourriture" },
              { category: Categories.OBJECTS, name: "Objets" },
            ]}
        />
    </div>
);


export default function ChatClientPage({ otherUserId }: { otherUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const isDesktop = useMediaQuery('(min-width: 768px)');


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (otherUserId) {
      const fetchUserProfile = async () => {
        const profile = await getUserProfile(otherUserId);
        setOtherUser(profile);
      };
      fetchUserProfile();
    }
  }, [otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          sendImageMessage(result);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCapturePhoto = (image: string) => {
    sendImageMessage(image);
    setIsCameraOpen(false);
  };

  const sendImageMessage = (imageData: string) => {
    setMessages(prev => [...prev, { id: Date.now(), text: '', sender: 'me', image: imageData, audio: null }]);
  };


  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prevMessage => prevMessage + emojiData.emoji);
    if (!isDesktop) {
        setIsEmojiPickerOpen(false);
    }
  };


  const handleSendMessage = (e: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        { id: Date.now(), text: newMessage, sender: 'me', image: null, audio: null },
      ]);
      setNewMessage('');
    }
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage(event);
    }
  };
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = event => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setMessages(prev => [...prev, { id: Date.now(), text: '', sender: 'me', image: null, audio: audioUrl }]);
        stream.getTracks().forEach(track => track.stop()); // Stop microphone access
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      toast({ variant: 'destructive', title: 'Erreur de microphone', description: "Impossible d'accéder au microphone. Veuillez vérifier les autorisations." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };


  const startLongPress = (messageId: number) => {
    longPressTimer.current = setTimeout(() => {
      setMessageToDelete(messageId);
    }, 1000); // 1-second long press
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleDeleteMessage = () => {
    if (messageToDelete !== null) {
      setMessages(messages.filter(msg => msg.id !== messageToDelete));
      setMessageToDelete(null);
      toast({
        title: 'Message supprimé',
      });
    }
  };


  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const maxHeight = 120;
        textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [newMessage]);
  
  const handleStartCall = async (isVideo: boolean) => {
    if (!otherUserId || !currentUser) return;

     try {
      const callDocRef = await addDoc(collection(db, 'calls'), {
        callerId: currentUser.uid,
        calleeId: otherUserId,
        status: 'ringing',
        type: isVideo ? 'video' : 'audio',
        createdAt: new Date().toISOString(),
      });
      router.push(`/call?callId=${callDocRef.id}&video=${isVideo}`);
    } catch (error) {
      console.error("Error creating call:", error);
      toast({ variant: 'destructive', title: 'Erreur d\'appel', description: 'Impossible de démarrer l\'appel.' });
    }
  };
  
  const handleBlockUser = () => {
    if (!otherUser || !otherUserId) return;
    try {
      const blockedUsers = JSON.parse(localStorage.getItem('blockedUsers') || '[]');
      const userToBlock = {
        id: otherUserId,
        name: otherUser?.firstName || 'Utilisateur',
        avatarUrl: otherUser?.profilePictures?.[0] || `https://picsum.photos/seed/${otherUserId}/200`,
      };
      
      if (!blockedUsers.some((u: any) => u.id === otherUserId)) {
        blockedUsers.push(userToBlock);
        localStorage.setItem('blockedUsers', JSON.stringify(blockedUsers));
      }

      toast({ title: `${otherUser?.firstName} a été bloqué(e).` });
      router.push('/settings/blocked-users');

    } catch (error) {
      console.error("Error blocking user:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de bloquer cet utilisateur.' });
    }
  };

  const handleReportUser = () => {
    setIsReportModalOpen(true);
  };

  const otherUserName = otherUser?.firstName || 'Utilisateur';
  const otherUserImage = otherUser?.profilePictures?.[0] || `https://picsum.photos/seed/${otherUserId}/200`;
  const otherUserIsVerified = otherUser?.isVerified ?? false;

  const showSendButton = newMessage.trim().length > 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="fixed top-0 z-10 flex w-full items-center gap-2 border-b bg-background/95 px-2 py-1 backdrop-blur-sm h-12">
        <Button onClick={() => router.push('/')} variant="ghost" size="icon" className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Link href={`/profile?id=${otherUserId}`} className="flex min-w-0 flex-1 items-center gap-2 truncate">
          <Avatar className="h-8 w-8">
            <AvatarImage src={otherUserImage} alt={otherUserName} />
            <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate flex items-center gap-1.5">
            <h1 className="truncate text-sm font-semibold">{otherUserName}</h1>
            {otherUserIsVerified && <CheckCircle className="h-3.5 w-3.5 text-blue-500 shrink-0" />}
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartCall(true)}>
          <Video className="h-4 w-4" />
        </Button>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
                <DrawerHeader>
                    <DrawerTitle>Options</DrawerTitle>
                    <DrawerDescription>Gérez votre interaction avec ce profil.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pt-0">
                    <div className="mt-3 h-full">
                        <DrawerClose asChild>
                              <Button variant="outline" className="w-full justify-start p-4 h-auto text-base" onClick={handleBlockUser}>
                                  <Ban className="mr-2 h-5 w-5" /> Bloquer
                              </Button>
                        </DrawerClose>
                        <div className="my-2 border-t"></div>
                        <DrawerClose asChild>
                              <Button variant="outline" className="w-full justify-start p-4 h-auto text-base" onClick={handleReportUser}>
                                  <ShieldAlert className="mr-2 h-5 w-5" /> Signaler un abus
                              </Button>
                        </DrawerClose>
                    </div>
                </div>
                <div className="p-4">
                    <DrawerClose asChild>
                        <Button variant="secondary" className="w-full h-12 text-base">Annuler</Button>
                    </DrawerClose>
                </div>
            </div>
          </DrawerContent>
        </Drawer>
      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-20">
        <div className="space-y-4 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.sender === 'me' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'other' && (
                <Avatar className="h-6 w-6">
                   <AvatarImage src={otherUserImage} alt={otherUserName} />
                   <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div
                onMouseDown={() => message.sender === 'me' && startLongPress(message.id)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => message.sender === 'me' && startLongPress(message.id)}
                onTouchEnd={cancelLongPress}
                className={`max-w-[70%] rounded-2xl text-sm md:text-base ${
                  (message.text || message.audio) ? 'px-3 py-2' : 'p-1'
                } ${
                  message.sender === 'me'
                    ? 'rounded-br-none bg-primary text-primary-foreground select-none'
                    : 'rounded-bl-none bg-secondary text-secondary-foreground'
                }`}
              >
                {message.text}
                {message.audio && <AudioPlayer audioUrl={message.audio} />}
                {message.image && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="block cursor-pointer">
                        <Image 
                          src={message.image} 
                          alt="Image envoyée" 
                          width={200} 
                          height={200}
                          className="rounded-xl object-cover"
                        />
                      </button>
                    </DialogTrigger>
                    <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-black/80 backdrop-blur-sm border-0 flex flex-col items-center justify-center">
                       <DialogHeader className="sr-only">
                          <DialogTitle>Visionneuse d'image</DialogTitle>
                          <DialogDescription>Image en plein écran.</DialogDescription>
                       </DialogHeader>
                        <div className="relative w-full h-full">
                           <Image 
                              src={message.image} 
                              alt="Image envoyée en plein écran" 
                              fill
                              className="object-contain"
                            />
                        </div>
                        <DialogClose className="absolute top-2 right-2 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 hover:text-white">
                            <X className="h-6 w-6" />
                        </DialogClose>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          ))}
           <div ref={messagesEndRef} />
        </div>
      </main>

       <footer className="fixed bottom-0 z-10 w-full border-t bg-background/95 backdrop-blur-sm px-2 py-1.5">
         {isRecording && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-destructive text-destructive-foreground px-3 py-1 rounded-full text-sm">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
            Enregistrement...
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 w-full">
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                    <Plus className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-1 mb-2">
                <div className="flex gap-1">
                  <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
                      <DialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon">
                              <Camera className="h-4 w-4" />
                          </Button>
                      </DialogTrigger>
                      {isCameraOpen && <CameraView onCapture={handleCapturePhoto} onClose={() => setIsCameraOpen(false)} />}
                  </Dialog>
                  <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="h-4 w-4" />
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          
            <div className="flex-1 relative flex items-center min-w-0 bg-secondary rounded-xl">
                <Textarea
                    ref={textareaRef}
                    rows={1}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    className="w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent py-2.5 px-3 pr-8 min-h-[20px] max-h-32 overflow-y-auto text-sm"
                    autoComplete="off"
                />
                
                <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                  <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-full max-w-[320px] p-0 border-none mb-2">
                    <EmojiPickerContent 
                      onEmojiClick={handleEmojiClick} 
                      onOutsideClick={() => setIsEmojiPickerOpen(false)}
                    />
                  </PopoverContent>
                </Popover>
            </div>
          
            <div className="shrink-0">
              <Button
                  type={showSendButton ? "submit" : "button"}
                  variant="ghost"
                  size="icon"
                  className={cn("shrink-0 h-8 w-8", showSendButton ? "text-primary" : "text-muted-foreground")}
                  onMouseDown={!showSendButton ? startRecording : undefined}
                  onMouseUp={!showSendButton ? stopRecording : undefined}
                  onTouchStart={!showSendButton ? startRecording : undefined}
                  onTouchEnd={!showSendButton ? stopRecording : undefined}
                  aria-label={showSendButton ? "Envoyer" : "Envoyer un message vocal"}
              >
                  {showSendButton ? (
                      <Send className="h-4 w-4" />
                  ) : (
                      <Mic className="h-4 w-4" />
                  )}
              </Button>
            </div>
        </form>
         <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleImageSelect}
        />
      </footer>
      
      <AlertDialog open={messageToDelete !== null} onOpenChange={(open) => !open && setMessageToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Supprimer le message ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Cette action est irréversible et supprimera le message de cette conversation.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteMessage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <ReportAbuseDialog 
        isOpen={isReportModalOpen} 
        onOpenChange={setIsReportModalOpen} 
        reportedUser={otherUser}
      />
    </div>
  );
}
