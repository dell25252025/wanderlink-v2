
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowLeft, MoreVertical, Trash2, CheckCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


// Données factices pour la liste des conversations
const initialConversations = [
  {
    id: 'user123',
    name: 'Sophia',
    avatarUrl: 'https://picsum.photos/seed/user1/200',
    lastMessage: 'Salut ! Ton profil est super intéressant.',
    timestamp: '10:42',
    unreadCount: 2,
    isVerified: true,
  },
  {
    id: 'user456',
    name: 'James',
    avatarUrl: 'https://picsum.photos/seed/user2/200',
    lastMessage: 'Merci beaucoup ! Le tien aussi. Prêt pour l\'aventure ?',
    timestamp: 'Hier',
    unreadCount: 0,
    isVerified: false,
  },
  {
    id: 'user789',
    name: 'Isabella',
    avatarUrl: 'https://picsum.photos/seed/user3/200',
    lastMessage: 'J\'ai vu qu\'on aimait tous les deux l\'Italie !',
    timestamp: 'Hier',
    unreadCount: 1,
    isVerified: true,
  },
];


export default function InboxPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState(initialConversations);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const { toast } = useToast();

  const filteredConversations = conversations.filter(convo =>
    convo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteConversation = () => {
    if (conversationToDelete) {
      setConversations(conversations.filter(c => c.id !== conversationToDelete));
      toast({ title: 'Conversation supprimée' });
      setConversationToDelete(null);
    }
  };
  
  const handleDeleteAllConversations = () => {
    setConversations([]);
    toast({ title: 'Toutes les conversations ont été supprimées' });
    setIsDeletingAll(false);
  };


  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
        <div className="flex items-center">
            <Button onClick={() => router.push('/')} variant="ghost" size="icon" className="h-8 w-8 -ml-2">
                <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-sm font-semibold ml-2">Messages</h1>
        </div>
        
        <AlertDialog open={isDeletingAll} onOpenChange={setIsDeletingAll}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Tout supprimer
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer toutes les conversations ?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Cette action est irréversible et supprimera définitivement toutes vos conversations.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAllConversations} className="bg-destructive hover:bg-destructive/90">
                      Supprimer
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </header>

      <main className="flex-1 overflow-y-auto pt-12 pb-4">
        <div className="container mx-auto max-w-2xl px-2">
            <div className="relative p-2 pt-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                placeholder="Rechercher une conversation..."
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="mt-2">
                {filteredConversations.length > 0 ? (
                    <ul className="divide-y">
                    {filteredConversations.map((convo) => (
                        <li key={convo.id} className="flex items-center gap-1 p-1.5 transition-colors hover:bg-muted/50">
                            <Link href={`/chat?id=${convo.id}`} className="flex flex-1 items-center gap-2 min-w-0">
                                <Avatar className="h-9 w-9">
                                <AvatarImage src={convo.avatarUrl} alt={convo.name} />
                                <AvatarFallback>{convo.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 truncate">
                                <div className="flex items-baseline justify-between">
                                    <p className="font-semibold truncate text-xs flex items-center gap-1">
                                      {convo.name}
                                      {convo.isVerified && <CheckCircle className="h-3 w-3 text-blue-500" />}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{convo.timestamp}</p>
                                </div>
                                <div className="flex items-center justify-between">
                                    <p className="truncate text-[11px] text-muted-foreground">
                                    {convo.lastMessage}
                                    </p>
                                    {convo.unreadCount > 0 && (
                                    <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] text-primary-foreground">
                                        {convo.unreadCount}
                                    </span>
                                    )}
                                </div>
                                </div>
                            </Link>
                            <AlertDialog>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive" onClick={() => setConversationToDelete(convo.id)}>
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer la conversation ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Cette action est irréversible et supprimera définitivement cette conversation.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel onClick={() => setConversationToDelete(null)}>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={handleDeleteConversation} className="bg-destructive hover:bg-destructive/90">
                                          Supprimer
                                      </AlertDialogAction>
                                  </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="p-4 text-center text-sm text-muted-foreground">Aucune conversation trouvée.</p>
                )}
            </div>
        </div>
      </main>
    </div>
  );
}
