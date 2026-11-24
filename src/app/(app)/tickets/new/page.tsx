import type { Metadata } from 'next';
import Link from 'next/link';
import { NewTicketForm } from '@/components/tickets/new-ticket-form';
import { requireUser } from '@/lib/session';

export const metadata: Metadata = { title: 'New ticket' };

export default async function NewTicketPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">New ticket</h1>
        <p className="text-sm text-muted-foreground">
          Tell us what went wrong. Common fixes are in the{' '}
          <Link href="/kb" className="text-foreground underline underline-offset-4">
            knowledge base
          </Link>
          .
        </p>
      </header>
      <NewTicketForm />
    </div>
  );
}
