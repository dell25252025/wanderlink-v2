'use client';

import { useState, useEffect, useRef, memo, useCallback, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Ban, ShieldAlert, Smile, X, Phone, Video, Loader2, CheckCircle, PlusCircle, Trash2, Download } from 'lucide-react';
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
import { Filesystem, Directory } from '@capacitor/filesystem';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

// --- Interfaces ---
interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
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
  onZoomImage: (imageUrl: string) => void;
  showReactionPopoverFor: string | null;
  setShowReactionPopoverFor: (id: string | null) => void;
}

// --- Constants ---
const availableReactions = ['❤️', '😂', '👍', '😢', '😮', '😡'];
const getChatId = (uid1: string, uid2: string) => [uid1, uid2].sort().join('_');

// --- Memoized Message Component ---
const MessageItem = memo<MessageItemProps>(({ 
    message, isSender, isLastRead, otherUserImage, otherUserName, 
    onLongPressStart, onLongPressEnd, onReact, onSetupDelete, onZoomImage,
    showReactionPopoverFor, setShowReactionPopoverFor
}) => {
    const reactions = message.reactions ? Object.entries(message.reactions) : [];

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
                            {message.imageUrl ? <button onClick={() => onZoomImage(message.imageUrl!)}><Image src={message.imageUrl} alt="" width={250} height={300} className="object-cover" /></button> : message.text}
                            {reactions.length > 0 && <div className={`absolute -bottom-3 text-xs rounded-full bg-secondary border px-1.5 py-0.5 ${isSender ? 'right-2' : 'left-2'}`}>{reactions.map(([_, emoji]) => emoji)[0]} {reactions.length > 1 ? `+${reactions.length - 1}`: ''}</div>}
                        </div>
                    </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-1 rounded-full">
                    <div className="flex items-center gap-1">
                        {availableReactions.map(emoji => <Button key={emoji} onClick={() => onReact(message, emoji)} variant="ghost" size="icon" className="rounded-full h-8 w-8 text-lg">{emoji}</Button>)}
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout>();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => { 
    if (otherUserId) { 
        getUserProfile(otherUserId).then(setOtherUser); 
    }
    // Demander la permission pour le système de fichiers au chargement de la page
    const requestFilePermissions = async () => {
        try {
            // Pour iOS et Android, cette méthode vérifie et demande la permission si nécessaire.
            await Filesystem.requestPermissions();
        } catch (e) {
            console.error('Error requesting filesystem permissions', e);
            toast({
                variant: 'destructive',
                title: 'Erreur d\'autorisation',
                description: 'Impossible de demander l\'accès au stockage.',
            });
        }
    };
    requestFilePermissions();
  }, [otherUserId, toast]);

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

  // Utiliser useLayoutEffect pour un défilement plus fiable après le rendu
  useLayoutEffect(() => {
    const scrollToBottom = () => {
        if(scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }
    // Pas de timeout, exécution directe après le chargement des messages
    if (!loadingMessages && messages.length > 0) {
        scrollToBottom();
    }
  }, [messages, loadingMessages]);

  const handleSendMessage = useCallback(async (e?: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>, imageUrl: string | null = null) => {
    if(e) e.preventDefault();
    if ((!newMessage.trim() && !imageUrl) || !currentUser || !otherUser) return;
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
  }, [newMessage, currentUser, otherUser, toast]);

  const handleDeleteMessage = useCallback(async () => {
    if (!messageToDelete || !currentUser || !otherUser) return;
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
  
    const handleDownloadImage = useCallback(async () => {
        if (!zoomedImageUrl) return;

        try {
            // Vérifier/demander la permission
            const permissions = await Filesystem.requestPermissions();
            if (permissions.publicStorage !== 'granted') {
                toast({
                    variant: 'destructive',
                    title: 'Permission refusée',
                    description: "L\'autorisation d'accéder au stockage est nécessaire pour télécharger l\'image.",
                });
                return;
            }
            
            // Lire l'image en base64 depuis l'URL
            const response = await fetch(zoomedImageUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result as string;

                const fileName = `WanderLink_${new Date().getTime()}.jpeg`;

                // Créer le dossier WanderLink s'il n'existe pas
                try {
                    await Filesystem.mkdir({
                        path: 'WanderLink',
                        directory: Directory.Downloads,
                    });
                } catch (e: any) {
                    // Ignorer l'erreur si le dossier existe déjà
                    if (e.message !== 'Current directory does already exist.') {
                         console.error('Unable to create directory', e);
                    }
                }

                // Enregistrer le fichier
                await Filesystem.writeFile({
                    path: `WanderLink/${fileName}`,
                    data: base64data,
                    directory: Directory.Downloads,
                });

                toast({
                    title: 'Image téléchargée',
                    description: `L\'image a été enregistrée dans le dossier WanderLink.`,
                    action: <CheckCircle className="h-5 w-5 text-green-500" />,
                });
            };
            reader.readAsDataURL(blob);

        } catch (e: any) {
            console.error('Error downloading image', e);
            toast({
                variant: 'destructive',
                title: 'Erreur de téléchargement',
                description: e.message || 'Une erreur est survenue lors du téléchargement de l\'image.',
            });
        } finally {
            setZoomedImageUrl(null); // Fermer le dialogue après la tentative
        }
    }, [zoomedImageUrl, toast]);


  const handleLongPressStart = useCallback((messageId: string) => {
    longPressTimer.current = setTimeout(() => { setShowReactionPopoverFor(messageId); }, 500);
  }, []);
  const handleLongPressEnd = useCallback(() => { if(longPressTimer.current) clearTimeout(longPressTimer.current); }, []);
  const handleSetupDelete = useCallback((message: Message) => { setShowReactionPopoverFor(null); setMessageToDelete(message); }, []);
  const handleZoomImage = useCallback((imageUrl: string) => setZoomedImageUrl(imageUrl), []);

  const handlePhotoAttachment = useCallback(async () => {
    if (!currentUser || !otherUser) return;
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
  }, [currentUser, otherUser, handleSendMessage, toast]);

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
        <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
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
                    onZoomImage={handleZoomImage}
                    showReactionPopoverFor={showReactionPopoverFor}
                    setShowReactionPopoverFor={setShowReactionPopoverFor}
                />
            ))}
            {isUploading && <div className="flex justify-end pt-2"><div className="p-2 rounded-2xl bg-primary/50"><Loader2 className="h-6 w-6 animate-spin" /></div></div>}
        </div>}
      </main>
      
      <footer className="fixed bottom-0 z-10 w-full border-t bg-background/95 backdrop-blur-sm px-2 py-1.5">
        <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 w-full">
            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handlePhotoAttachment} disabled={isUploading}><PlusCircle className="h-5 w-5 text-muted-foreground" /></Button>
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
              <Button type="submit" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-primary" disabled={!newMessage.trim()}><Send className="h-4 w-4" /></Button>
            </div>
        </form>
      </footer>

      <Dialog open={!!messageToDelete} onOpenChange={(isOpen) => !isOpen && setMessageToDelete(null)}>
        <DialogContent>
            <DialogHeader><DialogTitle>Supprimer le message</DialogTitle><DialogDescription>Êtes-vous sûr de vouloir supprimer ce message ? Cette action est irréversible.</DialogDescription></DialogHeader>
            <DialogFooter><Button variant="secondary" onClick={() => setMessageToDelete(null)}>Annuler</Button><Button variant="destructive" onClick={handleDeleteMessage}>Supprimer</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {zoomedImageUrl && (
        <Dialog open={!!zoomedImageUrl} onOpenChange={(isOpen) => !isOpen && setZoomedImageUrl(null)}>
          <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-black/80 backdrop-blur-sm border-0 flex flex-col items-center justify-center">
                <DialogHeader>
                    <DialogTitle>
                        <VisuallyHidden>Image en plein écran</VisuallyHidden>
                    </DialogTitle>
                </DialogHeader>
                <DialogClose asChild className="absolute top-2 right-2 z-50"><Button variant="ghost" size="icon" className="h-9 w-9 text-white bg-black/30 hover:bg-black/50 hover:text-white"><X className="h-5 w-5" /></Button></DialogClose>
                <div className="relative w-full h-full flex items-center justify-center p-4">
                    <Image src={zoomedImageUrl} alt="Image zoomée" fill className="object-contain" />
                </div>
                <DialogFooter className="absolute bottom-4 left-1/2 -translate-x-1/2">
                    <Button variant="secondary" onClick={handleDownloadImage}><Download className="mr-2 h-4 w-4" />Télécharger</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
      <ReportAbuseDialog isOpen={isReportModalOpen} onOpenChange={setIsReportModalOpen} reportedUser={otherUser} />
    </div>
  );
}
