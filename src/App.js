import React from 'react';
import './App.css';
import Navbar from './components/navbar';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';
import LoginPage from './pages/LoginPAGE';
import Home from './pages/Home';
import CatPage from './pages/CatPage';
import { useAuth } from './hooks/useAuth';

function App() {
  const { user, loading } = useAuth();

  // Loading state - checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login page only
  if (!user) {
    return <LoginPage />;
  }

  // Authenticated - show full app
  return (
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/cat" element={<CatPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
