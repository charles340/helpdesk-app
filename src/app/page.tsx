import Link from 'next/link';
import {
  BookOpenIcon,
  ClockIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  LockKeyholeIcon,
  MessageSquareIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const features = [
  {
    icon: MessageSquareIcon,
    title: 'One shared queue',
    text: 'Requesters file tickets and follow the replies. Agents work one queue with filters and search.',
  },
  {
    icon: ClockIcon,
    title: 'SLA deadlines',
    text: 'Each ticket gets a deadline from its priority. The queue warns when a ticket has a quarter of its time left, and again when it is late.',
  },
  {
    icon: LockKeyholeIcon,
    title: 'Internal notes',
    text: "Agents can leave notes on a ticket that the requester never sees. The notes are left out of the requester's database query, not just hidden on screen.",
  },
  {
    icon: ShieldCheckIcon,
    title: 'Roles and history',
    text: 'Requesters see their own tickets, agents see all of them, and admins manage roles. Each ticket logs who changed its status, priority or assignee.',
  },
  {
    icon: LayoutDashboardIcon,
    title: 'Dashboard',
    text: 'Agents see which tickets are late, how many each person has, and how many were solved on time in the last 30 days.',
  },
  {
    icon: BookOpenIcon,
    title: 'Knowledge base',
    text: 'Agents write up fixes for common problems in Markdown, so requesters can try them before filing a ticket.',
  },
];

const demoAccounts = [
  ['Requester', 'luka@example.com'],
  ['Agent', 'ana@example.com'],
  ['Admin', 'admin@example.com'],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16 sm:px-6">
      <section className="flex flex-col items-start gap-6">
        <div className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
          <LifeBuoyIcon className="text-primary size-5" />
          Deskline
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          A helpdesk for small IT teams
        </h1>
        <p className="text-muted-foreground max-w-2xl text-lg">
          File a problem, track it against an SLA, talk it through, and keep
          the fix in a knowledge base.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/sign-in" className={buttonVariants({ size: 'lg' })}>
            Sign in to the demo
          </Link>
          <Link
            href="/sign-up"
            className={buttonVariants({ size: 'lg', variant: 'outline' })}
          >
            Create an account
          </Link>
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex flex-col gap-2">
            <Icon className="text-primary size-5" />
            <h2 className="font-medium">{title}</h2>
            <p className="text-muted-foreground text-sm">{text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="font-medium">Demo accounts</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Run <code className="font-mono">bun run db:seed</code> first. Every
          account uses the password{' '}
          <code className="font-mono">deskline-demo</code>.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {demoAccounts.map(([role, email]) => (
            <div key={email} className="bg-muted rounded-lg px-3 py-2">
              <dt className="text-muted-foreground">{role}</dt>
              <dd className="font-mono">{email}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
