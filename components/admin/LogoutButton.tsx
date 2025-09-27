'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowserClient';
import { Button } from '@/components/ui/button';

export default function LogoutButton() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.push('/admin-login');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="border border-slate-300 text-slate-700 shadow-sm"
      loading={loading}
      onClick={handleSignOut}
    >
      Log Out
    </Button>
  );
}
