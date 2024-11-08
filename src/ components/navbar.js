import React from 'react';

const Navbar = ({ setCurrentPage }) => {
  return (
    <nav className="bg-blue-500 p-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="text-white text-2xl font-bold">
          <button onClick={() => setCurrentPage('home')}>STONY BROOK UNDERGRADUATE BULLETIN</button>
        </div>
        <div className="space-x-6">
          <button onClick={() => setCurrentPage('home')} className="text-white hover:text-gray-200">Home</button>
          <button onClick={() => setCurrentPage('about')} className="text-white hover:text-gray-200">About</button>
          <button onClick={() => setCurrentPage('login')} className="text-white hover:text-gray-200">Login</button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
