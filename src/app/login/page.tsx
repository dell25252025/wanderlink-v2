'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/useIsMobile';
import AuthForm from '@/components/auth-form';
import placeholderContent from '@/lib/placeholder-content.json';

const { desktopVideoUrl, mobileVideoUrl } = placeholderContent.loginVideos;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isEmailFormVisible, setIsEmailFormVisible] = useState(false);
  const isMobile = useIsMobile();
  const router = useRouter();

  const resetAuthState = () => {
    setIsEmailFormVisible(false);
  };

  if (isMobile && isEmailFormVisible) {
    return (
      <div className="flex h-screen flex-col bg-background p-4">
        <div className="flex-shrink-0">
          <button onClick={resetAuthState} aria-label="Retour">
            <svg className="h-6 w-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center text-center">
            <h1 className="text-2xl font-bold text-foreground mb-6 text-center">
                {isLogin ? 'Connexion' : 'Créer un compte'}
            </h1>
            <div className="w-full">
                <AuthForm
                    isLogin={isLogin}
                    setIsLogin={setIsLogin}
                    isEmailFormVisible={isEmailFormVisible}
                    setIsEmailFormVisible={setIsEmailFormVisible}
                    onSuccess={() => router.push(isLogin ? '/' : '/create-profile')}
                />
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background -mt-12 md:mt-0">
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden">
        <video
          key={isMobile ? 'mobile' : 'desktop'}
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

      <div className="relative z-10">
        <div className="grid min-h-screen items-center md:grid-cols-2">
            <div className="hidden md:flex flex-col justify-center p-12 lg:p-16">
              <h1 className="text-6xl font-bold font-logo text-white mb-4">
                  <span className="text-white">Wander</span><span className="text-accent">Link</span>
              </h1>
              <p className="text-xl text-white">
                  Trouvez des compagnons de voyage qui partagent votre passion. Votre prochaine grande aventure commence ici.
              </p>
            </div>

            <div className="flex flex-col h-screen p-4 md:items-center md:justify-center md:h-auto">
                <div className="text-center md:hidden pt-2 flex-shrink-0">
                    <button onClick={resetAuthState} className="flex w-full justify-center items-center gap-2 bg-transparent border-none p-0" aria-label="Retour à l'accueil de l'authentification">
                        <h1 className="text-3xl font-bold font-logo text-white">
                            <span className="text-white">Wander</span><span className="text-accent">Link</span>
                        </h1>
                    </button>
                    <p className={`text-base text-white px-1 leading-tight text-center md:hidden mt-1 w-full mx-auto`}>
                        Trouvez des compagnons de voyage qui partagent votre passion
                    </p>
                </div>
            
                <div className='flex-1 flex flex-col w-full max-w-sm mx-auto justify-center pb-4 md:justify-center md:bg-black/20 md:backdrop-blur-sm md:p-8 md:rounded-2xl md:relative'>
                  {isEmailFormVisible && (
                    <div className="absolute top-4 left-4 hidden md:block">
                      <button onClick={resetAuthState} aria-label="Retour" className="p-2 rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <AuthForm
                      isLogin={isLogin}
                      setIsLogin={setIsLogin}
                      isEmailFormVisible={isEmailFormVisible}
                      setIsEmailFormVisible={setIsEmailFormVisible}
                  />
                </div>

                <div className={`absolute bottom-0 left-0 right-0 text-center md:hidden pb-2 flex-shrink-0 ${isEmailFormVisible ? 'hidden' : ''}`}>
                    <p className="text-[9px] text-white px-4">
                        En vous inscrivant, vous acceptez notre <Link href="/settings/privacy-policy" className="underline">Politique de confidentialité</Link>.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
