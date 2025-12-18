
'use client';

import { useState, useEffect, useRef, memo, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Ban, ShieldAlert, Smile, X, Video, Loader2, CheckCircle, PlusCircle, Trash2, Camera as CameraIcon, Mic, Image as ImageIcon, Copy } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserProfile, initiateCall } from '@/lib/firebase-actions';
import { auth, db, storage } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogClose, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Picker, { type EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import { Textarea } from '@/components/ui/textarea';
import { ReportAbuseDialog } from '@/components/report-abuse-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, limit, deleteField } from 'firebase/firestore';
import type { DocumentData, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadString } from "firebase/storage";
import { Camera, CameraResultType, CameraSource, PermissionState } from '@capacitor/camera';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { AudioPlayer, VoiceRecorder } from './voice-message';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';


// --- Interfaces ---
interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
  audioUrl?: string | null;
  audioDuration?: number;
  reactions?: { [userId: string]: string };
}

interface MessageItemProps {
  message: Message;
  isSender: boolean;
  isLastRead: boolean;
  otherUserImage: string;
  otherUserName: string;
  onLongPressStart: (messageId: string) => void;
  onLongPressEnd: () => void;
  onReact: (message: Message, emoji: string) => void;
  onSetupDelete: (message: Message) => void;
  onCopy: (text: string) => void;
  onZoomImage: (imageUrl: string) => void;
  showReactionPopoverFor: string | null;
  setShowReactionPopoverFor: (id: string | null) => void;
}

// --- Constants ---
const availableReactions = ['❤️', '😂', '👍', '😢', '😮', '😡'];
const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

// --- Photo Viewer Component for Zooming ---
const PhotoViewer = ({ imageUrl, onClose }: { imageUrl: string; onClose: () => void; }) => {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    const lastDist = useRef(0);

    const resetZoom = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
        lastDist.current = 0;
    };

    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.ctrlKey) {
                setScale(s => Math.max(1, Math.min(3, s - e.deltaY * 0.01)));
            } else {
                setPosition(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
            }
        };

        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                lastDist.current = Math.sqrt(dx * dx + dy * dy);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const change = dist - lastDist.current;
                setScale(s => Math.max(1, Math.min(3, s + change * 0.01)));
                lastDist.current = dist;
            }
        };

        const imageEl = imageRef.current;
        imageEl?.addEventListener('wheel', handleWheel, { passive: false });
        imageEl?.addEventListener('touchstart', handleTouchStart, { passive: true });
        imageEl?.addEventListener('touchmove', handleTouchMove, { passive: false });
        
        return () => {
            imageEl?.removeEventListener('wheel', handleWheel);
            imageEl?.removeEventListener('touchstart', handleTouchStart);
            imageEl?.removeEventListener('touchmove', handleTouchMove);
        };
    }, []);

    useEffect(() => {
        if (scale === 1) {
            setPosition({ x: 0, y: 0 });
        }
    }, [scale]);

    return (
        <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-black/80 backdrop-blur-sm border-0 flex flex-col items-center justify-center">
            <DialogHeader>
                <DialogTitle>
                    <VisuallyHidden>Image en plein écran</VisuallyHidden>
                </DialogTitle>
            </DialogHeader>
            <DialogClose asChild className="absolute top-2 right-2 z-50">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-white bg-black/30 hover:bg-black/50 hover:text-white" onClick={onClose}>
                    <X className="h-5 w-5" />
                </Button>
            </DialogClose>
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <Image
                    ref={imageRef}
                    src={imageUrl}
                    alt="Image zoomée"
                    fill
                    className="object-contain transition-transform duration-200 touch-none"
                    style={{
                        transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                        cursor: scale > 1 ? 'grab' : 'auto',
                    }}
                     onMouseDown={(e) => {
                        if (scale <= 1) return;
                        const startPos = { x: e.clientX - position.x, y: e.clientY - position.y };
                        const handleMouseMove = (me: MouseEvent) => {
                            setPosition({ x: me.clientX - startPos.x, y: me.clientY - startPos.y });
                        };
                        const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                        };
                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                    }}
                />
            </div>
        </DialogContent>
    );
};


// --- Memoized Message Component ---
const MessageItem = memo<MessageItemProps>(({ 
    message, isSender, isLastRead, otherUserImage, otherUserName, 
    onLongPressStart, onLongPressEnd, onReact, onSetupDelete, onCopy, onZoomImage,
    showReactionPopoverFor, setShowReactionPopoverFor
}) => {
    const reactions = message.reactions ? Object.entries(message.reactions) : [];

    const renderContent = () => {
        if (message.imageUrl) {
            return <button onClick={() => onZoomImage(message.imageUrl!)}><Image src={message.imageUrl} alt="" width={250} height={300} className="object-cover" /></button>;
        }
        if (message.audioUrl) {
            return <AudioPlayer audioUrl={message.audioUrl} isSender={isSender} />;
        }
        return <span className="select-text">{message.text}</span>;
    }

    return (
        <div onContextMenu={(e) => e.preventDefault()}>
            <Popover open={showReactionPopoverFor === message.id} onOpenChange={(isOpen) => !isOpen && setShowReactionPopoverFor(null)}>
                <PopoverTrigger asChild>
                    <div 
                        onTouchStart={() => onLongPressStart(message.id)}
                        onTouchEnd={onLongPressEnd}
                        onMouseDown={() => onLongPressStart(message.id)}
                        onMouseUp={onLongPressEnd}
                        onMouseLeave={onLongPressEnd}
                        className={`flex items-end gap-2 relative ${isSender ? 'justify-end' : 'justify-start'}`}>
                        {!isSender && <Avatar className="h-6 w-6 self-end"><AvatarImage src={otherUserImage} /><AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback></Avatar>}
                        <div className={`max-w-[75%] rounded-2xl break-words relative ${isSender ? 'active:scale-95 transition-transform duration-150' : ''} ${message.imageUrl ? 'p-0 overflow-hidden' : 'px-3 py-2 ' + (isSender ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-secondary')}`}>
                            {renderContent()}
                            {reactions.length > 0 && <div className={`absolute -bottom-3 text-xs rounded-full bg-secondary border px-1.5 py-0.5 ${isSender ? 'right-2' : 'left-2'}`}>{reactions.map(([_, emoji]) => emoji)[0]} {reactions.length > 1 ? `+${reactions.length - 1}`: ''}</div>}
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1 rounded-full">
                    <div className="flex items-center gap-1">
                        {availableReactions.map(emoji => <Button key={emoji} onClick={() => onReact(message, emoji)} variant="ghost" size="icon" className="rounded-full h-8 w-8 text-lg">{emoji}</Button>)}
                        {message.text && <Button onClick={() => onCopy(message.text)} variant="ghost" size="icon" className="rounded-full h-8 w-8"><Copy className="h-4 w-4" /></Button>}
                        {isSender && <Button onClick={() => onSetupDelete(message)} variant="ghost" size="icon" className="rounded-full h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                    </div>
                </PopoverContent>
            </Popover>
            {isLastRead && <div className="text-right text-xs text-muted-foreground pr-2 pt-1">Vu</div>}
        </div>
    );
});
MessageItem.displayName = 'MessageItem';


// --- Main Chat Page Component ---
export default function ChatClientPage({ otherUserId }: { otherUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentUser, loadingAuth] = useAuthState(auth);
  const [otherUser, setOtherUser] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<DocumentData | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [showReactionPopoverFor, setShowReactionPopoverFor] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (otherUserId) {
      getUserProfile(otherUserId).then(setOtherUser);
    }
  }, [otherUserId]);

  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const result = await Camera.checkPermissions();
    let status: PermissionState = result.camera;

    if (status === 'granted') {
      return true;
    }

    if (status === 'denied') {
      toast({
        title: 'Permission requise',
        description: "Veuillez autoriser l'accès à la caméra dans les réglages du téléphone.",
      });
      return false;
    }

    if (status === 'prompt' || status === 'prompt-with-rationale') {
      const newResult = await Camera.requestPermissions({
        permissions: ['camera'],
      });
      return newResult.camera === 'granted';
    }

    return false;
  }, [toast]);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    try {
      const checkResult = await AndroidPermissions.checkPermission(AndroidPermissions.PERMISSION.RECORD_AUDIO);
      if (checkResult.hasPermission) {
        return true;
      }
      const requestResult = await AndroidPermissions.requestPermission(AndroidPermissions.PERMISSION.RECORD_AUDIO);
      if (requestResult.hasPermission) {
        return true;
      }
      toast({
        title: 'Permission requise',
        description: "L'accès au microphone a été refusé.",
        variant: 'destructive'
      });
      return false;
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      toast({
        title: 'Erreur de permission',
        description: "Impossible de demander l'accès au microphone.",
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);
  
  const requestStoragePermission = useCallback(async (): Promise<boolean> => {
      try {
        const permissionToRequest = AndroidPermissions.PERMISSION.READ_MEDIA_IMAGES;
        const checkResult = await AndroidPermissions.checkPermission(permissionToRequest);
        if (checkResult.hasPermission) {
          return true;
        }
  
        const requestResult = await AndroidPermissions.requestPermission(permissionToRequest);
  
        if (requestResult.hasPermission) {
          return true;
        } else {
          const oldPermCheck = await AndroidPermissions.checkPermission(AndroidPermissions.PERMISSION.READ_EXTERNAL_STORAGE);
          if(oldPermCheck.hasPermission) return true;

          const oldPermRequest = await AndroidPermissions.requestPermission(AndroidPermissions.PERMISSION.READ_EXTERNAL_STORAGE);
          if(oldPermRequest.hasPermission) return true;
        }
  
        toast({
          title: 'Permission requise',
          description: "L'accès aux photos a été refusé.",
          variant: 'destructive'
        });
        return false;
      } catch (error) {
        console.error('Error requesting storage permission:', error);
        toast({
            title: 'Erreur de permission',
            description: "Impossible de demander l'accès aux photos.",
            variant: 'destructive'
        });
        return false;
      }
  }, [toast]);

  useEffect(() => {
    if (!currentUser) { setLoadingMessages(false); return; }
    const chatId = getChatId(currentUser.uid, otherUserId);
    const chatDocRef = doc(db, 'chats', chatId);
    const unsubscribeChat = onSnapshot(chatDocRef, (doc) => {
        if (doc.exists()) {
            const chatData = doc.data();
            setChat(chatData);
            if (chatData.lastMessage && chatData.lastMessage.senderId !== currentUser.uid && !chatData.lastMessage.read) {
                updateDoc(chatDocRef, { 'lastMessage.read': true });
            }
        }
    });
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    setLoadingMessages(true);
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
        const msgs: Message[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoadingMessages(false);
    }, (error) => {
        console.error("Error fetching messages: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de récupérer les messages.' });
        setLoadingMessages(false);
    });
    return () => { unsubscribeChat(); unsubscribeMessages(); };
  }, [currentUser, otherUserId, toast]);

  useLayoutEffect(() => {
    const scrollToBottom = () => {
        if(scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }
    if (!loadingMessages && messages.length > 0) {
        scrollToBottom();
    }
  }, [messages, loadingMessages]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>, messageData: Partial<Omit<Message, 'id' | 'senderId' | 'timestamp' | 'reactions'>> = {}) => {
    if(e) e.preventDefault();
    const text = newMessage.trim();
    if ((!text && !messageData.imageUrl && !messageData.audioUrl) || !currentUser || !otherUser) return;

    const chatId = getChatId(currentUser.uid, otherUserId);
    const chatDocRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatDocRef, 'messages');
    
    setNewMessage('');

    try {
        const finalMessageData = {
            text: text,
            senderId: currentUser.uid,
            timestamp: serverTimestamp(),
            imageUrl: messageData.imageUrl || null,
            audioUrl: messageData.audioUrl || null,
            audioDuration: messageData.audioDuration || null,
        };

      const newDocRef = await addDoc(messagesColRef, finalMessageData);
      
      let lastMessageText = '📷 Photo';
      if(finalMessageData.audioUrl) lastMessageText = '🎤 Message vocal';
      else if(text) lastMessageText = text;

      await setDoc(chatDocRef, { participants: [currentUser.uid, otherUserId], lastMessage: { id: newDocRef.id, text: lastMessageText, senderId: currentUser.uid, timestamp: serverTimestamp(), read: false } }, { merge: true });
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le message n\'a pas pu être envoyé.' });
      setNewMessage(text);
    }
  }, [newMessage, currentUser, otherUser, toast]);

  const handleDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !currentUser || !otherUser) return;
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messageRef = doc(db, 'chats', chatId, 'messages', messageToDelete.id);
    const chatRef = doc(db, 'chats', chatId);
    try {
        if (messageToDelete.imageUrl) { await deleteObject(ref(storage, messageToDelete.imageUrl)); }
        if (messageToDelete.audioUrl) { await deleteObject(ref(storage, messageToDelete.audioUrl)); }
        await deleteDoc(messageRef);
        if (chat?.lastMessage?.id === messageToDelete.id) {
            const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'desc'), limit(1));
            const snapshot = await getDocs(messagesQuery);
            const newLastMessage = snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            await updateDoc(chatRef, { lastMessage: newLastMessage });
        }
        toast({ description: "Message supprimé." });
    } catch (error) {
        console.error("Error deleting message: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le message.' });
    } finally {
        setMessageToDelete(null);
    }
  }, [messageToDelete, currentUser, otherUser, chat, toast]);

  const handleReact = useCallback(async (message: Message, emoji: string) => {
    if (!currentUser || !otherUser) return;
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messageRef = doc(db, 'chats', chatId, 'messages', message.id);
    const currentReaction = message.reactions?.[currentUser.uid];
    try {
        if (currentReaction === emoji) {
            await updateDoc(messageRef, { [`reactions.${currentUser.uid}`]: deleteField() });
        } else {
            await updateDoc(messageRef, { [`reactions.${currentUser.uid}`]: emoji });
        }
    } catch (error) {
        console.error("Error reacting to message: ", error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter une réaction.' });
    }
    setShowReactionPopoverFor(null);
  }, [currentUser, otherUser, toast]);
  
  const handleCopy = useCallback(async (text: string) => {
    try {
        await navigator.clipboard.writeText(text);
        toast({ description: "Message copié !" });
    } catch (error) {
        console.error('Failed to copy text: ', error);
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier le message.' });
    }
    setShowReactionPopoverFor(null);
  }, [toast]);

const takePicture = useCallback(async (source: CameraSource) => {
    let hasPermission = false;
    if (source === CameraSource.Camera) {
      hasPermission = await requestCameraPermission();
    } else {
      hasPermission = await requestStoragePermission();
    }
    if (!hasPermission || !currentUser || !otherUser) return;

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source,
      });

      if (!image.dataUrl) {
        console.error("No data URL returned from camera.");
        return;
      }
      setIsUploading(true);
      
      const fileName = `${new Date().getTime()}.jpeg`;
      const chatId = getChatId(currentUser.uid, otherUserId);
      const storageRef = ref(storage, `chat_images/${chatId}/${fileName}`);

      // Upload the data URL string
      const uploadTask = await uploadString(storageRef, image.dataUrl, 'data_url');
      const downloadUrl = await getDownloadURL(uploadTask.ref);

      // Send message with the final URL
      await handleSendMessage(undefined, { imageUrl: downloadUrl, text: '' });

    } catch (error) {
      console.error("Photo capture or processing failed:", error);
      toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible d\'envoyer l\'image.' });
    } finally {
      setIsUploading(false);
    }
  }, [currentUser, otherUser, handleSendMessage, toast, requestCameraPermission, requestStoragePermission]);

  const handleSendVoiceMessage = useCallback(async (blob: Blob, duration: number) => {
    if (!currentUser || !otherUser) return;
    setIsUploading(true);
    try {
        const chatId = getChatId(currentUser.uid, otherUserId);
        const fileName = `${new Date().getTime()}.webm`;
        const storageRef = ref(storage, `chat_audio/${chatId}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, blob);
        
        await new Promise((resolve, reject) => {
            uploadTask.on('state_changed', 
                () => {}, // progress
                (error) => {
                    console.error("Voice message upload failed:", error);
                    toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible d\'envoyer le message vocal.' });
                    setIsUploading(false);
                    reject(error);
                },
                async () => {
                    const url = await getDownloadURL(uploadTask.snapshot.ref);
                    await handleSendMessage(undefined, { audioUrl: url, audioDuration: duration });
                    setIsUploading(false);
                    resolve(url);
                }
            );
        });

    } catch (error) {
        console.error("Failed to send voice message", error);
        if (!isUploading) { // Avoid duplicate toasts if error handled in listener
             toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'envoyer le message vocal.' });
        }
    } finally {
        setIsRecording(false);
    }
  }, [currentUser, otherUser, handleSendMessage, toast, isUploading]);


  const handleStartCall = useCallback(async (isVideo: boolean) => {
    if (!currentUser) return;
    const audioOk = await requestMicrophonePermission();
    if (!audioOk) return;

    if (isVideo) {
        const videoOk = await requestCameraPermission();
        if (!videoOk) return;
    }

    const result = await initiateCall(currentUser.uid, otherUserId, isVideo);

    if (result.success) {
        router.push(`/call/${result.channelId}`);
    } else {
        toast({
            title: "Erreur lors du lancement de l'appel",
            description: result.error ?? "Une erreur inconnue est survenue.",
            variant: "destructive"
        });
    }
  }, [requestMicrophonePermission, requestCameraPermission, currentUser, otherUserId, router, toast]);

  const handleStartRecording = useCallback(async () => {
    const hasPermission = await requestMicrophonePermission(); 
    if (hasPermission) {
        setIsRecording(true);
    }
  }, [requestMicrophonePermission]);

  const handleLongPressStart = useCallback((messageId: string) => { longPressTimer.current = setTimeout(() => { setShowReactionPopoverFor(messageId); }, 500); }, []);
  const handleLongPressEnd = useCallback(() => { if(longPressTimer.current) clearTimeout(longPressTimer.current); }, []);
  const handleSetupDelete = useCallback((message: Message) => { setShowReactionPopoverFor(null); setMessageToDelete(message); }, []);
  const handleZoomImage = useCallback((imageUrl: string) => setZoomedImageUrl(imageUrl), []);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey && !isDesktop) { e.preventDefault(); handleSendMessage(e); } };
  useEffect(() => { if(textareaRef.current){ textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`; } }, [newMessage]);
  const handleEmojiClick = (emoji: EmojiClickData) => { setNewMessage(p => p + emoji.emoji); if (!isDesktop) setIsEmojiPickerOpen(false); };

  const otherUserName = otherUser?.firstName || 'Utilisateur';
  const otherUserImage = otherUser?.profilePictures?.[0] || `https://picsum.photos/seed/${otherUserId}/200`;

  if (loadingAuth || !otherUser) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-screen flex-col bg-background w-full overflow-x-hidden">
      <header className="fixed top-0 z-10 flex w-full items-center gap-2 border-b bg-background/95 px-2 py-1 backdrop-blur-sm h-12">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        <Link href={`/profile?id=${otherUserId}`} className="flex min-w-0 flex-1 items-center gap-2 truncate"><Avatar className="h-8 w-8"><AvatarImage src={otherUserImage} alt={otherUserName} /><AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback></Avatar><div className="flex-1 truncate"><h1 className="truncate text-sm font-semibold">{otherUserName}</h1></div></Link>
        <Button onClick={() => handleStartCall(true)} variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
        <Drawer><DrawerTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DrawerTrigger><DrawerContent><div className="mx-auto w-full max-w-sm"><DrawerHeader><DrawerTitle>Options</DrawerTitle><DrawerDescription>Gérez votre interaction avec {otherUserName}.</DrawerDescription></DrawerHeader><div className="p-4 pt-0"><div className="mt-3 h-full"><DrawerClose asChild><Button variant="outline" className="w-full justify-start p-4 h-auto text-base"><Ban className="mr-2 h-5 w-5" /> Bloquer</Button></DrawerClose><div className="my-2 border-t"></div><DrawerClose asChild><Button variant="outline" className="w-full justify-start p-4 h-auto text-base" onClick={() => setIsReportModalOpen(true)}><ShieldAlert className="mr-2 h-5 w-5" /> Signaler</Button></DrawerClose></div></div><div className="p-4"><DrawerClose asChild><Button variant="secondary" className="w-full h-12 text-base">Annuler</Button></DrawerClose></div></div></DrawerContent></Drawer>
      </header>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-14 pb-20">
        {loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        : messages.length === 0 ? <div className="p-4 text-center text-muted-foreground">Commencez la conversation !</div>
        : <div className="p-4 space-y-4">
            {messages.map((message) => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isSender={message.senderId === currentUser?.uid}
                    isLastRead={message.id === chat?.lastMessage?.id && message.senderId === currentUser?.uid && !!chat.lastMessage.read}
                    otherUserImage={otherUserImage}
                    otherUserName={otherUserName}
                    onLongPressStart={handleLongPressStart}
                    onLongPressEnd={handleLongPressEnd}
                    onReact={handleReact}
                    onSetupDelete={handleSetupDelete}
                    onCopy={handleCopy}
                    onZoomImage={handleZoomImage}
                    showReactionPopoverFor={showReactionPopoverFor}
                    setShowReactionPopoverFor={setShowReactionPopoverFor}
                />
            ))}
            {isUploading && <div className="flex justify-end pt-2"><div className="p-2 rounded-2xl bg-primary/50"><Loader2 className="h-6 w-6 animate-spin" /></div></div>}
        </div>}
      </main>
      
      <footer className="fixed bottom-0 z-10 w-full border-t bg-background/95 backdrop-blur-sm px-2 py-1.5">
        {isRecording ? (
            <VoiceRecorder onSend={handleSendVoiceMessage} onCancel={() => setIsRecording(false)} isSending={isUploading} />
        ) : (
            <form onSubmit={(e) => handleSendMessage(e)} className="flex items-end gap-1.5 w-full">
            <Drawer>
                <DrawerTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" disabled={isUploading}><PlusCircle className="h-5 w-5 text-muted-foreground" /></Button>
                </DrawerTrigger>
                <DrawerContent>
                    <div className="mx-auto w-full max-w-sm">
                        <DrawerHeader>
                            <DrawerTitle>Joindre un fichier</DrawerTitle>
                            <DrawerDescription>Que souhaitez-vous partager ?</DrawerDescription>
                        </DrawerHeader>
                        <div className="p-4 pt-0 grid grid-cols-2 gap-4">
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full justify-center p-4 h-auto text-base flex-col gap-2" onClick={() => takePicture(CameraSource.Photos)}><ImageIcon className="h-6 w-6" /> Bibliothèque</Button>
                            </DrawerClose>
                            <DrawerClose asChild>
                                <Button variant="outline" className="w-full justify-center p-4 h-auto text-base flex-col gap-2" onClick={() => takePicture(CameraSource.Camera)}><CameraIcon className="h-6 w-6" /> Appareil photo</Button>
                            </DrawerClose>
                        </div>
                        <div className="p-4">
                            <DrawerClose asChild><Button variant="secondary" className="w-full h-12 text-base">Annuler</Button></DrawerClose>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>
                <div className="flex-1 relative flex items-center min-w-0 bg-secondary rounded-xl">
                    <Textarea
                        ref={textareaRef}
                        rows={1}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message..."
                        className="w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent py-2.5 px-3 pr-8 min-h-[20px] max-h-32 overflow-y-auto text-sm"
                    />
                    <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"><Smile className="h-4 w-4 text-muted-foreground" /></Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="end" className="w-full max-w-[320px] p-0 border-none mb-2"><Picker onEmojiClick={handleEmojiClick} emojiStyle={EmojiStyle.NATIVE} width="100%" /></PopoverContent>
                    </Popover>
                </div>
                <div className="shrink-0">
                {!newMessage.trim() ? (
                <Button type="button" onClick={handleStartRecording} variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-primary"><Mic className="h-4 w-4" /></Button>
                ) : (
                <Button type="submit" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-primary" disabled={isUploading}><Send className="h-4 w-4" /></Button>
                )}
                </div>
            </form>
        )}
      </footer>

      <Dialog open={!!messageToDelete} onOpenChange={(isOpen) => !isOpen && setMessageToDelete(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Supprimer le message</DialogTitle><DialogDescription>Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="secondary" onClick={() => setMessageToDelete(null)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteMessage}>Supprimer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!zoomedImageUrl} onOpenChange={(isOpen) => !isOpen && setZoomedImageUrl(null)}>
        {zoomedImageUrl && <PhotoViewer imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />}
      </Dialog>
      <ReportAbuseDialog isOpen={isReportModalOpen} onOpenChange={setIsReportModalOpen} reportedUser={otherUser} />
    </div>
  );
}

    