import type { Metadata } from 'next';
import Form from 'next/form';
import { SelectField } from '@/components/tickets/field-forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getDb } from '@/db';
import { ROLE_LABELS, ROLES } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { param } from '@/lib/search-params';
import { requireRole } from '@/lib/session';
import { listUsers } from '@/server/users';
import { changeRoleAction } from './actions';

export const metadata: Metadata = { title: 'Users' };

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

export default async function UsersPage({
  searchParams,
}: PageProps<'/admin/users'>) {
  const admin = await requireRole('admin');
  const q = param(await searchParams, 'q');
  const { rows, total } = await listUsers(await getDb(), admin, { q });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">
          Requesters file and follow their own tickets. Agents see every ticket
          and can edit the knowledge base. Admins can also change roles on this
          page.
        </p>
      </header>

      <Form action="/admin/users" className="flex gap-2">
        <Input
          name="q"
          type="search"
          placeholder="Search name or email"
          defaultValue={q}
          className="w-full sm:w-72"
          aria-label="Search users"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </Form>

      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
          {q ? `Nobody matches "${q}".` : 'No users yet.'}
        </p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-40">Role</TableHead>
                <TableHead className="text-right">Tickets filed</TableHead>
                <TableHead className="text-right">Working on</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">
                      {u.name}
                      {u.id === admin.id && (
                        <span className="text-muted-foreground font-normal">
                          {' '}
                          (you)
                        </span>
                      )}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {u.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.id === admin.id ? (
                      <span className="text-sm">{ROLE_LABELS[u.role]}</span>
                    ) : (
                      <SelectField
                        action={changeRoleAction.bind(null, u.id)}
                        id={`role-${u.id}`}
                        name="role"
                        label={`Role for ${u.name}`}
                        hideLabel
                        value={u.role}
                        options={ROLE_OPTIONS}
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.filed}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {u.role === 'user' ? (
                      <span className="text-muted-foreground">n/a</span>
                    ) : (
                      u.activeAssigned
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right text-xs">
                    {formatDateTime(u.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {total > rows.length && (
        <p className="text-muted-foreground text-sm">
          Showing {rows.length} of {total} users. Search to find someone else.
        </p>
      )}
    </div>
  );
}
