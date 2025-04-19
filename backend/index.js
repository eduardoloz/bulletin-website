require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const Freelancer = require('./models/Freelancer');

const app = express();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Error connecting to MongoDB Atlas:', err));

const importData = async () => {
  try {
    const data = JSON.parse(fs.readFileSync('./freelancers.json', 'utf-8'));
    await Freelancer.insertMany(data);
    console.log('Data successfully imported');
    process.exit();
  } catch (error) {
    console.error('Error importing data:', error);
    process.exit(1);
  }
};

importData();

app.listen(5000, () => {
  console.log('🚀 Server running on http://localhost:5000');
});
