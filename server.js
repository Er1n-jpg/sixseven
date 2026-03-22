// server.js
// Run this file with: node server.js
// Then open http://localhost:3000 in your browser.
 
require('dotenv').config();          // loads .env into process.env
const express = require('express');
const path = require('path');
 
const app  = express();
const PORT = process.env.PORT || 3000;

const multer = require('multer');
const fs = require('fs');

const { extractSlidesFromPptx } = require('./extractSlides.js');
const { buildSlideSystemPrompt, buildSlideUserMessage } = require('./slidePrompts.js');

// Store uploads temporarily in /tmp/slide-uploads/
const UPLOAD_DIR = path.join(__dirname, 'tmp-uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: (parseInt(process.env.UPLOAD_SIZE_LIMIT_MB) || 15) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/pdf',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only .pptx and .pdf files are accepted'));
    }
  },
});

 
// ── Serve your website files from the public/ folder ─────────────
// When the browser requests index.html, main.js, styles.css etc.,
// Express finds the file in public/ and sends it back.
app.use(express.static(path.join(__dirname, 'public')));
 
// ── Parse incoming JSON request bodies ────────────────────────────
// Without this, req.body would be undefined when your frontend
// sends JSON to /api/feedback.
app.use(express.json());

function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.error('Cleanup failed:', e.message);
  }
}
 
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

// Then the route becomes just this — no prompt functions embedded inside it:
app.post('/api/review-slides', upload.single('slideFile'), async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!filePath) return res.status(400).json({ error: 'No file uploaded.' });
    if (!process.env.GROQ_API_KEY) return res.status(500).json({ error: 'API key not configured.' });

    let slides;
    try {
      slides = await extractSlidesFromPptx(filePath);
    } catch (extractErr) {
      console.error('Extraction error:', extractErr);
      return res.status(422).json({ error: 'Could not read the .pptx file. Make sure it is not password-protected.' });
    }

    if (slides.length === 0) return res.status(422).json({ error: 'No slides found in the file.' });
    if (slides.length > 40) return res.status(400).json({ error: `This deck has ${slides.length} slides. Please upload a deck with 40 slides or fewer.` });

    const systemPrompt = buildSlideSystemPrompt();
    const userMessage  = buildSlideUserMessage(slides);
    const max_tokens   = Math.min(4000, Math.max(1000, slides.length * 120));

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.SLIDE_REVIEW_MODEL || 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  },
        ],
        max_tokens,
        temperature: 0.6,
      }),
    });

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq error:', errText);
      return res.status(groqResponse.status).json({ error: 'AI service error. Try again shortly.' });
    }

    const data       = await groqResponse.json();
    const reviewText = data.choices?.[0]?.message?.content ?? null;
    if (!reviewText) return res.status(500).json({ error: 'AI returned an empty response.' });

    res.json({
      review:     reviewText,
      slideCount: slides.length,
      slides:     slides.map(s => ({ index: s.index, title: s.title })),
    });

  } catch (err) {
    console.error('Review route error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    if (filePath) cleanupFile(filePath);
  }
});
 
// Handle multer errors (file too large, wrong type)
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum size is ${process.env.UPLOAD_SIZE_LIMIT_MB || 15}MB.` });
  }
  if (err.message === 'Only .pptx and .pdf files are accepted') {
    return res.status(415).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Server error.' });
});

// ── Start the server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API key loaded: ${process.env.GROQ_API_KEY ? "YES" : "NO — check your .env file"}`);
});
