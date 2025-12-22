'use client';

/**
 * Enhanced Client Navigation with Cart Integration
 *
 * Industrial aesthetic with floating cart button and badge
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
import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth';
import { signOut } from '@/lib/auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { CartProvider, useCart } from '@/contexts/cart-context';
import { FloatingCart } from '@/components/cart/floating-cart';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import type { Company } from '@/types';

const clientNav = [
  { name: 'Dashboard', href: '/client-dashboard', icon: LayoutDashboard },
  { name: 'Catalog', href: '/catalog', icon: Grid3x3 },
  { name: 'My Orders', href: '/my-orders', icon: ShoppingCart },
  { name: 'Event Calendar', href: '/event-calendar', icon: Calendar },
];

interface ClientNavProps {
  children: React.ReactNode;
}

function ClientNavInner({ children }: ClientNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { toggleCart, itemCount } = useCart();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Fetch user's company for logo display
  useEffect(() => {
    async function fetchCompany() {
      if (!session?.user) {
        setCompanyLoading(false);
        return;
      }

      // Only fetch for CLIENT_USER
      const permissionTemplate = (session.user as any).permissionTemplate;
      if (permissionTemplate !== 'CLIENT_USER') {
        setCompanyLoading(false);
        return;
      }

      // Get user's company ID
      const companies = (session.user as any).companies || [];
      if (companies.length === 0 || companies[0] === '*') {
        setCompanyLoading(false);
        return;
      }

      const companyId = companies[0];

      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompany(data);
        }
      } catch (error) {
        console.error('Failed to fetch company:', error);
      } finally {
        setCompanyLoading(false);
      }
    }

    fetchCompany();
  }, [session]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Find most specific matching route for active state
  const getActiveRoute = () => {
    const matchingRoutes = clientNav.filter(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    );
    return matchingRoutes.reduce((longest, current) =>
      current.href.length > longest.href.length ? current : longest,
      matchingRoutes[0]
    );
  };

  const activeRoute = getActiveRoute();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Navigation */}
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

        {/* Zone markers */}
        <div className="absolute top-4 left-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
          CLIENT-01
        </div>
        <div className="absolute top-4 right-4 text-[10px] font-mono text-muted-foreground/40 tracking-[0.2em] uppercase z-0">
          SEC-L1
        </div>

        {/* Header */}
        <div className="relative z-10 p-6 pb-4 border-b border-border">
          <div className="flex items-center gap-3 mb-2">
            {companyLoading ? (
              <Skeleton className="h-10 w-10 rounded-lg" />
            ) : company?.logoUrl ? (
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center flex-shrink-0">
                <img
                  src={company.logoUrl}
                  alt={`${company.name} logo`}
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ) : company ? (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30">
                <span className="text-sm font-mono font-bold text-primary">
                  {company.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/30 relative overflow-hidden">
                <Box className="h-5 w-5 text-primary relative z-10" />
                <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              </div>
            )}
            <div>
              {companyLoading ? (
                <>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </>
              ) : (
                <>
                  <h2 className="text-lg font-mono font-bold tracking-tight uppercase">
                    {company ? company.name : 'Client Portal'}
                  </h2>
                  <p className="text-[10px] font-mono text-muted-foreground tracking-[0.15em] uppercase">
                    Asset Ordering System
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto relative z-10">
          {isPending ? (
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
              const isActive = activeRoute?.href === item.href;
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
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary-foreground/30" />
                  )}

                  <Icon className="h-4 w-4 relative z-10 flex-shrink-0" />
                  <span className="flex-1 relative z-10 uppercase tracking-wide text-xs">{item.name}</span>

                  {!isActive && (
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors" />
                  )}
                </Link>
              );
            })
          )}
        </nav>

        {/* Divider */}
        <div className="relative z-10 px-6 py-2">
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[9px] font-mono text-muted-foreground tracking-[0.2em] uppercase">
              User Profile
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
        </div>

        {/* User Profile */}
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
      <main className="flex-1 overflow-auto bg-background relative">
        {children}

        {/* Floating Cart Button */}
        <motion.button
          onClick={toggleCart}
          className="fixed bottom-8 right-8 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center hover:scale-110 transition-transform z-30 border-4 border-background"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <ShoppingCart className="h-6 w-6" />
          <AnimatePresence>
            {itemCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-mono font-bold text-sm border-2 border-background"
              >
                {itemCount}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Floating Cart Panel */}
        <FloatingCart />
      </main>
    </div>
  );
}

export function ClientNav({ children }: ClientNavProps) {
  return (
    <CartProvider>
      <ClientNavInner>{children}</ClientNavInner>
    </CartProvider>
  );
}
