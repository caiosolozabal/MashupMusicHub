
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton 
} from '@/components/ui/sidebar';
import { LayoutDashboard, CalendarDays, Settings, DollarSign, Users, Package, ClipboardList, Ticket, Contact2 } from 'lucide-react';
import type { UserRole } from '@/context/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from '@/components/ui/sidebar';

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
  { href: '/guest-lists', label: 'Captação de Listas', icon: Ticket, roles: ['admin', 'partner'] },
  { href: '/contacts', label: 'CRM Contatos', icon: Contact2, roles: ['admin', 'partner'] },
  { href: '/tasks', label: 'Avisos e tarefas', icon: ClipboardList, roles: ['admin', 'partner', 'dj'] },
  { href: '/settlements', label: 'Fechamentos', icon: DollarSign, roles: ['admin', 'partner', 'dj'] },
  { href: '/rental', label: 'Locação', icon: Package, roles: ['admin', 'partner'], exact: false },
  { href: '/djs', label: 'Vitrine de DJs', icon: Users, roles: ['admin', 'partner', 'dj'], exact: false },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['admin', 'partner', 'dj'], exact: false },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { userDetails, loading } = useAuth(); 
  const { setOpenMobile, isMobile } = useSidebar();

  const canView = (itemRoles: UserRole[]): boolean => {
    if (loading) return false;
    const userRole = userDetails?.role ?? null;
    return itemRoles.includes(userRole);
  };

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  if (loading && !userDetails) {
    return (
       <SidebarMenu>
        {[...Array(9)].map((_, i) => (
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
              <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={{ children: item.label, side: 'right', align: 'center' }}
                aria-label={item.label}
                onClick={handleLinkClick}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        }
        return null;
      })}
    </SidebarMenu>
  );
}
