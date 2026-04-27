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

const AUTH_INIT_TIMEOUT_MS = 7000;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const timeoutId = window.setTimeout(() => {
      if (!isMounted) return;
      console.warn('Supabase auth initialization timed out. Continuing without a session.');
      setLoading(false);
    }, AUTH_INIT_TIMEOUT_MS);

    async function initializeSession() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setError(null);
      } catch (authError) {
        if (!isMounted) return;
        console.error('Failed to initialize auth session:', authError);
        setSession(null);
        setUser(null);
        setError(authError);
      } finally {
        window.clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeSession();

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      window.clearTimeout(timeoutId);
      setSession(session);
      setUser(session?.user ?? null);
      setError(null);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      isMounted = false;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
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
    error,
    signOut,
    signingOut,
  };
}
