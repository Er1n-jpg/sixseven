// JS for index.html

const nameInput = document.getElementById('Stextarea');
// const errorMsg  = document.getElementById('name-error');

async function handleSubmit() {
    const name = nameInput.value.trim();
    if (!name){
      // errorMsg.classList.remove('hidden');
      return;
    } 

    // Persist the name for chatbot.html to read on load
    sessionStorage.setItem('studentName', name);

    // Navigate to the chat interface
    window.location.href = 'chatbot.html';
}

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSubmit();
});

// // Hide the error message as soon as the user starts typing again
// nameInput.addEventListener('input', function () {
//   errorMsg.classList.add('hidden');
// });