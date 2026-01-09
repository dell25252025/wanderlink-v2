
import * as z from 'zod';

export const formSchema = z.object({
  firstName: z.string().min(1, 'Le prénom est obligatoire.'),
  age: z.number({ required_error: "L'âge est obligatoire." }).min(18, 'Vous devez avoir au moins 18 ans.'),
  gender: z.enum(['Homme', 'Femme', 'Autre'], { required_error: "Le genre est obligatoire."}),
  profilePictures: z.array(z.string()).min(1, 'Veuillez ajouter au moins une photo.').max(6, 'Vous ne pouvez ajouter que 6 photos au maximum.'),
  bio: z.string().max(500, 'La description ne doit pas dépasser 500 caractères.').optional(),
  languages: z.array(z.string()), // This is now optional
  location: z.string().min(1, 'La localisation est obligatoire.'),
  height: z.number().optional().nullable(),
  weight: z.number().optional().nullable(),
  tobacco: z.enum(['Non-fumeur', 'Occasionnellement', 'Régulièrement']).optional(),
  alcohol: z.enum(['Jamais', 'Occasionnellement', 'Souvent']).optional(),
  cannabis: z.enum(['Non-fumeur', 'Occasionnellement', 'Régulièrement']).optional(),
  destination: z.string().min(1, 'La destination est obligatoire.'),
  dates: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  flexibleDates: z.boolean().default(false),
  travelStyle: z.string().optional(),
  activities: z.string().optional(),
  intention: z.enum(['Sponsor', 'Sponsorisé', '50/50', 'Groupe'], { required_error: "L'intention de voyage est obligatoire."}),
  financialArrangement: z.enum(['50/50', 'Sponsor', 'Sponsorisé', 'Groupe']).optional(),
  // Premium fields
  isPremium: z.boolean().optional().default(false),
  subscriptionEndDate: z.date().nullable().optional(),
  // Verification field
  isVerified: z.boolean().optional().default(false),
});

export type FormData = z.infer<typeof formSchema>;

// Consolidated UserProfile type
export type TravelIntention = 'Sponsor' | 'Sponsorisé' | '50/50' | 'Groupe';

export type UserProfile = {
  id: string;
  name: string;
  age: number;
  gender: 'Homme' | 'Femme' | 'Autre';
  bio: string;
  location: string;
  travelStyle: string;
  dreamDestinations: string[];
  languagesSpoken: string[];
  travelIntention: TravelIntention;
  interests?: string[];
  verified: boolean;
  image: string;
  isPremium?: boolean;
  subscriptionEndDate?: Date | null;
  isVerified: boolean;
};

    
