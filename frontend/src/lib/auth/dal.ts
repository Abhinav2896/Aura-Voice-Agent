import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export const verifySession = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { isAuth: false, user: null };
  }

  return { isAuth: true, user };
});

export const getUser = cache(async () => {
  const session = await verifySession();
  return session.user;
});
