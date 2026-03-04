import { Suspense } from 'react';
import ProfileClientPage from './profile-client-page';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ProfileClientPage />
    </Suspense>
  );
}
