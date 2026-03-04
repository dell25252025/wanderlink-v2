
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

const dictionaries = {
  fr,
  en,
};

export type Dictionary = typeof fr;
export type Locale = keyof typeof dictionaries;

export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale] ?? dictionaries.fr;
};
