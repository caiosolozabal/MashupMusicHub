'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Settings, DollarSign, Loader2, Users, Package } from 'lucide-react';
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
  { href: '/schedule', label: 'Agenda de Eventos', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/settlements', label: 'Fechamentos', icon: DollarSign, roles: ['admin', 'partner', 'dj'] },
  { href: '/rental', label: 'Locação', icon: Package, roles: ['admin', 'partner'], exact: false },
  { href: '/djs', label: 'Vitrine de DJs', icon: Users, roles: ['admin', 'partner', 'dj'], exact: false },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin', 'partner', 'dj'], exact: false },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { userDetails, loading } = useAuth(); 

  const canView = (itemRoles: UserRole[]): boolean => {
    if (loading) {
      return false;
    }
    const userRole = userDetails?.role ?? null;
    return itemRoles.includes(userRole);
  };

  if (loading && !userDetails) {
    return (
       <SidebarMenu>
        {[...Array(6)].map((_, i) => (
          <SidebarMenuItem key={i} >
            <div className="h-8 w-full bg-muted/50 animate-pulse rounded-md" />
          </SidebarMenuItem>
        ))}
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
