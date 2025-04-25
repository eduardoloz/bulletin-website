import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Navbar from './components/navbar';
//import CourseGraph from './components/GraphComponent';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';

import LoginPage from './pages/LoginPAGE';
import Home from './pages/Home';

import Chatbot from "./components/chatbot";


function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} /> {/* this is the graph which is on the home page */}
          <Route path="/about" element={<About />} /> {/* About Route */}
          <Route path="/login" element={<LoginPage />} /> {/* Login Route */}
        </Routes>
      </div>
    </BrowserRouter>
  </GoogleOAuthProvider>
  );
}

export default App;