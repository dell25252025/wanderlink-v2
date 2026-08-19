
import * as z from 'zod';

export const formSchema = z.object({
  // --- Step 1 --- //
  firstName: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères.'),
  age: z.coerce
    .number({ invalid_type_error: 'L\'âge doit être un nombre.' })
    .min(18, 'Vous devez avoir au moins 18 ans.')
    .max(99, 'L\'âge doit être inférieur à 100 ans.')
    .optional()
    .or(z.literal(undefined)),
  gender: z.string().optional(), // Rendu optionnel
  profilePictures: z.array(z.string()),
  bio: z.string().max(500, 'La description ne peut pas dépasser 500 caractères.').optional(),

  // --- Step 2 --- //
  languages: z.array(z.string()), // Déjà optionnel
  location: z.string().optional(),
  height: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number({
      invalid_type_error: 'La taille doit être un nombre.',
    }).positive('La taille doit être un nombre positif.').optional(),
  ),
  weight: z.preprocess(
    (val) => (val === '' || val === null ? undefined : val),
    z.coerce.number({
      invalid_type_error: 'Le poids doit être un nombre.',
    }).positive('Le poids doit être un nombre positif.').optional(),
  ),

  // --- Step 3 --- //
  tobacco: z.string().optional(),
  alcohol: z.string().optional(),
  cannabis: z.string().optional(),

  // --- Step 4 --- //
  destination: z.string(),
  dates: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  flexibleDates: z.boolean().optional(),
  travelStyle: z.string(),
  activities: z.string(),
  intention: z.string({ required_error: 'Veuillez spécifier une intention.' }),
});

export type FormData = z.infer<typeof formSchema>;
