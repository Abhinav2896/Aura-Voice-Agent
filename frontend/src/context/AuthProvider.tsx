'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { PatientProfile } from '@/lib/types';
import { getMyProfile } from '@/lib/services/patientService';

interface AuthContextType {
  user: User | null;
  profile: PatientProfile | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchProfile = useCallback(async () => {
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch (err) {
      console.warn('[AuthProvider] Could not fetch patient profile:', err);
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile();
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Immediately populate preliminary profile from user_metadata so UI renders in <10ms
          const meta = currentUser.user_metadata || {};
          setProfile({
            id: currentUser.id,
            full_name: meta.full_name || '',
            phone: meta.phone || '',
            dob: meta.dob || '',
            address: '',
            nominated_pharmacy: '',
            created_at: currentUser.created_at,
          });
        }
      } catch (err) {
        console.error('[AuthProvider] Auth init error:', err);
      } finally {
        // Unblock UI immediately — never block LCP waiting for backend cold-start!
        if (mounted) setIsLoading(false);
      }

      // Non-blocking background profile synchronization
      if (mounted) {
        fetchProfile();
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const meta = currentUser.user_metadata || {};
        setProfile((prev) => prev || {
          id: currentUser.id,
          full_name: meta.full_name || '',
          phone: meta.phone || '',
          dob: meta.dob || '',
          address: '',
          nominated_pharmacy: '',
          created_at: currentUser.created_at,
        });
        setIsLoading(false);
        // Non-blocking background sync
        fetchProfile();
      } else {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
