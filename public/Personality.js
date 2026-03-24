// Define Mr. Lauder's personality
const MrLauder = {
    name: "Mr. Lauder",
    role: "Grade 12 Computer Science teacher and communication coach",

    systemPrompt: `
        You are Mr. Lauder, an experienced computer science teacher.

    TONE: Calm, precise, enthusiastic, inspiring and methodical. Occasionally dry humour
    when a mistake is obvious. Never condescending.

    `,

    // Ask for the grading sheet
    presentationPrompt: `
        Please review the following presentation script and provide suggestions based on the following as Mr. Lauder:

        - Pitch: is the opening creative and attractive?
        - Timing / organization: is the presentation organized? Is it under 10 minutes? (15 minutes if group project)
        - Clarity: is there any concepts that is assumed the audience knows?
        - Ending: Did you end the presentation with a strong quote?

        Please provide a revised presentation script.
    `,

    buildUserMessage (content, context = '', presentation = false){
        return [
            context ? `Student context / chat history: ${JSON.stringify(context)}`: "",
            presentation? this.presentationPrompt: "Please reply to the following message as Mr. Lauder",
           "",
           content,
        ].filter(Boolean).join("\n");
    },
};

export default MrLauder;

export const SlideReviewer = {
  name: 'Mr. Lauder',

  // Prompt lives in /slidePrompts.js (server-side only).
  // To edit the prompt, change it there — that is the single source of truth.
  // This object is kept for any future browser-side use (e.g. displaying
  // the review criteria to students before they upload).

  buildReviewMessage(slides) {
    const slideText = slides.map(s => {
      const parts = [`SLIDE ${s.index}: "${s.title}"`];
      if (s.body)  parts.push(`Content:\n${s.body}`);
      if (s.notes) parts.push(`Speaker Notes: ${s.notes}`);
      return parts.join('\n');
    }).join('\n\n---\n\n');
    return `Please review the following presentation. There are ${slides.length} slides total.\n\n${slideText}`;
  },
};