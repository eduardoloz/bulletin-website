// Navbar.js
import React from 'react';

const Navbar = () => {
  return (
    <nav className="bg-blue-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-semibold">
          <a href="/" className="hover:text-gray-200">Home</a>
        </div>
        <div className="space-x-4">
          <a href="/about" className="hover:text-gray-200">About Us</a>
          <a href="/login" className="hover:text-gray-200">Login</a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;