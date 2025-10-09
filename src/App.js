import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Navbar from './components/navbar'; // Make sure folder/file capitalization matches
import { BrowserRouter, Routes, Route } from "react-router-dom";

import About from './pages/About';
import Home from './pages/Home';
import Login from './components/Login'; // Supabase login
import ProtectedRoute from './ProtectedRoute';
import Chatbot from "./components/chatbot";

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <div className="App">
          <Navbar />
          <Routes>
            {/* Protected Home page */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />

            {/* Public routes */}
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/chatbot" element={<Chatbot />} />
          </Routes>
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
