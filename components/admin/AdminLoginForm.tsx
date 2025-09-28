'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowserClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const redirectTarget = useMemo(() => {
    const redirectParam = searchParams.get('redirect');
    if (redirectParam && redirectParam.startsWith('/')) {
      return redirectParam;
    }
    return '/admin';
  }, [searchParams]);

  const reason = searchParams.get('reason');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.push(redirectTarget);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {reason === 'signin' && (
        <p className="rounded-2xl border border-sand-200 bg-sand-50 px-4 py-3 text-xs text-sand-700">
          Please sign in to continue to the admin area.
        </p>
      )}
      {reason === 'unauthorized' && (
        <p className="rounded-2xl border border-lava-200 bg-lava-50 px-4 py-3 text-xs text-lava-600">
          Your account does not have admin access. Try another login or contact the site owner.
        </p>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="admin@kekoolani.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required />
      </div>
      {error && <p className="text-sm text-lava-400">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
    </form>
  );
}
