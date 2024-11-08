import React, { useState } from 'react';
import Navbar from './ components/navbar.js';
import Home from './pages/home.js';
import About from './pages/about';
import Login from './pages/login';

function App() {
  const [currentPage, setCurrentPage] = useState('home'); // 'home' is the default page

  // Function to render the current page based on state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'about':
        return <About />;
      case 'login':
        return <Login />;
      default:
        return <Home />;
    }
  };

  return (
    <div>
      <Navbar setCurrentPage={setCurrentPage} />
      <div className="p-8">
        {renderPage()} {/* This will render the current page based on state */}
      </div>
    </div>
  );
}

export default App;