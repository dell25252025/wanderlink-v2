'use client';

import { motion } from 'framer-motion';
import { travelIntentions } from '@/lib/options';
import { useIsMobile } from '@/hooks/useIsMobile';
import placeholderContent from '@/lib/placeholder-content.json';

const { desktopVideoUrl, mobileVideoUrl } = placeholderContent.loginVideos;

interface IntentionPickerProps {
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function IntentionPicker({ onSelect, onClose }: IntentionPickerProps) {
  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4"
    >
      {/* Video Background & Logo - Replicated from OnboardingOverlay */}
      <div className="absolute top-0 left-0 h-full w-full overflow-hidden -z-10">
        <video
          key={isMobile ? 'mobile-intention' : 'desktop-intention'}
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
        <div className="absolute top-0 left-0 h-full w-full bg-black/40" />
      </div>

      <div className="w-full max-w-lg text-center">
        <h1 className="text-4xl font-bold font-logo text-white mb-4">
            <span className="text-white">Wander</span><span className="text-accent">Link</span>
        </h1>
        <h2 className="text-2xl font-bold font-headline mb-2 text-white">Quelle est votre intention ?</h2>
        <p className="text-white/80 mb-8">Choisissez le type de voyage qui vous correspond.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {travelIntentions.map((intention, index) => (
            <motion.div
              key={intention.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => {
                  onSelect(intention.value);
                  onClose();
                }}
                className="w-full h-full text-left rounded-xl border-2 border-white/20 bg-white/10 hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent p-6 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                    <div className="text-4xl">{intention.emoji}</div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">{intention.label}</h3>
                        <p className="text-sm text-white/70">{intention.description}</p>
                    </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
