
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // We only want to redirect once the auth state is conclusive.
    if (!loading) {
      if (user) {
        // If there's a user, go to the main dashboard.
        router.replace('/dashboard');
      } else {
        // If there's no user, go to the login page.
        router.replace('/login');
      }
    }
    // The effect depends on the loading and user state to run redirects.
  }, [user, loading, router]);

  // While loading is true, this component will show a full-screen loader.
  // This is the single source of truth for the initial loading UI.
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="ml-4 text-lg font-semibold">Loading Mashup Music Hub...</p>
    </div>
  );
}
