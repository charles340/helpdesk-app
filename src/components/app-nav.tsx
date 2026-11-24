import { requireUser } from '@/lib/session';
import { canManageUsers, isStaff } from '@/lib/permissions';
import { NavLinks, type NavItem } from './nav-links';
import { UserMenu } from './user-menu';

export async function AppNav() {
  const user = await requireUser();
  const staff = isStaff(user.role);

  const items: NavItem[] = [
    { href: '/tickets', label: staff ? 'Ticket queue' : 'My tickets', icon: 'tickets' },
    { href: '/tickets/new', label: 'New ticket', icon: 'new' },
    ...(staff
      ? [{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard' } as const]
      : []),
    { href: '/kb', label: 'Knowledge base', icon: 'kb' },
    ...(canManageUsers(user)
      ? [{ href: '/admin/users', label: 'Users', icon: 'users' } as const]
      : []),
  ];

  return (
    <div className="flex flex-1 flex-col gap-4">
      <NavLinks items={items} />
      <div className="md:mt-auto">
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </div>
  );
}
