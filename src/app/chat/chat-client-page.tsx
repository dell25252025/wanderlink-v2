'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Ban, ShieldAlert, Smile, X, Phone, Video, Loader2, CheckCircle, PlusCircle, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/lib/firebase-actions';
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
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
  audioUrl?: string | null;
  reactions?: { [userId: string]: string };
}

const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};

const availableReactions = ['❤️', '😂', '👍', '😢', '😮', '😡'];

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => { if (otherUserId) { getUserProfile(otherUserId).then(setOtherUser); } }, [otherUserId]);

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
        toast({ variant: 'destructive', title: 'Erreur de chargement', description: 'Impossible de récupérer les messages.' });
        setLoadingMessages(false);
    });
    return () => { unsubscribeChat(); unsubscribeMessages(); };
  }, [currentUser, otherUserId, toast]);

  useEffect(() => {
    const scrollToBottom = () => {
        if(scrollContainerRef.current) { scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight; }
    }
    if (!loadingMessages) {
        const timer = setTimeout(scrollToBottom, 100);
        return () => clearTimeout(timer);
    }
  }, [messages, loadingMessages]);

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>, imageUrl: string | null = null) => {
    if(e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl || !currentUser || !otherUser) return;
    const chatId = getChatId(currentUser.uid, otherUserId);
    const chatDocRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatDocRef, 'messages');
    const messageText = newMessage;
    setNewMessage('');
    try {
      const newDocRef = await addDoc(messagesColRef, { text: messageText, senderId: currentUser.uid, timestamp: serverTimestamp(), imageUrl: imageUrl });
      await setDoc(chatDocRef, { participants: [currentUser.uid, otherUserId], lastMessage: { id: newDocRef.id, text: imageUrl ? '📷 Photo' : messageText, senderId: currentUser.uid, timestamp: serverTimestamp(), read: false } }, { merge: true });
    } catch (error) {
      console.error("Erreur lors de l\'envoi du message:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le message n\'a pas pu être envoyé.' });
      setNewMessage(messageText);
    }
  };

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !currentUser) return;
    const chatId = getChatId(currentUser.uid, otherUserId);
    const messageRef = doc(db, 'chats', chatId, 'messages', messageToDelete.id);
    const chatRef = doc(db, 'chats', chatId);
    try {
        if (messageToDelete.imageUrl) { await deleteObject(ref(storage, messageToDelete.imageUrl)); }
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
  };

  const handleReact = async (message: Message, emoji: string) => {
    if (!currentUser) return;
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
  };

  const handleLongPressStart = (messageId: string) => {
    longPressTimer.current = setTimeout(() => { setShowReactionPopoverFor(messageId); }, 500);
  };
  const handleLongPressEnd = () => { if(longPressTimer.current) clearTimeout(longPressTimer.current); };

  const setupDelete = (message: Message) => {
    setShowReactionPopoverFor(null);
    setMessageToDelete(message);
  }

  const handlePhotoAttachment = async () => {
    if (!currentUser) return;
    try {
      const image = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Uri, source: CameraSource.Photos });
      if (!image.webPath) return;
      setIsUploading(true);
      const response = await fetch(image.webPath);
      const blob = await response.blob();
      const fileName = `${new Date().getTime()}.${image.webPath.split('.').pop() || 'jpg'}`;
      const chatId = getChatId(currentUser.uid, otherUserId);
      const storageRef = ref(storage, `chat_images/${chatId}/${fileName}`);
      const uploadTask = uploadBytesResumable(storageRef, blob);
      uploadTask.on('state_changed', () => {}, 
        (error) => {
            console.error("Upload failed:", error);
            toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible d\'envoyer l\'image.' });
            setIsUploading(false);
        },
        () => { getDownloadURL(uploadTask.snapshot.ref).then((url) => { handleSendMessage(undefined, url); setIsUploading(false); }); }
      );
    } catch (error) { console.info("Photo selection cancelled."); setIsUploading(false); }
  };

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
        {/* Call/Video/More buttons... */}
      </header>

      <main ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-14 pb-20">
        {loadingMessages ? <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
        : messages.length === 0 ? <div className="p-4 text-center text-muted-foreground">Commencez la conversation !</div>
        : <div className="p-4 space-y-4">
            {messages.map((message) => {
              const isSender = message.senderId === currentUser?.uid;
              const reactions = message.reactions ? Object.entries(message.reactions) : [];
              return (
                <div key={message.id} onContextMenu={(e) => e.preventDefault()}>
                  <Popover open={showReactionPopoverFor === message.id} onOpenChange={(isOpen) => !isOpen && setShowReactionPopoverFor(null)}>
                    <PopoverTrigger asChild>
                        <div onTouchStart={() => handleLongPressStart(message.id)} onTouchEnd={handleLongPressEnd} onMouseDown={() => handleLongPressStart(message.id)} onMouseUp={handleLongPressEnd} onMouseLeave={handleLongPressEnd} className={`flex items-end gap-2 relative ${isSender ? 'justify-end' : 'justify-start'}`}>
                          {!isSender && <Avatar className="h-6 w-6 self-end"><AvatarImage src={otherUserImage} /><AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback></Avatar>}
                          <div className={`max-w-[75%] rounded-2xl break-words relative ${isSender ? 'active:scale-95 transition-transform duration-150' : ''} ${message.imageUrl ? 'p-0 overflow-hidden' : 'px-3 py-2 ' + (isSender ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-secondary')}`}>
                            {message.imageUrl ? <button onClick={() => setZoomedImageUrl(message.imageUrl)}><Image src={message.imageUrl} alt="" width={250} height={300} className="object-cover" /></button> : message.text}
                            {reactions.length > 0 && <div className={`absolute -bottom-3 text-xs rounded-full bg-secondary border px-1.5 py-0.5 ${isSender ? 'right-2' : 'left-2'}`}>{reactions.map(([_, emoji]) => emoji)[0]} {reactions.length > 1 ? `+${reactions.length - 1}`: ''}</div>}
                          </div>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-1 rounded-full">
                      <div className="flex items-center gap-1">
                        {availableReactions.map(emoji => <Button key={emoji} onClick={() => handleReact(message, emoji)} variant="ghost" size="icon" className="rounded-full h-8 w-8 text-lg">{emoji}</Button>)}
                        {isSender && <Button onClick={() => setupDelete(message)} variant="ghost" size="icon" className="rounded-full h-8 w-8"><Trash2 className="h-4 w-4" /></Button>}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {message.id === chat?.lastMessage?.id && isSender && chat.lastMessage.read && <div className="text-right text-xs text-muted-foreground pr-2 pt-1">Vu</div>}
                </div>
            )})
            }
            {isUploading && <div className="flex justify-end pt-2"><div className="p-2 rounded-2xl bg-primary/50"><Loader2 className="h-6 w-6 animate-spin" /></div></div>}
        </div>}
      </main>
      
      <footer className="fixed bottom-0 z-10 w-full border-t bg-background/95 backdrop-blur-sm px-2 py-1.5">
        {/* Footer form... */}
      </footer>

      <Dialog open={!!messageToDelete} onOpenChange={(isOpen) => !isOpen && setMessageToDelete(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Supprimer le message</DialogTitle><DialogDescription>Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="secondary" onClick={() => setMessageToDelete(null)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteMessage}>Supprimer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {zoomedImageUrl && <Dialog open={!!zoomedImageUrl} onOpenChange={(isOpen) => !isOpen && setZoomedImageUrl(null)}>{/* Zoomed image dialog... */}</Dialog>}
      <ReportAbuseDialog isOpen={isReportModalOpen} onOpenChange={setIsReportModalOpen} reportedUser={otherUser} />
    </div>
  );
}
