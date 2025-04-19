const express = require('express');
const connectDB = require('./db');

const app = express();
connectDB();

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});
