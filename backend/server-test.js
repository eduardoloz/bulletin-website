import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment setup
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express configuration
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Load professor data (if available)
let professorData = [];
let professorLookup = {};
let professorList = [];

try {
  const dataPath = path.resolve(__dirname, "../rmp/all_prof_comments.json");
  professorData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
  
  professorLookup = Object.fromEntries(
    professorData.map(p => [p.prof_id, { name: p.prof_name, comments: p.comments }])
  );
  
  professorList = professorData.map(p => ({
    prof_id: p.prof_id,
    prof_name: p.prof_name
  }));
  
  console.log(`Loaded ${professorData.length} professors`);
} catch (error) {
  console.log('Professor data not found - chatbot endpoints will be disabled');
}

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ 
      message: 'Bulletin Website API Server',
      status: 'running',
      authentication: 'Supabase (frontend)',
      database: 'Supabase (frontend)',
      endpoints: ['/profs', '/chat', '/summary/:id'],
      note: 'Course management handled by Supabase directly',
      professorDataLoaded: professorData.length > 0
    });
});

// Professor chatbot endpoints (only if data is available)
if (professorData.length > 0) {
  app.get('/profs', (req, res) => {
    res.json(professorList);
  });

  app.get('/summary/:id', (req, res) => {
    const professor = professorLookup[req.params.id];
    if (!professor) {
      return res.status(404).json({ error: "Professor not found" });
    }

    // Extract keywords from comments
    const text = professor.comments.join(" ").toLowerCase();
    const words = text.match(/\b[a-z]{4,}\b/g) || [];
    const frequency = {};
    words.forEach(word => (frequency[word] = (frequency[word] || 0) + 1));

    const keywords = Object.entries(frequency)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    res.json({
      prof_id: req.params.id,
      prof_name: professor.name,
      sampleSize: professor.comments.length,
      keywords
    });
  });

  app.post('/chat', async (req, res) => {
    res.status(503).json({ 
      error: "Chat functionality requires OpenAI API key. Set OPENAI_API_KEY in .env file." 
    });
  });
} else {
  app.get('/profs', (req, res) => {
    res.status(503).json({ error: "Professor data not available" });
  });
  
  app.post('/chat', (req, res) => {
    res.status(503).json({ error: "Professor data not available" });
  });
}

// Course management endpoints (Supabase handles this)
app.get('/api/courses', (req, res) => {
  res.status(503).json({ 
    error: "Course management moved to Supabase. Use Supabase client directly from frontend." 
  });
});

app.post('/api/courses', (req, res) => {
  res.status(503).json({ 
    error: "Course management moved to Supabase. Use Supabase client directly from frontend." 
  });
});

  // Note: Authentication is now handled by Supabase on the frontend
  // No backend authentication endpoints needed

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}`);
  console.log(`Professor data loaded: ${professorData.length > 0 ? 'Yes' : 'No'}`);
});
