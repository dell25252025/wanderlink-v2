
'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { travelIntentions } from '@/lib/options';

interface IntentionPickerProps {
  onSelect: (value: string) => void;
  onClose: () => void;
}

export default function IntentionPicker({ onSelect, onClose }: IntentionPickerProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-4"
    >
      <div className="w-full max-w-md text-center">
        <h2 className="text-3xl font-bold font-headline mb-2 text-foreground">Quelle est votre intention ?</h2>
        <p className="text-muted-foreground mb-8">Choisissez le type de voyage qui vous correspond le mieux.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {travelIntentions.map((intention, index) => (
            <motion.div
              key={intention.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-1"
            >
              <button
                onClick={() => {
                  onSelect(intention.value);
                  onClose();
                }}
                className="w-full h-full text-left rounded-xl border-2 border-border bg-card hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background p-6 transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                    <div className="text-4xl">{intention.emoji}</div>
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">{intention.label}</h3>
                        <p className="text-sm text-muted-foreground">{intention.description}</p>
                    </div>
                </div>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Le bouton avec la croix X a été retiré ici */}
    </motion.div>
  );
}
