/**
 * LoginPage - Authentication Gate
 *
 * Displays a login interface for users to authenticate.
 * Uses Supabase Auth UI for email/password and OAuth providers (Google, GitHub).
 */

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../supabaseClient';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            CSE Course Planner
          </h1>
          <p className="text-gray-600">
            Sign in with Google to save your progress
          </p>
        </div>

        {/* Auth UI Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#3b82f6',
                    brandAccent: '#2563eb',
                  },
                },
              },
            }}
            providers={['google']}
            onlyThirdPartyProviders={true}
            redirectTo={window.location.origin}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-600">
          <p>By signing in, you agree to save your course selections</p>
        </div>
      </div>
    </div>
  );
}
