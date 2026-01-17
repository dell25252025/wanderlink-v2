
'use client';

import { useOnboarding } from '@/context/OnboardingContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import placeholderContent from '@/lib/placeholder-content.json';
import { Loader2 } from 'lucide-react';
import { Button } from './ui/button';

const { desktopVideoUrl, mobileVideoUrl } = placeholderContent.loginVideos;

export default function OnboardingOverlay() {
  const { isOverlayActive, mode } = useOnboarding();
  const isMobile = useIsMobile();

  if (!isOverlayActive || mode !== 'google') {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 h-screen w-screen z-[9999] bg-background">
      {/* Video Background */}
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden">
        <video
          key={isMobile ? 'mobile-overlay' : 'desktop-overlay'}
          autoPlay
          loop
          muted
          playsInline
          controls={false}
          disablePictureInPicture={true}
          poster="https://ik.imagekit.io/fip3ktm2p/tr:w-1080,h-1920,bl-6/video_app_poster.jpg?updatedAt=1758004071374"
          className="h-full w-full object-cover"
        >
          <source
            src={isMobile ? mobileVideoUrl : desktopVideoUrl}
            type="video/mp4"
          />
        </video>
        <div className="absolute top-0 left-0 h-full w-full bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
         <div className="flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm p-8 rounded-2xl">
            <h1 className="text-3xl font-bold font-logo text-white mb-4">
                <span className="text-white">Wander</span><span className="text-accent">Link</span>
            </h1>
            <p className="text-lg text-white/90 mb-8 text-center max-w-xs">
                Préparation de votre profil...
            </p>
             <Button variant="outline" className="w-full bg-white/80 border-slate-200 text-slate-600 cursor-not-allowed" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connexion avec Google...
            </Button>
            <p className="text-xs text-white/70 mt-4 text-center">Les demandes d'autorisation vont apparaître.</p>
         </div>
      </div>
    </div>
  );
}
