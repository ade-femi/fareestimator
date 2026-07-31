'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/server/actions/auth-actions';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
] as const;

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-4">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            Travel Fee Admin
          </Link>
          <form action={logoutAction} className="sm:hidden">
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>

        <nav
          aria-label="Admin sections"
          className="flex items-center gap-1 overflow-x-auto"
        >
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-secondary text-secondary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="max-w-[16ch] truncate text-xs text-muted-foreground">
            {userEmail}
          </span>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
