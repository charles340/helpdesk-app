'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpenIcon,
  InboxIcon,
  LayoutDashboardIcon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS = {
  tickets: InboxIcon,
  new: PlusIcon,
  dashboard: LayoutDashboardIcon,
  kb: BookOpenIcon,
  users: UsersIcon,
};

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // The longest matching href wins, so /tickets/new doesn't also light up /tickets.
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        return (
          <Link
            key={href}
            href={href}
            aria-current={active === href ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
              active === href && 'bg-muted font-medium text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
