// main.js
import { getFeedback } from './feedback.js';
import MrLauder from './Personality.js';
 
// ── Render the bio card once on page load ──────────────────────
function renderBioCard() {
  const card = document.getElementById("bio-card");
 
  card.innerHTML = `
    <div class="bio-header">
      <img src="/avatars/mrLauder.png" alt="Mr. Lauder" class="bio-avatar" />
      <div class="bio-meta">
        <h2 class="bio-name">${MrLauder.name}</h2>
        <p class="bio-role">${MrLauder.role}</p>
      </div>
    </div>
    <p class="bio-description">
      Calm, precise, and methodical. Expects you to think before
      you type. Will never just hand you the answer.
    </p>
    <ul class="bio-rules">
      <li>Always explains the <em>why</em>, not just the fix</li>
      <li>Uses correct CS terminology</li>
      <li>Ends every reply with a Socratic question</li>
      <li>Will not write the solution for you</li>
    </ul>
  `;
}
 
// ── Wire up the submit button ───────────────────────────────────
const submitBtn   = document.getElementById("submit");
const contentArea = document.getElementById("content");
const output      = document.getElementById("output");
 
document.addEventListener("DOMContentLoaded", () => {
  renderBioCard();   // show Mr. L before anything else
});
 
submitBtn.addEventListener("click", async () => {
  const content = contentArea.value.trim();
  if (!content) return;
 
  output.textContent = "Mr. L is reviewing your work...";
  submitBtn.disabled = true;
 
  try {
    // No personality key — getFeedback always uses Mr. L
    const feedback = await getFeedback(content);
    output.textContent = feedback;
  } catch (err) {
    output.textContent = "Something went wrong. Please try again.";
    console.error(err);
  } finally {
    submitBtn.disabled = false;
  }
});
