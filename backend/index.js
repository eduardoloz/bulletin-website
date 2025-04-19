const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db'); // ✅ make sure this matches your file structure
const { getAllCourses, addCourse } = require('./collections/major');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to the database first, then start the server
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected');

    // GET all courses
    app.get('/api/courses', async (req, res) => {
      try {
        const courses = await getAllCourses();
        res.json(courses);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // POST a new course
    app.post('/api/courses', async (req, res) => {
      try {
        const result = await addCourse(req.body);
        res.status(201).json(result);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err);
  });