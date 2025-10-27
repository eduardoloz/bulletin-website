/**
 * useAuth Hook - Auth State Layer
 *
 * Manages authentication state for the entire app.
 * Subscribes to Supabase auth changes and provides current user state.
 *
 * Usage:
 *   const { user, session, loading, signOut } = useAuth();
 *
 * Returns:
 *   - user: Current user object (null if not logged in)
 *   - session: Current session object (null if not logged in)
 *   - loading: Boolean indicating if auth state is being determined
 *   - signOut: Function to sign out the current user
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  // Sign out helper
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    loading,
    signOut,
  };
}