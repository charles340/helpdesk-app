import Link from 'next/link';
import { Suspense } from 'react';
import { LifeBuoyIcon } from 'lucide-react';
import { AppNav } from '@/components/app-nav';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b p-4 md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <Link href="/tickets" className="flex items-center gap-2 font-medium">
          <LifeBuoyIcon className="size-5 text-primary" />
          Deskline
        </Link>
        {/* The nav depends on who is signed in, so it streams in. */}
        <Suspense fallback={<NavSkeleton />}>
          <AppNav />
        </Suspense>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );
}
