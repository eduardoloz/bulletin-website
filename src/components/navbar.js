// src/components/Navbar.js
import React from 'react';
import { useAuth } from '../AuthContext';

const Navbar = () => {
  const { user, signOut } = useAuth();

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-semibold">
          {/* Show Home only if user is signed in */}
          {user && <a href="/" className="hover:text-gray-200">Home</a>}
        </div>
        <div className="space-x-4">
          <a href="/about" className="hover:text-gray-200">About Us</a>

          {/* Show login or logout depending on auth state */}
          {user ? (
            <button
              onClick={signOut}
              className="hover:text-gray-200 bg-blue-700 px-2 py-1 rounded"
            >
              Logout
            </button>
          ) : (
            <a href="/login" className="hover:text-gray-200">Login</a>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
