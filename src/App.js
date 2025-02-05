import React from 'react';
import logo from './logo.svg';
import './App.css';
import Navbar from './ components/navbar';
import Home from './pages/Home'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';
import Login from './pages/Login'

 
 
  function App() {
    return (
      <BrowserRouter>
        <div className="App">
          <Navbar /> {/* Include Navbar to allow navigation */}
          <img src={logo} className="App-logo" alt="logo" /> {/* Your logo */}
          
          {/* Define the routes for the Home and About pages */}
          <Routes>
            <Route path="/" element={<Home />} /> {/* Home Route */}
            <Route path="/about" element={<About />} /> {/* About Route */}
            <Route path="/login" element={<Login />} /> {/* Login Route */}
          </Routes>
        </div>
      </BrowserRouter>
    );
  }

export default App;
