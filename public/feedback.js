// This file runs on NETLIFY'S SERVER — not in the browser.
// The API key is safe here.
import MrLauder from './Personality.js';
 
export async function getFeedback(content, context = "") {
  console.log('MrLauder object:', MrLauder);
  const systemPrompt = MrLauder.systemPrompt;
  const userMessage  = MrLauder.buildUserMessage(content, context);
 
  // /api/feedback hits your local Express server at localhost:3000
  // No change needed here — the URL works the same way locally.
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userMessage, max_tokens: 350 }),
  });
 
  if (!response.ok) throw new Error(`Server error: ${response.status}`);
 
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}
