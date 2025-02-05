// Login.js
import React, { useState } from 'react';

function Login() {
  // State to track the input values
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(''); // State to store the message

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevents the default form submission (page reload)

    // Check if username and password are provided (you can add more logic here)
    if (username === 'admin' && password === 'password') {
      setMessage('Login successful!');
    } else {
      setMessage('Invalid username or password.');
    }
  };

  return (
    <div className="login-page">
      <h1>Welcome to the Login Page!</h1>
      <p>Input your login info:</p>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)} // Update username on change
            required
          />
        </div>
        
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)} // Update password on change
            required
          />
        </div>
        
        <button type="submit">Login</button>
      </form>

      {/* Display the message if any */}
      {message && <p>{message}</p>}
    </div>
  );
}

export default Login;
