'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';

export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const signUp = mode === 'sign-up';

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));

    setPending(true);
    setError(null);
    const { error } = signUp
      ? await authClient.signUp.email({
          email,
          password,
          name: String(form.get('name')),
        })
      : await authClient.signIn.email({ email, password });
    setPending(false);

    if (error) {
      setError(error.message ?? 'Something went wrong. Please try again.');
      return;
    }
    router.push('/tickets');
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{signUp ? 'Create an account' : 'Sign in'}</CardTitle>
        <CardDescription>
          {signUp
            ? 'New accounts can file and follow their own tickets.'
            : 'Use a demo account or one you created.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {signUp && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" autoComplete="name" required />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={signUp ? 'new-password' : 'current-password'}
              minLength={8}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Please wait…' : signUp ? 'Create account' : 'Sign in'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {signUp ? 'Already have an account? ' : 'New here? '}
            <Link
              href={signUp ? '/sign-in' : '/sign-up'}
              className="text-foreground underline underline-offset-4"
            >
              {signUp ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
