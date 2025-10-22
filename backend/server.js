import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

// Environment setup
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express configuration
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Start server immediately (no database connection needed)
startServer();

// Load professor data
const dataPath = path.resolve(__dirname, "../rmp/all_prof_comments.json");
const professorData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const professorLookup = Object.fromEntries(
  professorData.map(p => [p.prof_id, { name: p.prof_name, comments: p.comments }])
);

const professorList = professorData.map(p => ({
  prof_id: p.prof_id,
  prof_name: p.prof_name
}));

// OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Note: User authentication is now handled by Supabase on the frontend

function startServer() {
  // Health check endpoint
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Bulletin Website API Server',
      status: 'running',
      authentication: 'Supabase (frontend)',
      database: 'Supabase (frontend)',
      endpoints: ['/profs', '/chat', '/summary/:id'],
      note: 'Course management handled by Supabase directly'
    });
  });

  // Course management endpoints (Supabase will handle this)
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

  // Professor chatbot endpoints
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
    const { prof_id, question } = req.body;
    const professor = professorLookup[prof_id];
    
    if (!professor) {
      return res.status(404).json({ error: "Professor not found" });
    }

    try {
      const systemPrompt = `You are an assistant that answers questions using only these student comments about Professor ${professor.name} (id ${prof_id}):\n\n${professor.comments.slice(0, 40).map(c => `- ${c}`).join("\n")}\n\nProvide concise, student-friendly answers.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        temperature: 0.7,
        max_tokens: 200,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question }
        ]
      });

      res.json({ answer: completion.choices[0].message.content.trim() });
    } catch (err) {
      console.error("OpenAI error:", err);
      res.status(500).json({ error: "Chat request failed" });
    }
  });

  // Note: Authentication is now handled by Supabase on the frontend
  // No backend authentication endpoints needed

  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}