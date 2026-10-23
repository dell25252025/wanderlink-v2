import { useState, useEffect } from 'react';

/**
 * Un hook qui "débounce" une valeur. La valeur "débouncée" ne sera mise à jour 
 * qu'après un délai spécifié sans que la valeur d'origine n'ait changé.
 * Cela est utile pour éviter des opérations coûteuses (comme des appels API) 
 * sur des événements qui se déclenchent rapidement (comme la saisie au clavier).
 *
 * @param value La valeur à "débouncer".
 * @param delay Le délai en millisecondes.
 * @returns La valeur "débouncée".
 */
export function useDebounce<T>(value: T, delay: number): T {
  // État pour stocker la valeur débouncée
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Met en place un minuteur pour mettre à jour la valeur débouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoie le minuteur si la valeur change (par exemple, l'utilisateur continue de taper)
    // ou si le composant est démonté.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Ne se ré-exécute que si la valeur ou le délai change

  return debouncedValue;
}
