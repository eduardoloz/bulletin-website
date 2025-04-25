/**
 * index1.js  –  RMP chatbot back‐end with name lookup
 * ES-module version (uses `import` / `export`)
 * No MongoDB; just summary, chat, and prof list endpoints.
 */

import express               from "express";
import cors                  from "cors";
import dotenv                from "dotenv";
import fs                    from "fs";
import path                  from "path";
import { fileURLToPath }     from "url";
import { OpenAI }            from "openai";

// ─── polyfill __dirname & __filename ───────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── load environment variables ─────────────────────────────────────
dotenv.config();  // expects OPENAI_API_KEY in backend/.env

// ─── Express setup ─────────────────────────────────────────────────
const app  = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ─── load all professor comments once ───────────────────────────────
const dataPath = path.resolve(__dirname, "../rmp/all_prof_comments.json");
const DATA     = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

// build quick lookups
const byId = Object.fromEntries(
  DATA.map(p => [p.prof_id, { name: p.prof_name, comments: p.comments }])
);

const profList = DATA.map(p => ({
  prof_id:   p.prof_id,
  prof_name: p.prof_name
}));

// ─── OpenAI client ───────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── GET /profs  – list of all professors (for autocomplete) ────────
app.get("/profs", (_, res) => {
  res.json(profList);
});

// ─── GET /summary/:id ────────────────────────────────────────────────
app.get("/summary/:id", (req, res) => {
  const p = byId[req.params.id];
  if (!p) return res.status(404).json({ error: "professor not found" });

  // simple keyword extraction
  const text  = p.comments.join(" ").toLowerCase();
  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  const freq  = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));

  const keywords = Object.entries(freq)
    .sort(([,a],[,b]) => b - a)
    .slice(0,5)
    .map(([word]) => word);

  res.json({
    prof_id:    req.params.id,
    prof_name:  p.name,
    sampleSize: p.comments.length,
    keywords
  });
});

// ─── POST /chat ─────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { prof_id, question } = req.body;
  const p = byId[prof_id];
  if (!p) return res.status(404).json({ error: "professor not found" });

  try {
    const systemPrompt = `
You are an assistant that answers questions using only these student comments
about Professor ${p.name} (id ${prof_id}):

${p.comments.slice(0,40).map(c => `- ${c}`).join("\n")}

Provide concise, student-friendly answers.`;

    const completion = await openai.chat.completions.create({
      model:       "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens:  200,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: question     }
      ]
    });

    res.json({ answer: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error("OpenAI error:", err);
    res.status(500).json({ error: "LLM request failed" });
  }
});

// ─── start the server ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🎉 RMP chatbot server listening on http://localhost:${PORT}`);
});
