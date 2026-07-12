
'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronRight,
  User,
  Shield,
  Bell,
  Ban,
  HelpCircle,
  Share2,
  FileText,
  Heart,
  MessageSquare,
  Moon,
  Languages,
  Crown,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const SettingsPage = () => {
  const router = useRouter();
  const { toast } = useToast();

  const handleShare = async () => {
    const shareData = {
      title: 'WanderLink',
      text: "Découvre WanderLink, l'application pour trouver ton prochain partenaire de voyage !",
      url: window.location.origin,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        throw new Error('Web Share API not supported');
      }
    } catch (err) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        toast({
          title: 'Lien copié !',
          description: 'Le lien a été copié dans votre presse-papiers.',
        });
      } catch (copyErr) {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de partager ou de copier le lien.',
        });
      }
    }
  };
  
  const handleLike = () => {
    toast({
      title: 'Merci pour votre soutien !',
      description: "Nous sommes ravis que l'application vous plaise.",
    });
  };

  const settingsItems = [
    {
      icon: User,
      label: 'Paramètres du compte',
      href: '/settings/account',
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
    },
    {
      icon: Languages,
      label: 'Langue',
      href: '/settings/language',
      color: 'text-purple-500',
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
    },
    {
      icon: Shield,
      label: 'Paramètres de confidentialité',
      href: '/settings/privacy',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
    },
    {
      icon: Bell,
      label: 'Notifications',
      href: '/settings/notifications',
      color: 'text-pink-500',
      bgColor: 'bg-pink-100 dark:bg-pink-900/50',
    },
     {
      icon: Ban,
      label: 'Utilisateurs bloqués',
      href: '/settings/blocked-users',
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-200 dark:bg-gray-800',
    },
    {
      icon: HelpCircle,
      label: 'FAQ',
      href: '/settings/faq',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
    },
    {
      icon: Share2,
      label: 'Partager avec tes amis',
      onClick: handleShare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
    },
     {
      icon: MessageSquare,
      label: 'Réaction',
      href: 'mailto:contact@wanderlink.app',
      color: 'text-green-500',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
    },
    {
      icon: Shield,
      label: 'Politique de confidentialité',
      href: '/settings/privacy-policy',
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-200 dark:bg-gray-800',
    },
    {
      icon: FileText,
      label: "Conditions d'utilisation",
      href: '/settings/terms-of-service',
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-200 dark:bg-gray-800',
    },
    {
      icon: Heart,
      label: 'Aimer WanderLink',
      onClick: handleLike,
      color: 'text-pink-500',
      bgColor: 'bg-pink-100 dark:bg-pink-900/50',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="fixed top-0 z-20 w-full h-12 flex items-center justify-between border-b bg-background/95 px-2 py-1 backdrop-blur-sm md:px-4">
        <button onClick={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold">Préférences</h1>
        <div className="w-8"></div>
      </header>

      <main className="pt-12">
        <ul className="divide-y divide-border">
            {/* Dark Mode Toggle */}
            <li className="flex cursor-pointer items-center p-4 transition-colors hover:bg-muted/50">
                <div className="mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
                    <Moon className="h-4 w-4 text-indigo-500" />
                </div>
                <span className="flex-1 text-sm text-card-foreground">Mode Sombre</span>
                <ThemeToggle />
            </li>

          {settingsItems.map((item) => {
            const content = (
              <div className="flex cursor-pointer items-center p-4 transition-colors">
                <div className={cn('mr-3 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', item.bgColor)}>
                  <item.icon className={cn('h-4 w-4', item.color)} />
                </div>
                <span className='flex-1 text-sm text-card-foreground'>
                  {item.label}
                </span>
                <ChevronRight className="h-5 w-5 text-muted-foreground/50" />
              </div>
            );
            
            if (item.href) {
              const isExternal = item.href.startsWith('mailto:');
              return (
                <li key={item.label} className="hover:bg-muted/50">
                  <Link
                    href={item.href}
                    target={isExternal ? '_blank' : '_self'}
                    rel={isExternal ? 'noopener noreferrer' : undefined}
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={item.label} onClick={item.onClick} className="hover:bg-muted/50">
                {content}
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  );
};

export default SettingsPage;
