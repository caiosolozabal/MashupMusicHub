'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import AppShell from '@/components/layout/AppShell';
import ClientSafeProvider from '@/components/shared/ClientSafeProvider';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center space-y-4 bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Autenticando acesso...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <ClientSafeProvider>
      <AppShell>{children}</AppShell>
    </ClientSafeProvider>
  );
}