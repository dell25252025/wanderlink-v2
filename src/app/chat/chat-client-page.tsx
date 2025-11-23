'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, MoreVertical, Ban, ShieldAlert, Smile, X, Phone, Video, Loader2, CheckCircle, PlusCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserProfile } from '@/lib/firebase-actions';
import { auth, db, storage } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Drawer, DrawerContent, DrawerTrigger, DrawerClose, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Picker, { type EmojiClickData, EmojiStyle } from 'emoji-picker-react';
import { Textarea } from '@/components/ui/textarea';
import { ReportAbuseDialog } from '@/components/report-abuse-dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import type { DocumentData, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: Timestamp;
  imageUrl?: string | null;
  audioUrl?: string | null;
}

const getChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join('_');
};


export default function ChatClientPage({ otherUserId }: { otherUserId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentUser, loadingAuth] = useAuthState(auth);
  const [otherUser, setOtherUser] = useState<DocumentData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isDesktop = useMediaQuery('(min-width: 768px)');

  useEffect(() => {
    if (otherUserId) {
      getUserProfile(otherUserId).then(setOtherUser);
    }
  }, [otherUserId]);

  useEffect(() => {
    if (!currentUser) {
      setLoadingMessages(false);
      return;
    }

    const chatId = getChatId(currentUser.uid, otherUserId);
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    setLoadingMessages(true);
    const unsubscribe = onSnapshot(q,
      (querySnapshot) => {
        const msgs: Message[] = [];
        querySnapshot.forEach((doc) => {
          msgs.push({ id: doc.id, ...doc.data() } as Message);
        });
        setMessages(msgs);
        setLoadingMessages(false);
      },
      (error) => {
        console.error("Error fetching messages: ", error);
        toast({
          variant: 'destructive',
          title: 'Erreur de chargement',
          description: 'Impossible de récupérer les messages. Un index Firestore est peut-être nécessaire.',
        });
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, otherUserId, toast]);

  // --- FIX 2: Défilement automatique robuste et instantané --- //
  useEffect(() => {
    // Ne rien faire si les messages sont en cours de chargement
    if (loadingMessages) return;

    // Attendre un cycle de rendu pour s'assurer que le DOM est à jour
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, 50); // Un petit délai pour plus de fiabilité

    return () => clearTimeout(timer);
  }, [messages, loadingMessages]);

  const handleSendMessage = async (e?: React.FormEvent | React.KeyboardEvent<HTMLTextAreaElement>, imageUrl: string | null = null) => {
    if(e) e.preventDefault();
    if (!newMessage.trim() && !imageUrl) return;
    if (!currentUser || !otherUser) return;

    const chatId = getChatId(currentUser.uid, otherUserId);
    const chatDocRef = doc(db, 'chats', chatId);
    const messagesColRef = collection(chatDocRef, 'messages');

    const messageText = newMessage;
    setNewMessage('');

    try {
      await addDoc(messagesColRef, {
        text: messageText,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
        imageUrl: imageUrl,
        audioUrl: null,
      });

      await setDoc(chatDocRef, {
        participants: [currentUser.uid, otherUserId],
        lastMessage: {
          text: imageUrl ? '📷 Photo' : messageText,
          senderId: currentUser.uid,
          timestamp: serverTimestamp(),
          read: false
        },
      }, { merge: true });

    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Le message n\'a pas pu être envoyé.' });
      setNewMessage(messageText);
    }
  };
  
  const handlePhotoAttachment = async () => {
    if (!currentUser) return;
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      if (image && image.webPath) {
        setIsUploading(true);
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        
        const fileExtension = image.webPath.split('.').pop() || 'jpg';
        const fileName = `${new Date().getTime()}.${fileExtension}`;
        const chatId = getChatId(currentUser.uid, otherUserId);
        const storageRef = ref(storage, `chat_images/${chatId}/${fileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, blob);

        uploadTask.on('state_changed',
          (snapshot) => {},
          (error) => {
            console.error("Upload failed:", error);
            toast({ variant: 'destructive', title: 'Erreur d\'upload', description: 'Impossible d\'envoyer l\'image.' });
            setIsUploading(false);
          },
          () => {
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              handleSendMessage(undefined, downloadURL);
              setIsUploading(false);
            });
          }
        );
      }
    } catch (error) {
        console.info("Photo selection cancelled by user.");
        setIsUploading(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isDesktop) {
        event.preventDefault();
        handleSendMessage(event);
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
  
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prevMessage => prevMessage + emojiData.emoji);
    if (!isDesktop) {
        setIsEmojiPickerOpen(false);
    }
  };

  const otherUserName = otherUser?.firstName || 'Utilisateur';
  const otherUserImage = otherUser?.profilePictures?.[0] || `https://picsum.photos/seed/${otherUserId}/200`;
  const otherUserIsVerified = otherUser?.isVerified ?? false;

  const showSendButton = newMessage.trim().length > 0;
  
  if (loadingAuth || !otherUser) {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
          </div>
        )
  }

  // --- FIX 1: Ajout de styles pour empêcher le débordement horizontal --- //
  return (
    <div className="flex h-screen flex-col bg-background w-full overflow-x-hidden">
      <header className="fixed top-0 z-10 flex w-full items-center gap-2 border-b bg-background/95 px-2 py-1 backdrop-blur-sm h-12">
        <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-8 w-8">
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {}}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {}}>
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
                    <DrawerDescription>Gérez votre interaction avec {otherUserName}.</DrawerDescription>
                </DrawerHeader>
                <div className="p-4 pt-0">
                    <div className="mt-3 h-full">
                        <DrawerClose asChild>
                              <Button variant="outline" className="w-full justify-start p-4 h-auto text-base">
                                  <Ban className="mr-2 h-5 w-5" /> Bloquer
                              </Button>
                        </DrawerClose>
                        <div className="my-2 border-t"></div>
                        <DrawerClose asChild>
                              <Button variant="outline" className="w-full justify-start p-4 h-auto text-base" onClick={() => setIsReportModalOpen(true)}>
                                  <ShieldAlert className="mr-2 h-5 w-5" /> Signaler
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
        {loadingMessages ? (
            <div className="flex h-full w-full flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <p className="text-muted-foreground">Commencez la conversation !</p>
                <p className="text-xs text-muted-foreground">Le premier message que vous enverrez créera le chat.</p>
            </div>
        ) : (
            <div className="space-y-4 p-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-end gap-2 ${
                    message.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.senderId !== currentUser?.uid && (
                    <Avatar className="h-6 w-6">
                       <AvatarImage src={otherUserImage} alt={otherUserName} />
                       <AvatarFallback>{otherUserName.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl text-sm md:text-base ${message.imageUrl ? 'p-0 overflow-hidden' : 'px-3 py-2 ' + (message.senderId === currentUser?.uid ? 'rounded-br-none bg-primary text-primary-foreground' : 'rounded-bl-none bg-secondary text-secondary-foreground')}`}>
                    {message.imageUrl ? (
                       <button onClick={() => setZoomedImageUrl(message.imageUrl)} className="block">
                         <Image src={message.imageUrl} alt="Image envoyée" width={250} height={300} className="object-cover" />
                       </button>
                    ) : (
                        message.text
                    )}
                  </div>
                </div>
              ))}
               {isUploading && (
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-2xl p-2 bg-primary/50">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
                  </div>
                </div>
              )}
               <div ref={messagesEndRef} />
            </div>
        )}
      </main>

       <footer className="fixed bottom-0 z-10 w-full border-t bg-background/95 backdrop-blur-sm px-2 py-1.5">
        <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 w-full">
            <Button type="button" variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handlePhotoAttachment} disabled={isUploading}>
                <PlusCircle className="h-5 w-5 text-muted-foreground" />
            </Button>
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
                      <Button type="button" variant="ghost" size="icon" className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6">
                          <Smile className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent side="top" align="end" className="w-full max-w-[320px] p-0 border-none mb-2">
                    <Picker onEmojiClick={handleEmojiClick} emojiStyle={EmojiStyle.NATIVE} width="100%" />
                  </PopoverContent>
                </Popover>
            </div>
          
            <div className="shrink-0">
              <Button type="submit" variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-primary" disabled={!showSendButton}>
                  <Send className="h-4 w-4" />
              </Button>
            </div>
        </form>
      </footer>
      
      {zoomedImageUrl && (
        <Dialog open={!!zoomedImageUrl} onOpenChange={(isOpen) => !isOpen && setZoomedImageUrl(null)}>
            <DialogContent className="p-0 m-0 w-full h-full max-w-full max-h-screen bg-black/80 backdrop-blur-sm border-0 flex flex-col items-center justify-center">
                <DialogClose asChild className="absolute top-2 right-2 z-50">
                     <Button variant="ghost" size="icon" className="h-9 w-9 text-white bg-black/30 hover:bg-black/50 hover:text-white">
                        <X className="h-5 w-5" />
                    </Button>
                </DialogClose>
                <div className="relative w-full h-full flex items-center justify-center p-4">
                     <Image
                        src={zoomedImageUrl}
                        alt="Image zoomée"
                        fill
                        className="object-contain"
                    />
                </div>
            </DialogContent>
        </Dialog>
     )}
      
      <ReportAbuseDialog 
        isOpen={isReportModalOpen} 
        onOpenChange={setIsReportModalOpen} 
        reportedUser={otherUser}
      />
    </div>
  );
}
