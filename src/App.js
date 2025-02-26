import React from 'react';
import './App.css';
import Navbar from './components/navbar';
import CourseGraph from './components/GraphComponent';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import About from './pages/About';
import Login from './pages/Login'

 
 
function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navbar /> 
        <Routes>
          <Route path="/" element={<CourseGraph />} /> {/* Home Route */}

          <Route path="/about" element={<About />} /> {/* About Route */}
          <Route path="/login" element={<Login />} /> {/* Login Route */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
