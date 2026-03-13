// main.js
import { getFeedback } from './feedback.js';
import MrLauder from './Personality.js';

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

// ── Clear the placeholder paragraphs from your HTML ──────────────
chatContent.innerHTML = '';

// ── Adds a message bubble to the chat ────────────────────────────
function appendMessage(sender, text) {
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
  const content = textInput.value.trim();
  if (!content) return;

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

