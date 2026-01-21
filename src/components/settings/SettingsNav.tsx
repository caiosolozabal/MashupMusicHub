'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const sidebarNavItems = [
  {
    title: 'Meu Perfil',
    href: '/settings/profile',
    roles: ['admin', 'partner', 'dj'],
    exact: true,
  },
  {
    title: 'Gerenciar Usuários',
    href: '/settings/users',
    roles: ['admin', 'partner'],
    exact: true,
  },
  {
    title: 'Contas da Agência',
    href: '/settings/accounts',
    roles: ['admin', 'partner'],
    exact: true,
  },
  {
    title: 'Marca (Logo & PIX)',
    href: '/settings/branding',
    roles: ['admin', 'partner'],
    exact: true,
  },
  {
    title: 'Ferramentas de Migração',
    href: '/settings/migration',
    roles: ['admin', 'partner'],
    exact: false,
  },
];

export function SettingsNav() {
  const pathname = usePathname();
  const { userDetails } = useAuth();

  return (
    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
      {sidebarNavItems.map((item) => {
        if (!userDetails?.role || !item.roles.includes(userDetails.role)) {
            return null;
        }
        
        const isActive = item.exact === false 
          ? pathname.startsWith(item.href) 
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              isActive
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'hover:bg-transparent hover:underline',
              'justify-start'
            )}
          >
            {item.title}
          </Link>
        )
      })}
    </nav>
  );
}
