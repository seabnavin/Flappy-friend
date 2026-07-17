// ============================================================
// highscore.js — persistent high-score helpers
// ============================================================

import { S } from './state.js';

export function checkAndSaveHighScore(currentScore) {
  if (currentScore > S.highScore) {
    const prev = S.highScore;
    S.highScore = currentScore;
    localStorage.setItem('flappyHighScore', S.highScore);
    return prev;
  }
  return null;
}

export function showRecordModal(currentScore, prevBest) {
  const modal = document.getElementById('record-modal');
  document.getElementById('record-msg').textContent  = `Your new best: ${currentScore} 🎯`;
  document.getElementById('record-prev').textContent = prevBest > 0
    ? `Previous best was: ${prevBest}`
    : `First record set!`;
  modal.style.display = 'flex';
}

export function closeRecordModal() {
  document.getElementById('record-modal').style.display = 'none';
}
