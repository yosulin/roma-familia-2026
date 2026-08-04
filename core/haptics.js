// core/haptics.js
// navigator.vibrate solo funciona en Android/Chrome — iOS Safari nunca ha
// implementado la Vibration API (ni siquiera instalada como PWA), así que
// esto se degrada en silencio ahí, no falla.

export function vibrate(pattern = 10) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* ignorar */ }
  }
}

export const HAPTIC = {
  tap: 8,
  select: 12,
  toggleOn: [10, 30, 10],
  toggleOff: 10,
  dismiss: 15
};
