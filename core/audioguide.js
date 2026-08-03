// core/audioguide.js
let currentUtterance = null;

export function toggleAudioguide(text, btn) {
  if (!('speechSynthesis' in window)) {
    btn.textContent = 'Audio no disponible en este navegador';
    return;
  }
  if (currentUtterance && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
    btn.textContent = '🔊 Escuchar audioguía';
    btn.classList.remove('is-playing');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.rate = 0.98;
  utterance.onend = () => {
    btn.textContent = '🔊 Escuchar audioguía';
    btn.classList.remove('is-playing');
    currentUtterance = null;
  };
  currentUtterance = utterance;
  btn.textContent = '⏹ Detener audioguía';
  btn.classList.add('is-playing');
  speechSynthesis.speak(utterance);
}
