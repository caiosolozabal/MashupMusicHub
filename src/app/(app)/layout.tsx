import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import ClientSafeProvider from '@/components/shared/ClientSafeProvider';
import { Toaster } from '@/components/ui/toaster';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClientSafeProvider>
      <AppShell>{children}</AppShell>
      <Toaster />
    </ClientSafeProvider>
  );
}
