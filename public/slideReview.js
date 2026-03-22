/**
 * slideReview.js
 * Sends a .pptx file to /api/review-slides and returns the structured response.
 */

export async function submitSlideReview(file, onProgress) {
  const formData = new FormData();
  formData.append('slideFile', file);

  // Update loading message while waiting
  const loadingMessages = [
    'Reading your slides...',
    'Analysing content structure...',
    'Checking for wall-of-text slides...',
    'Generating Mr. Lauder\'s feedback...',
  ];
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % loadingMessages.length;
    onProgress?.(loadingMessages[msgIndex]);
  }, 3500);

  try {
    const response = await fetch('/api/review-slides', {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type manually — the browser sets it automatically
      // with the correct multipart boundary when using FormData.
    });

    clearInterval(msgInterval);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Unknown server error.' }));
      throw new Error(errData.error || `Server error ${response.status}`);
    }

    return await response.json();
    // Returns: { review: string, slideCount: number, slides: [{index, title}] }

  } catch (err) {
    clearInterval(msgInterval);
    throw err;
  }
}