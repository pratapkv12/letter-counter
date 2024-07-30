document.addEventListener('DOMContentLoaded', (event) => {
    const textInput = document.getElementById('text-input');
    const letterCount = document.getElementById('letter-count');

    textInput.addEventListener('input', () => {
        const text = textInput.value;
        const letters = text.replace(/[^a-zA-Z]/g, '');
        letterCount.textContent = letters.length;
    });
});