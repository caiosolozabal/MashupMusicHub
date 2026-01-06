'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Settings, DollarSign, Loader2 } from 'lucide-react';
import type { UserRole } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: UserRole[];
  exact?: boolean; 
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['admin', 'partner', 'dj'] },
  { href: '/events', label: 'Eventos', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/schedule', label: 'Agenda', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/settlements', label: 'Fechamentos', icon: DollarSign, roles: ['admin', 'partner', 'dj'] },
  // Temporary link to fix role
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin', 'partner', 'dj', null] },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { userDetails, loading } = useAuth(); 

  const canView = (itemRoles: UserRole[]): boolean => {
    // If auth is loading, don't show any role-specific links yet
    if (loading) {
        // But we MUST show the settings link to fix the role
        if(itemRoles.includes(null)){
            return true;
        }
        return false;
    }
    // If not loading, check roles
    const userRole = userDetails?.role ?? null;
    return itemRoles.includes(userRole);
  };

  // While authentication is in progress, display a loading skeleton
  if (loading && !userDetails) {
    return (
       <SidebarMenu>
        {[...Array(4)].map((_, i) => (
          <SidebarMenuItem key={i} >
            <div className="h-8 w-full bg-muted/50 animate-pulse rounded-md" />
          </SidebarMenuItem>
        ))}
         <SidebarMenuItem>
            <Link href="/settings" legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === '/settings'}
                  tooltip={{ children: 'Configurações', side: 'right', align: 'center' }}
                  aria-label={'Configurações'}
                >
                  <a>
                    <Settings />
                    <span>Configurações</span>
                  </a>
                </SidebarMenuButton>
              </Link>
         </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive = item.exact === false 
          ? pathname.startsWith(item.href) 
          : pathname === item.href;

        if (canView(item.roles)) {
          return (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  aria-label={item.label}
                >
                  <a>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )
        }
        return null;
      })}
    </SidebarMenu>
  );
}
