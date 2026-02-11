// Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, loading: authLoading, signOut, signingOut } = useAuth();

  // Dev log to confirm this Navbar file is the one being used by the running app
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Navbar] render', { user: user ? user.email : null });
  }

  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-semibold">
          <a href="/" className="hover:text-gray-200">Home</a>
        </div>
        <div className="space-x-4">
          <Link to="/about" className="hover:text-gray-200">About Us</Link>
          <Link to="/degree-progress" className="hover:text-gray-200">Degree Progress</Link>
          <Link to="/degree-progress-panel" className="hover:text-gray-200">Degree Panel</Link>
          <Link to="/cat" className="hover:text-gray-200">CatPage</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;