// Copies each slider's position into --value, so that its fill follows the
// thumb (D-48). It runs on load, on every move, and when the browser shows the
// page again with a restored value. It sets nothing else: no colour, no class.
const fill = slider => {
  const min = Number(slider.min);
  slider.style.setProperty('--value', `${((slider.value - min) * 100) / (Number(slider.max) - min)}%`);
};

for (const slider of document.querySelectorAll('.slider')) {
  fill(slider);
  slider.addEventListener('input', () => fill(slider));
}

window.addEventListener('pageshow', () => document.querySelectorAll('.slider').forEach(fill));
