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
  const [signingOut, setSigningOut] = useState(false);

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
    // Prevent multiple simultaneous sign-out calls
    if (signingOut) return;

    setSigningOut(true);

    try {
      // Call Supabase sign out first (this triggers onAuthStateChange)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      // Silently ignore 403 errors (session already invalid)
      // Only log unexpected errors
      if (error?.status !== 403 && error?.code !== '403') {
        console.log('Sign out error:', error.message);
      }
    }

    // Clear local state (in case the listener didn't fire)
    setUser(null);
    setSession(null);
    setSigningOut(false);

    // Force reload to ensure clean state
    window.location.href = '/';
  };

  return {
    user,
    session,
    loading,
    signOut,
    signingOut,
  };
}