// Copies each slider's value into --value while it moves, so that its fill
// follows the thumb (D-48). It sets nothing else: no colour, no class.
for (const slider of document.querySelectorAll('.slider')) {
  slider.addEventListener('input', () => slider.style.setProperty('--value', `${slider.value}%`));
}
