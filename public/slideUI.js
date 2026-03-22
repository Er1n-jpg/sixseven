/**
 * slideUI.js
 * Parses the AI's text response and renders it as visual slide cards.
 */

/**
 * Parses the raw AI review text into an array of slide objects.
 * Expects the format defined in the system prompt:
 *   SLIDE N: Title
 *   OBSERVATION: ...
 *   ISSUES: ...
 *   SUGGESTION: ...
 *   PRIORITY: High/Medium/Low
 */
export function parseReviewText(reviewText) {
  const slideBlocks = [];
  let overallSummary   = '';
  let socraticQuestion = '';

  // Split on the --- separator between slides
  const blocks = reviewText.split(/^---+$/m).map(b => b.trim()).filter(Boolean);

  for (const block of blocks) {
    if (block.startsWith('OVERALL SUMMARY:')) {
      overallSummary = block.replace('OVERALL SUMMARY:', '').trim();
      continue;
    }
    if (block.startsWith('SOCRATIC QUESTION:')) {
      socraticQuestion = block.replace('SOCRATIC QUESTION:', '').trim();
      continue;
    }

    // Parse a slide block
    const slideMatch = block.match(/^SLIDE\s+(\d+):\s*(.*)$/m);
    if (!slideMatch) continue;

    const index       = parseInt(slideMatch[1]);
    const title       = slideMatch[2].replace(/^"|"$/g, '').trim() || `Slide ${index}`;
    const observation = extractField(block, 'OBSERVATION');
    const issues      = extractField(block, 'ISSUES');
    const suggestion  = extractField(block, 'SUGGESTION');
    const priority    = extractField(block, 'PRIORITY') || 'Medium';

    slideBlocks.push({ index, title, observation, issues, suggestion, priority });
  }

  // Also handle OVERALL SUMMARY and SOCRATIC QUESTION if they appear inline
  const summaryMatch   = reviewText.match(/OVERALL SUMMARY:\s*([\s\S]*?)(?=SOCRATIC QUESTION:|$)/);
  const socraticMatch  = reviewText.match(/SOCRATIC QUESTION:\s*([\s\S]*?)$/);
  if (summaryMatch && !overallSummary)   overallSummary   = summaryMatch[1].trim();
  if (socraticMatch && !socraticQuestion) socraticQuestion = socraticMatch[1].trim();

  return { slides: slideBlocks, overallSummary, socraticQuestion };
}

/** Extracts the value of a labelled field from a block of text */
function extractField(block, fieldName) {
  const regex = new RegExp(`${fieldName}:\\s*([^\\n]+(?:\\n(?!\\w+:)[^\\n]*)*)`, 'i');
  const match = block.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Renders parsed slide review data into the #slide-cards-container element.
 */
export function renderSlideCards(parsedReview) {
  const container = document.getElementById('slide-cards-container');
  container.innerHTML = '';

  for (const slide of parsedReview.slides) {
    const card = document.createElement('div');
    card.className = `slide-card priority-${slide.priority.toLowerCase()}`;

    card.innerHTML = `
      <div class="slide-card-header">
        <span class="slide-number">Slide ${slide.index}</span>
        <span class="slide-title">${escapeHtml(slide.title)}</span>
        <span class="priority-badge priority-${slide.priority.toLowerCase()}">${slide.priority}</span>
      </div>
      <div class="slide-card-body">
        ${slide.observation ? `<div class="field"><span class="field-label">Observation</span><p>${escapeHtml(slide.observation)}</p></div>` : ''}
        ${slide.issues      ? `<div class="field"><span class="field-label">Issues</span><p>${escapeHtml(slide.issues)}</p></div>`      : ''}
        ${slide.suggestion  ? `<div class="field suggestion-field"><span class="field-label">Suggestion</span><p>${escapeHtml(slide.suggestion)}</p></div>` : ''}
      </div>
    `;

    container.appendChild(card);
  }

  // Show overall summary
  if (parsedReview.overallSummary || parsedReview.socraticQuestion) {
    document.getElementById('overall-summary-text').textContent    = parsedReview.overallSummary;
    document.getElementById('socratic-question-text').textContent  = parsedReview.socraticQuestion;
    document.getElementById('overall-summary-card').style.display  = 'block';
  }
}

/** Prevents XSS — always escape user-derived or AI-derived content before innerHTML */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Generates a plain text version of the review for download.
 */
export function generateDownloadText(parsedReview, fileName) {
  const lines = [`Mr. Lauder's Slide Review — ${fileName}`, '='.repeat(50), ''];

  for (const s of parsedReview.slides) {
    lines.push(`SLIDE ${s.index}: ${s.title}`);
    lines.push(`PRIORITY: ${s.priority}`);
    if (s.observation) lines.push(`OBSERVATION: ${s.observation}`);
    if (s.issues)      lines.push(`ISSUES: ${s.issues}`);
    if (s.suggestion)  lines.push(`SUGGESTION: ${s.suggestion}`);
    lines.push('');
  }

  if (parsedReview.overallSummary) {
    lines.push('OVERALL SUMMARY');
    lines.push(parsedReview.overallSummary);
    lines.push('');
  }
  if (parsedReview.socraticQuestion) {
    lines.push("MR. LAUDER'S QUESTION FOR YOU");
    lines.push(parsedReview.socraticQuestion);
  }

  return lines.join('\n');
}