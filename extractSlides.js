// extractSlides.js
const JSZip = require('jszip');
const fs = require('fs');

/**
 * Extracts text content from each slide in a .pptx file.
 * Returns an array of slide objects: { index, title, body, notes }
 */
async function extractSlidesFromPptx(filePath) {
  const buffer  = fs.readFileSync(filePath);
  const zip     = await JSZip.loadAsync(buffer);
  const slides  = [];

  // Find all slide files — they live at ppt/slides/slide1.xml, slide2.xml, etc.
  // Sort them numerically so slide order is preserved.
  const slideFiles = Object.keys(zip.files)
    .filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });

  for (let i = 0; i < slideFiles.length; i++) {
    const xml       = await zip.files[slideFiles[i]].async('string');
    const textNodes = extractTextFromXml(xml);

    // Also try to get speaker notes
    const notesPath = slideFiles[i].replace('slides/slide', 'notesSlides/notesSlide');
    let notes       = '';
    if (zip.files[notesPath]) {
      const notesXml = await zip.files[notesPath].async('string');
      notes          = extractTextFromXml(notesXml).join(' ');
    }

    slides.push({
      index: i + 1,
      title: textNodes[0] || `Slide ${i + 1}`,  // First text node is usually the title
      body:  textNodes.slice(1).join('\n'),       // Everything else is body content
      notes,
    });
  }

  return slides;
}

/**
 * Strips XML tags and returns an array of non-empty text strings.
 * Handles the <a:t> text run elements that PowerPoint uses.
 */
function extractTextFromXml(xml) {
  // Extract text from <a:t> elements (PowerPoint text run nodes)
  const matches = xml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
  return matches
    .map(m => m.replace(/<[^>]+>/g, '').trim())
    .filter(t => t.length > 0);
}

module.exports = { extractSlidesFromPptx };