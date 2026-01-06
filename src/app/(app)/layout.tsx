import type { ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';
import ClientSafeProvider from '@/components/shared/ClientSafeProvider';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <ClientSafeProvider>
      <AppShell>{children}</AppShell>
    </ClientSafeProvider>
  );
}
