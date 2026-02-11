import React from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './App.css';
import Navbar from './components/navbar';
//import CourseGraph from './components/GraphComponent';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';

import LoginPage from './pages/LoginPAGE';
import Home from './pages/Home';
import CatPage from './pages/CatPage';
import DegreeProgress1 from './components/DegreeProgress1';
import DegreeProgressPage from './pages/DegreeProgressPage';
import DegreeProgressPanel from './pages/DegreeProgressPanel';
import { useAuth } from './hooks/useAuth';


function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/degree-progress" element={<DegreeProgressPage />} />
          <Route path="/degree-progress-panel" element={<DegreeProgressPanel />} />
          <Route path="/about" element={<About />} />
          <Route path="/cat" element={<CatPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;