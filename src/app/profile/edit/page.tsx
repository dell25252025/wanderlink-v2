
import { Suspense } from 'react';
import EditProfileClientPage from './edit-profile-client';
import { Loader2 } from 'lucide-react';

export default function EditProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <EditProfileClientPage />
    </Suspense>
  );
}
