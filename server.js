// server.js
// Run this file with: node server.js
// Then open http://localhost:3000 in your browser.
 
require('dotenv').config();          // loads .env into process.env
const express = require('express');
const path    = require('path');
 
const app  = express();
const PORT = process.env.PORT || 3000;
 
// ── Serve your website files from the public/ folder ─────────────
// When the browser requests index.html, main.js, styles.css etc.,
// Express finds the file in public/ and sends it back.
app.use(express.static(path.join(__dirname, 'public')));
 
// ── Parse incoming JSON request bodies ────────────────────────────
// Without this, req.body would be undefined when your frontend
// sends JSON to /api/feedback.
app.use(express.json());
 
// ── The feedback route — this is your secure API proxy ────────────
// This replaces the Netlify Function entirely.
// The browser calls POST /api/feedback  →  this function runs
// on YOUR computer  →  it calls Groq with your hidden API key.
app.post('/api/feedback', async (req, res) => {
  const { systemPrompt, userMessage, max_tokens = 350 } = req.body;
 
  // Basic validation
  if (!systemPrompt || !userMessage) {
    return res.status(400).json({ error: 'Missing systemPrompt or userMessage' });
  }
 
  // Make sure the API key is actually loaded
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set. Check your .env file.');
    return res.status(500).json({ error: 'API key not configured' });
  }
 
  try {
    // Call Groq — the API key comes from .env, never from the browser
    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json',}, 
        body: JSON.stringify({
          model:    process.env.AI_MODEL || "llama-3.1-8b-instant",
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userMessage  },
          ],
          max_tokens,
          temperature: 0.75,
        }),
      }
    );
 
    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq error:', errText);
      return res.status(response.status).json({ error: errText });
    }
 
    const data = await response.json();
    res.json(data);   // send the AI reply back to the browser
 
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
 
// ── Start the server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API key loaded: ${process.env.GROQ_API_KEY ? "YES" : "NO — check your .env file"}`);
});
