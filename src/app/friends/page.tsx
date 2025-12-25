
import { Suspense } from 'react';
import FriendsClientPage from './friends-client-page';
import { Loader2 } from 'lucide-react';

export default function FriendsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-80px)] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Chargement de la page des amis...</p>
      </div>
    }>
      <FriendsClientPage />
    </Suspense>
  );
}
