// src/components/LogoutButton.js
import React from 'react';
import { useAuth } from '../AuthContext';

export default function LogoutButton() {
  const { signOut } = useAuth(); // Get the logout function from context

  const handleLogout = async () => {
    await signOut(); // Clears the user session
    // Optionally, you can redirect the user after logout
    window.location.href = '/login';
  };

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      Logout
    </button>
  );
}
