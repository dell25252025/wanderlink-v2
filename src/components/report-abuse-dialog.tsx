
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { DocumentData } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { submitAbuseReport } from '@/lib/firebase-actions';
import { auth } from '@/lib/firebase';
import { cn } from '@/lib/utils';

interface ReportAbuseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUser: DocumentData | null;
}

const reportReasons = [
  { id: 'spam', label: 'Spam ou publicité' },
  { id: 'harassment', label: 'Harcèlement ou discours haineux' },
  { id: 'inappropriate_content', label: 'Contenu inapproprié (nudité, violence...)' },
  { id: 'fake_profile', label: 'Faux profil ou usurpation d\'identité' },
  { id: 'scam', label: 'Escroquerie ou fraude' },
  { id: 'other', label: 'Autre' },
];

export function ReportAbuseDialog({ isOpen, onOpenChange, reportedUser }: ReportAbuseDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const currentUser = auth.currentUser;

  const handleSubmit = async () => {
    if (!currentUser) {
       toast({ variant: 'destructive', title: 'Erreur', description: "Vous devez être connecté pour signaler un utilisateur." });
       return;
    }

    if (!reportedUser) {
        toast({ variant: 'destructive', title: 'Erreur', description: "Aucun utilisateur à signaler n'a été spécifié." });
        return;
    }
      
    if (!selectedReason) {
      toast({
        variant: 'destructive',
        title: 'Veuillez sélectionner une raison',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
        const result = await submitAbuseReport(currentUser.uid, reportedUser.id, selectedReason, details);

        if (!result.success) {
            throw new Error(result.error);
        }
        
        toast({
            title: 'Signalement envoyé',
            description: `Merci. Nous allons examiner le profil de ${reportedUser?.firstName}.`,
            duration: 3000,
        });

        // Reset and close
        onOpenChange(false);
        setSelectedReason(null);
        setDetails('');

    } catch(error) {
        const errorMessage = error instanceof Error ? error.message : "Une erreur inconnue est survenue.";
        toast({
            variant: 'destructive',
            title: 'Échec de l\'envoi',
            description: errorMessage
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[340px] rounded-lg p-4">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base">Signaler {reportedUser?.firstName || 'cet utilisateur'}</DialogTitle>
          <DialogDescription className="text-xs">
            Aidez-nous à garder WanderLink sécurisé. Les signalements sont anonymes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <RadioGroup value={selectedReason || ''} onValueChange={setSelectedReason}>
            <div className="space-y-1.5">
              {reportReasons.map((reason) => (
                <div key={reason.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <Label htmlFor={reason.id} className="font-normal text-xs leading-tight">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
          
          <Textarea
            placeholder="Fournissez plus de détails (optionnel)..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="mt-1 text-xs min-h-[60px]"
            rows={2}
          />
        </div>
        <DialogFooter className="flex-row justify-end space-x-2">
          <DialogClose asChild>
            <Button type="button" variant="secondary" size="sm" disabled={isSubmitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button type="submit" size="sm" onClick={handleSubmit} disabled={!selectedReason || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Soumettre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
