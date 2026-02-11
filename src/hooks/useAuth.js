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
  // Development bypass: set REACT_APP_SKIP_SUPABASE_AUTH=true in .env
  // to skip contacting Supabase and provide a mock user for local dev.
  const skipAuth = process.env.REACT_APP_SKIP_SUPABASE_AUTH === 'true';

  const [user, setUser] = useState(skipAuth ? { id: 'dev', email: 'dev@example.com' } : null);
  const [session, setSession] = useState(skipAuth ? { user: { id: 'dev', email: 'dev@example.com' } } : null);
  const [loading, setLoading] = useState(skipAuth ? false : true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // If bypassing auth, skip Supabase calls
    if (skipAuth) return;

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
  }, [skipAuth]);

  // Sign out helper
  const signOut = async () => {
    // Prevent multiple simultaneous sign-out calls
    if (signingOut) return;

    setSigningOut(true);

    if (!skipAuth) {
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