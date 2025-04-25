// server.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { OAuth2Client } from 'google-auth-library';

dotenv.config();
const app = express();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User schema
const User = mongoose.model('User', new mongoose.Schema({
  googleId: String,
  email: String,
  name: String,
  picture: String,
}));

// Auth route
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    // Verify the token with Google's OAuth2 client
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    // Check if the user exists in the database
    let user = await User.findOne({ googleId: sub });

    if (!user) {
      // If the user does not exist, create a new user
      user = await User.create({ googleId: sub, email, name, picture });
    }

    // Respond with the user info (or JWT if you want to implement it)
    res.json({ message: 'Login successful', user });
  } catch (error) {
    console.error('Error during Google OAuth:', error);
    res.status(400).json({ error: 'Invalid token or OAuth error' });
  }
});

// Start the server
app.listen(5000, () => console.log('Server running on port 5000'));
