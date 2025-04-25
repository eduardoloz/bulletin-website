// backend/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // <-- Load .env file

const MONGO_URI = process.env.MONGO_URI;

let db;

async function connectDB() {
  if (!MONGO_URI) {
    throw new Error('❌ MONGO_URI is not defined in .env');
  }

  const conn = await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
     dbName: 'class_information'
  });

  db = conn.connection.db;
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('❌ DB not initialized. Call connectDB() first.');
  }
  return db;
}

module.exports = { connectDB, getDB };