// Login.js
import Login from '../components/Login';
import React, { useState } from 'react';

function LoginPage() {
  // // State to track the input values
  // const [username, setUsername] = useState('');
  // const [password, setPassword] = useState('');
  // const [message, setMessage] = useState(''); // State to store the message

  // // Handle form submission
  // const handleSubmit = (e) => {
  //   e.preventDefault(); // Prevents the default form submission (page reload)

  //   // Check if username and password are provided (you can add more logic here)
  //   if (username === 'admin' && password === 'password') {
  //     setMessage('Login successful!');
  //   } else {
  //     setMessage('Invalid username or password.');
  //   }
  // };

  return (
    <div>
      <Login />
    </div>
  );
}

export default LoginPage;
