// main.js
import { getFeedback } from './feedback.js';
import MrLauder from './Personality.js';

import { submitSlideReview } from './slideReview.js';
import { parseReviewText, renderSlideCards, generateDownloadText } from './slideUI.js';

// ── Render the bio card once on page load ──────────────────────
// function renderBioCard() {
//   const card = document.getElementById("bio-card");

//   card.innerHTML = `
//     <div class="bio-header">
//       <img src="/avatars/mrLauder.png" alt="Mr. Lauder" class="bio-avatar" />
//       <div class="bio-meta">
//         <h2 class="bio-name">${MrLauder.name}</h2>
//         <p class="bio-role">${MrLauder.role}</p>
//       </div>
//     </div>
//     <p class="bio-description">
//       Calm, precise, and methodical. Expects you to think before
//       you type. Will never just hand you the answer.
//     </p>
//     <ul class="bio-rules">
//       <li>Always explains the <em>why</em>, not just the fix</li>
//       <li>Uses correct CS terminology</li>
//       <li>Ends every reply with a Socratic question</li>
//       <li>Will not write the solution for you</li>
//     </ul>
//   `;
// }

// document.addEventListener("DOMContentLoaded", () => {
//   renderBioCard();   // show Mr. L before anything else
// });

// ── Wire up the submit button ───────────────────────────────────

const chatContent = document.getElementById('chat-content');
const textInput = document.getElementById('text-input');
const submitBtn = document.getElementById('submit');
const scriptBtn = document.getElementById('script');

let script = false;

scriptBtn.addEventListener('click', function() {
  // Toggle the state variable
  script = !script;

  if (script){
    scriptBtn.style.backgroundColor = 'white';
  } else{
    scriptBtn.style.backgroundColor = '';
  }
});

// Tab switching — works with custom <btn> elements
const tabButtons = document.querySelectorAll('.tab-btn');
const chatPanel  = document.getElementById('tab-chat');
const slidePanel = document.getElementById('tab-slides');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;

    // Update active button
    tabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Show/hide panels directly by ID — more reliable than querySelectorAll
    if (target === 'chat') {
      chatPanel.classList.add('active');
      slidePanel.classList.remove('active');
    } else if (target === 'slides') {
      slidePanel.classList.add('active');
      chatPanel.classList.remove('active');
    }
  });
});

// Should log the two tab-btn elements
console.log('Tab buttons found:', document.querySelectorAll('.tab-btn').length);

// Should log the two panel divs
console.log('Chat panel:', document.getElementById('tab-chat'));
console.log('Slide panel:', document.getElementById('tab-slides'));

// File input
const fileInput        = document.getElementById('slide-file-input');
const fileNameDisplay  = document.getElementById('file-name-display');
const reviewBtn        = document.getElementById('review-btn');

let selectedFile = null;

fileInput.addEventListener('change', () => {
  selectedFile = fileInput.files[0] || null;
  if (selectedFile) {
    fileNameDisplay.textContent = `Selected: ${selectedFile.name} (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB)`;
    reviewBtn.disabled = false;
  } else {
    fileNameDisplay.textContent = '';
    reviewBtn.disabled = true;
  }
});

// Review Submission 

const loadingDiv     = document.getElementById('slide-review-loading');
const loadingMessage = document.getElementById('loading-message');
const resultsDiv     = document.getElementById('slide-review-results');
const slideCountLabel = document.getElementById('slide-count-label');
const downloadBtn    = document.getElementById('download-feedback-btn');

let lastParsedReview = null;
let lastFileName     = '';

reviewBtn.addEventListener('click', async () => {
  if (!selectedFile) return;

  // Reset UI state
  resultsDiv.style.display = 'none';
  document.getElementById('slide-cards-container').innerHTML = '';
  document.getElementById('overall-summary-card').style.display = 'none';

  loadingDiv.style.display = 'flex';
  reviewBtn.disabled       = true;
  loadingMessage.textContent = 'Reading your slides...';

  try {
    const result = await submitSlideReview(
      selectedFile,
      (msg) => { loadingMessage.textContent = msg; }  // Progress callback
    );

    const parsedReview = parseReviewText(result.review);
    lastParsedReview   = parsedReview;
    lastFileName       = selectedFile.name;

    renderSlideCards(parsedReview);

    slideCountLabel.textContent = `${result.slideCount} slides reviewed`;
    loadingDiv.style.display    = 'none';
    resultsDiv.style.display    = 'block';

    // Scroll to results
    resultsDiv.closest('.tab-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    loadingDiv.style.display = 'none';
    alert(`Error: ${err.message}`);  // Replace with a nicer in-UI error message if desired
  } finally {
    reviewBtn.disabled = false;
  }
});

// Download handler
downloadBtn.addEventListener('click', () => {
  if (!lastParsedReview) return;
  const text = generateDownloadText(lastParsedReview, lastFileName);
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `slide-review-${lastFileName.replace('.pptx', '')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── Clear the placeholder paragraphs from your HTML ──────────────
chatContent.innerHTML = '';

// Greet the student by name if one was provided on the welcome screen
const studentName = sessionStorage.getItem('studentName');
if (studentName) {
  appendMessage(
    MrLauder,
    `Helloooo ${studentName}!! I am an AI version of Mr Lauder, I can give you personalized feedback on your presentation, and help you cook it!! Above you can click to either record or upload your script, and upload a PDF version of your slides/presentation.`
  );
}

// ── Adds a message bubble to the chat ────────────────────────────
export function appendMessage(sender, text) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${sender}`; // 'user' or 'mrLauder'

  const bubble = document.createElement('p');
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatContent.appendChild(wrapper);

  // Auto-scroll to the latest message
  chatContent.scrollTop = chatContent.scrollHeight;
}

// ── Shows a typing indicator while waiting for the response ──────
function showTyping() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message mrLauder typing-indicator';
  wrapper.id = 'typing';
  wrapper.innerHTML = '<p>Mr. Lauder is thinking...</p>';
  chatContent.appendChild(wrapper);
  chatContent.scrollTop = chatContent.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typing');
  if (el) el.remove();
}

function getContext(html) {
  console.log(html);
  const container = document.createElement("div");
  container.innerHTML = html;

  const messages = container.querySelectorAll(".message");

  return [...messages].map(msg => {
    const role = msg.classList.contains("user") ? "user" : "Mr. Lauder(You)";

    return {
      role,
      content: msg.textContent.trim()
    };
  });
}

// ── Main send logic ───────────────────────────────────────────────
async function handleSubmit() {
  // Get user message
  const content = textInput.value.trim();
  if (!content) return;

  // Get context
  const context = (chatContent.innerHTML.length === 0) ? '' : getContext(chatContent.innerHTML)
  console.log("Context: " + context);

  appendMessage('user', content);
  textInput.value = "";
  submitBtn.disabled = true;

  showTyping();

  try{
    const feedback = await getFeedback(content, context, script);
    removeTyping();
    appendMessage(MrLauder, feedback);
  } catch (err) {
    removeTyping();
    appendMessage('system', "Something went wrong. Please try again.");
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    textInput.focus();
  }
}

submitBtn.addEventListener("click", handleSubmit);
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSubmit();
});

