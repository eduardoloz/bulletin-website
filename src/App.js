import React from 'react';
import './App.css';
import Navbar from './components/navbar';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';
import LoginPage from './pages/LoginPAGE';
import Home from './pages/Home';
import CatPage from './pages/CatPage';
import ChatBotPage from './pages/ChatBotPage';
import DegreeProgressPage from './pages/DegreeProgressPage';
import { useAuth } from './hooks/useAuth';


function App() {
  const { user, loading } = useAuth();

  // TEMPORARY: Allow /chatbot route without authentication for testing
  // You can remove this later when you set up Google OAuth
  return (
    <BrowserRouter>
      <Routes>
        {/* Chatbot route - accessible without login */}
        <Route path="/chatbot" element={<ChatBotPage />} />

        {/* All other routes require authentication */}
        <Route path="*" element={
          loading ? (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600">Loading...</p>
              </div>
            </div>
          ) : !user ? (
            <LoginPage />
          ) : (
            <div className="App">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/degree-progress" element={<DegreeProgressPage />} />
                <Route path="/about" element={<About />} />
                <Route path="/cat" element={<CatPage />} />
              </Routes>
            </div>
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
