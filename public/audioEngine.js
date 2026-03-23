/**
 * audioEngine.js
 * ─────────────────────────────────────────────────────────────
 * Scans Mr. Lauder's AI responses for keywords and plays the
 * correlated audio clip(s). Multiple matches are queued and
 * played sequentially so clips never overlap.
 *
 * USAGE (in main.js):
 *   import { scanAndPlay } from './audioEngine.js';
 *   // After appending Mr. Lauder's response to the chat:
 *   scanAndPlay(responseText);
 *
 * TO ADD NEW KEYWORDS:
 *   Add an entry to KEYWORD_MAP below.
 *   Drop the .mp3/.wav file into public/audio/.
 * ─────────────────────────────────────────────────────────────
 */

// ─── 1. KEYWORD → AUDIO MAP ──────────────────────────────────
//
// Each entry maps one or more keyword PATTERNS (strings or
// regular expressions) to a single audio file path.
//
// • String patterns are matched case-insensitively anywhere in
//   the response text.
// • Regex patterns give you full control (word boundaries, etc.)
// • A response can match MULTIPLE entries — all matched clips
//   are queued and played one after the other.
// • Only the FIRST matching keyword in each entry fires it once,
//   even if the keyword appears multiple times in the response.
//
const KEYWORD_MAP = [
  {
    // Fired when Mr. Lauder expresses approval / excitement
    keywords: ['yes, excellent', 'yes excellent', 'excellent!', 'excellent work', 'well done'],
    audio: '/audio/yes-excellent.mp3',
    label: 'Yes, Excellent!',
  },
  {
    // Pain / exasperation sound
    keywords: ['ahh', 'ahhh', /\bugh\b/, /\boh no\b/],
    audio: '/audio/ahh.mp3',
    label: 'Ahh!',
  },
  {
    // Encouragement / positive nudge
    keywords: ['good question', 'great question', 'interesting question'],
    audio: '/audio/good-question.mp3',
    label: 'Good Question',
  },
  {
    // Disappointment / try-harder signal
    keywords: ['not quite', 'not quite right', "that's not right", 'incorrect', 'wrong approach'],
    audio: '/audio/not-quite.mp3',
    label: 'Not Quite',
  },
  {
    // Thinking / pondering pause
    keywords: [/\bhmm+\b/i, 'let me think', 'interesting…', 'interesting...'],
    audio: '/audio/hmm.mp3',
    label: 'Hmm…',
  },
  // ── Add more entries here following the same pattern ────────
  // {
  //   keywords: ['congratulations', 'perfect score'],
  //   audio: '/audio/congrats.mp3',
  //   label: 'Congratulations',
  // },
];

// ─── 2. INTERNAL PLAYBACK QUEUE ──────────────────────────────
//
// We maintain a simple FIFO queue of Audio objects.
// When a clip finishes, the next one starts automatically.
// This prevents clips from overlapping when multiple keywords
// are detected in a single response.
//
let _queue = [];
let _isPlaying = false;

function _enqueue(audioSrc, label) {
  const audio = new Audio(audioSrc);
  audio._label = label;
  _queue.push(audio);
}

function _playNext() {
  if (_queue.length === 0) {
    _isPlaying = false;
    return;
  }
  _isPlaying = true;
  const audio = _queue.shift();

  console.log(`[audioEngine] ▶ Playing: ${audio._label} (${audio.src})`);

  audio.play().catch(err => {
    // Autoplay was blocked (common on first interaction) — log and skip
    console.warn(`[audioEngine] Autoplay blocked for "${audio._label}":`, err.message);
    _playNext(); // move to next clip in queue
  });

  audio.addEventListener('ended', _playNext, { once: true });
  audio.addEventListener('error', () => {
    console.error(`[audioEngine] Failed to load audio: ${audio.src}`);
    _playNext();
  }, { once: true });
}

// ─── 3. KEYWORD SCANNER ──────────────────────────────────────
//
// Scans a response string against every entry in KEYWORD_MAP.
// For each entry where ANY keyword matches, the audio is queued
// exactly once (even if multiple keywords from that entry match,
// or the same keyword appears many times in the text).
//
function _findMatches(responseText) {
  const lowerText = responseText.toLowerCase();
  const matched = [];

  for (const entry of KEYWORD_MAP) {
    let entryMatched = false;

    for (const pattern of entry.keywords) {
      if (entryMatched) break; // only queue this clip once

      if (typeof pattern === 'string') {
        // Simple substring match, case-insensitive
        if (lowerText.includes(pattern.toLowerCase())) {
          entryMatched = true;
        }
      } else if (pattern instanceof RegExp) {
        // Full regex match — add 'i' flag if not already present
        const re = pattern.flags.includes('i')
          ? pattern
          : new RegExp(pattern.source, pattern.flags + 'i');
        if (re.test(responseText)) {
          entryMatched = true;
        }
      }
    }

    if (entryMatched) {
      matched.push({ audio: entry.audio, label: entry.label });
    }
  }

  return matched;
}

// ─── 4. PUBLIC API ───────────────────────────────────────────

/**
 * scanAndPlay(responseText)
 *
 * Call this after every Mr. Lauder response is rendered.
 * It scans the text, queues all matching audio clips, and
 * starts playback if nothing is currently playing.
 *
 * @param {string} responseText  The full text of Mr. Lauder's response.
 */
export function scanAndPlay(responseText) {
  if (!responseText || typeof responseText !== 'string') return;

  const matches = _findMatches(responseText);

  if (matches.length === 0) return;

  console.log(`[audioEngine] Detected ${matches.length} keyword match(es):`,
    matches.map(m => m.label).join(', '));

  // Enqueue all matched clips
  for (const match of matches) {
    _enqueue(match.audio, match.label);
  }

  // Start playback only if not already playing
  if (!_isPlaying) {
    _playNext();
  }
  // If already playing, the new clips sit in the queue and will
  // play automatically when the current clip ends.
}

/**
 * stopAll()
 *
 * Immediately clears the queue and stops any current playback.
 * Useful for tab switches or page resets.
 */
export function stopAll() {
  _queue = [];
  _isPlaying = false;
  // Note: the currently-playing Audio element will finish its
  // current frame and then _playNext() will find an empty queue.
}

/**
 * preloadAudio()
 *
 * Optional — call once on app startup to pre-fetch all audio
 * files so the first playback has no buffering delay.
 */
export function preloadAudio() {
  for (const entry of KEYWORD_MAP) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = entry.audio;
  }
  console.log(`[audioEngine] Preloaded ${KEYWORD_MAP.length} audio file(s).`);
}