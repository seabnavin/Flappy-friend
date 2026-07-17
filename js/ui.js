// ============================================================
// ui.js — screen helpers, overlays, game start/reset
// ============================================================

import { S, WIN_RETURN_BTN } from './state.js';
import { checkAndSaveHighScore, showRecordModal } from './highscore.js';
import { resetMarioPowerupSystem } from './powerups.js';
import { FLAP } from './config.js';

export function showDeathScreen() {
  S.gameState = 'dead';
  cancelAnimationFrame(S.rafId);
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = S.deathType === 'top' ? '💩 Pooped Out!' : '🍗 Fried Chicken!';
  const msg = S.deathType === 'top'
    ? 'You hit a top pillar and pooped everywhere!'
    : 'You hit a bottom pillar and got fried!';
  ov.querySelector('p').textContent = `Score: ${S.score} | ${msg}`;
  document.getElementById('startBtn').textContent = '🔄 Restart';
  const prevBest = checkAndSaveHighScore(S.score);
  if (prevBest !== null) setTimeout(() => showRecordModal(S.score, prevBest), 400);
}

export function showWinScreen() {
  S.gameState = 'dead';
  cancelAnimationFrame(S.rafId);
  S.winDance = false;
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = '🏆 You Win!';
  ov.querySelector('p').textContent  = `Amazing! Score: ${S.score}! You're the champion!`;
  document.getElementById('startBtn').textContent = '▶ Play Again';
  const prevBest = checkAndSaveHighScore(S.score);
  if (prevBest !== null) setTimeout(() => showRecordModal(S.score, prevBest), 600);
}

export function setTheme(t) {
  S.theme = t;
  ['nature', 'desert', 'mountain'].forEach(n => {
    document.getElementById('btn-' + n).classList.toggle('active', n === t);
  });
}

export function startGame(loopFn) {
  if (S.countdownInterval) { clearInterval(S.countdownInterval); S.countdownInterval = null; }
  cancelAnimationFrame(S.rafId);
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('score-display').style.display = 'none';

  S.score = 0; S.frame = 0; S.speed = 1;
  S.pipesSpawned = 0; S.lastPipeTopH = null;
  S.birdFlapFrame = -999;
  S.bird = { x: 200, y: 300, vy: 0, angle: 0, alive: true };
  S.pipes = []; S.particles = []; S.poopItems = []; S.littleMan = null;
  S.birdFire = false; S.birdFired = false; S.birdDizzy = false; S.birdDizzyTimer = 0; S.birdDead = false;
  S.deathType = null; S.friedChicken = false;
  S.poopSlideActive = false; S.poopSlideY = 0; S.poopSlideDone = false;
  S.topDeathPhase = null; S.topDeathTimer = 0; S.birdScale = 1; S.topDeathExploded = false;
  S.chaser = { x: S.bird.x - 140, y: S.bird.y, state: 'chase',
               fleeVx: 0, fleeVy: 0, alpha: 1,
               ashParticles: [], ashTimer: 0, ashSpawnDone: false };
  S.crownY = -80; S.winReturnBtnVisible = false;
  S.winDance = false; S.danceFrame = 0;
  S.eagleAttackState = null; S.marioBasketState = null; S.iceFreeze = null;
  resetMarioPowerupSystem();
  document.getElementById('poop-overlay').style.display = 'none';
  document.getElementById('scoreVal').textContent  = '0';
  document.getElementById('speedVal').textContent  = '1.0';

  S.gameState    = 'countdown';
  S.countdownVal = 3;
  loopFn();
  let tick = 3;
  S.countdownInterval = setInterval(() => {
    tick--;
    S.countdownVal = tick;
    if (tick <= 0) {
      clearInterval(S.countdownInterval);
      S.countdownInterval = null;
      S.gameState = 'playing';
    }
  }, 1000);
}

export function startMultiGame(loopMultiFn) {
  S.gameMode = 'multi';
  if (S.countdownInterval)       { clearInterval(S.countdownInterval);      S.countdownInterval      = null; }
  if (S.multiCountdownInterval)  { clearInterval(S.multiCountdownInterval); S.multiCountdownInterval = null; }
  cancelAnimationFrame(S.rafId);
  document.getElementById('overlay').style.display  = 'none';
  document.getElementById('score-display').style.display = 'none';
  document.getElementById('poop-overlay').style.display  = 'none';

  S.frame = 0;
  S.multiL = createMultiPlayerState();
  S.multiR = createMultiPlayerState();
  S.multiGameOver = false;
  S.gameState     = 'countdown';
  S.countdownVal  = 3;

  loopMultiFn();
  let tick = 3;
  S.multiCountdownInterval = setInterval(() => {
    tick--;
    S.countdownVal = tick;
    if (tick <= 0) {
      clearInterval(S.multiCountdownInterval);
      S.multiCountdownInterval = null;
      S.gameState = 'playing';
    }
  }, 1000);
}

function createMultiPlayerState() {
  return {
    bird: { x: 200, y: 300, vy: 0, angle: 0, alive: true },
    pipes: [], particles: [],
    score: 0, speed: 1,
    pipesSpawned: 0, birdFlapFrame: -999,
    dead: false, won: false, deathType: null, timer: 0,
  };
}

export function showMultiResult() {
  if (S.gameMode !== 'multi') return;
  cancelAnimationFrame(S.rafId);
  S.gameMode = 'single';
  const ls = S.multiL.score, rs = S.multiR.score;
  const lw = S.multiL.won,   rw = S.multiR.won;
  let title;
  if      (lw && !rw) title = '🏆 Player 1 Wins!';
  else if (rw && !lw) title = '🏆 Player 2 Wins!';
  else if (ls > rs)   title = '🏆 Player 1 Wins!';
  else if (rs > ls)   title = '🏆 Player 2 Wins!';
  else                title = "🤝 It's a Tie!";
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = title;
  ov.querySelector('p').textContent  = `P1: ${ls} pts   |   P2: ${rs} pts`;
  document.getElementById('startBtn').textContent = '▶ Play Again (1P)';
}

export function handleFlap() {
  if (S.gameMode === 'multi') return;
  if (S.gameState === 'playing' && S.bird.alive) {
    S.bird.vy      = FLAP;
    S.birdFlapFrame = S.frame;
  }
}

export function handleCanvasClick(e, showWinScreenFn) {
  if (S.gameState === 'win' && S.winReturnBtnVisible) {
    const rect   = S.canvas.getBoundingClientRect();
    const scaleX = S.canvas.width  / rect.width;
    const scaleY = S.canvas.height / rect.height;
    const cx     = (e.clientX - rect.left) * scaleX;
    const cy     = (e.clientY - rect.top)  * scaleY;
    const btn = WIN_RETURN_BTN;
    if (cx >= btn.x && cx <= btn.x + btn.w && cy >= btn.y && cy <= btn.y + btn.h) {
      showWinScreenFn(); return;
    }
  }
  handleFlap();
}
