// Navbar.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, loading: authLoading, signOut } = useAuth();

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="text-lg font-semibold">
            <a href="/" className="hover:text-gray-200">Home</a>
          </div>

          {/* Auth Status - Inline with Home */}
          {!authLoading && user && (
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm font-medium">
                  {user.email}
                </span>
              </div>
              <button
                onClick={signOut}
                className="text-xs px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="space-x-4">
          <a href="/about" className="hover:text-gray-200">About Us</a>
          <a href="/cat" className="hover:text-gray-200">CatPage</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;