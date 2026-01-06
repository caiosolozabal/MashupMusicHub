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
  roles: UserRole[]; // Make roles non-optional for clarity
  exact?: boolean; 
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard, roles: ['admin', 'partner', 'dj'] },
  { href: '/events', label: 'Eventos', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/schedule', label: 'Agenda', icon: CalendarDays, roles: ['admin', 'partner', 'dj'] },
  { href: '/settlements', label: 'Fechamentos', icon: DollarSign, roles: ['admin', 'partner', 'dj'] },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const { userDetails, loading } = useAuth(); 

  // Function to determine if a user has permission to see a nav item
  const canView = (itemRoles: UserRole[]): boolean => {
    // If auth is loading or userDetails are not yet available, don't show any role-specific links
    if (loading || !userDetails?.role) {
      return false;
    }
    // Check if the user's role is included in the roles allowed for the nav item
    return itemRoles.includes(userDetails.role);
  };

  // While authentication is in progress, display a loading skeleton
  if (loading) {
    return (
       <SidebarMenu>
        {[...Array(4)].map((_, i) => (
          <SidebarMenuItem key={i} >
            <SidebarMenuButton disabled className="h-8 w-full bg-muted/50 animate-pulse">
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        // Determine if the current link should be considered active
        const isActive = item.exact === false 
          ? pathname.startsWith(item.href) 
          : pathname === item.href;

        // Render the item only if the user has the required role
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
        return null; // Return null if user does not have permission, to render nothing
      })}
    </SidebarMenu>
  );
}
