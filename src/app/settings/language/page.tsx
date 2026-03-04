
'use client';

import { useState, useEffect } from 'react';
import { Check, Languages } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SettingsHeader } from '@/components/settings/settings-header';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getDictionary, type Locale } from '@/lib/i18n';
import type { Dictionary } from '@/lib/i18n';

const availableLanguages = [
  { code: 'fr' as Locale, name: 'Français', flag: '🇫🇷' },
  { code: 'en' as Locale, name: 'English', flag: '🇬🇧' },
];

export default function LanguagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>('fr');
  const [dict, setDict] = useState<Dictionary | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load the dictionary for the selected language
    const fetchDictionary = async () => {
      const dictionary = await getDictionary(selectedLanguage);
      setDict(dictionary);
    };
    fetchDictionary();
  }, [selectedLanguage]);

  const handleLanguageChange = (langCode: Locale) => {
    setSelectedLanguage(langCode);
    const langName = availableLanguages.find(l => l.code === langCode)?.name;
    toast({
      title: dict?.languagePage.toast.title,
      description: `${dict?.languagePage.toast.description} ${langName}`,
    });
    // In a real app, you would save this to user preferences and update a global context.
  };

  if (!dict) {
    return null; // or a loading skeleton
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <SettingsHeader title={dict.languagePage.headerTitle} />
      <main className="px-2 py-4 md:px-4 pt-16">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Languages className="h-5 w-5" /> {dict.languagePage.cardTitle}
              </CardTitle>
              <CardDescription className="text-sm">{dict.languagePage.cardDescription}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ul className="space-y-3">
                {availableLanguages.map((lang) => (
                  <li key={lang.code}>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start p-4 h-auto text-base",
                        selectedLanguage === lang.code && "border-primary ring-2 ring-primary"
                      )}
                      onClick={() => handleLanguageChange(lang.code)}
                    >
                      <span className="mr-3 text-2xl">{lang.flag}</span>
                      <span className="flex-1 text-left text-sm">{lang.name}</span>
                      {selectedLanguage === lang.code && <Check className="h-5 w-5 text-primary" />}
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
