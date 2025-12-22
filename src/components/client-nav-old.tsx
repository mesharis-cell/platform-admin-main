'use client';

/**
 * Client Navigation Component
 *
 * Unified navigation for client-facing pages.
 * Industrial aesthetic matching admin panel for consistency.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Calendar,
  Grid3x3,
  Package,
  LogOut,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const clientNav = [
  { name: 'Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
  { name: 'Catalog', href: '/catalog', icon: Grid3x3 },
  { name: 'My Orders', href: '/my-orders', icon: ShoppingCart },
  { name: 'Event Calendar', href: '/event-calendar', icon: Calendar },
];

interface ClientNavProps {
  children: React.ReactNode;
}

export function ClientNav({ children }: ClientNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Client Sidebar Navigation - Industrial Style */}
      <aside className="w-72 border-r border-border bg-muted/30 flex-shrink-0 sticky top-0 h-screen flex flex-col relative overflow-hidden">
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Zone marker - top left */}
        <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
          CLIENT-01
        </div>

        {/* Zone marker - top right */}
        <div className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
          SEC-L1
        </div>

        {/* Header */}
        <div className="relative z-10 p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden">
              <Box className="h-5 w-5 text-primary relative z-10" strokeWidth={2.5} />
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-mono font-bold tracking-tight uppercase">
                Client Portal
              </h2>
              <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                Asset Ordering System
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
          {isPending ? (
            // Loading skeletons
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-3.5 flex-1" />
                </div>
              ))}
            </>
          ) : (
            clientNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-mono transition-all relative overflow-hidden',
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-foreground/70 hover:text-foreground hover:bg-muted'
                  )}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                  )}

                  <Icon className="h-4 w-4 relative z-10 flex-shrink-0" strokeWidth={2.5} />
                  <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">{item.name}</span>

                  {/* Hover glow effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Divider with technical detail */}
        <div className="relative z-10 px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
              User Profile
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* User Profile & Sign Out */}
        <div className="relative z-10 p-4 space-y-3">
          {isPending ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2 py-1">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarFallback className="bg-primary/10 text-primary font-mono text-sm font-bold">
                    {session?.user?.name?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-semibold truncate">{session?.user?.name || 'Client User'}</p>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                    Client User
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="w-full font-mono text-xs uppercase tracking-wide hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              >
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </Button>
            </>
          )}
        </div>

        {/* Bottom zone marker */}
        <div className="absolute bottom-4 left-4 right-4 text-[9px] font-mono text-muted-foreground/30 tracking-[0.2em] uppercase text-center z-0">
          PMG Asset Fulfillment v1.0
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}

