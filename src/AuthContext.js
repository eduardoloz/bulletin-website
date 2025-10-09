// src/AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check initial session
    const initSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) console.error('Error fetching session:', error.message);

      if (mounted) {
        setUser(data?.session?.user || null);
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user || null);
    });

    // Cleanup
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  // Login with Google (forces account selection every time)
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'consent' }, // force Google to ask for account selection
      },
    });
    if (error) console.error('Login error:', error.message);
  };

  // Logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error.message);
    setUser(null);           // reset state
    localStorage.clear();    // remove persisted session tokens
  };

  if (loading) return <div>Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => useContext(AuthContext);
