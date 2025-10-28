/**
 * Supabase Client - Foundation Layer
 *
 * Single source of truth for Supabase connection.
 * Import this wherever you need database or auth access.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Helpful warning for development
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    ':( Supabase credentials not found.\n' +
    'Create a .env file in the project root with:\n' +
    '  REACT_APP_SUPABASE_URL=your-project-url\n' +
    '  REACT_APP_SUPABASE_ANON_KEY=your-anon-key'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');