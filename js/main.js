// ============================================================
// main.js — entry point: game loop, multiplayer loop, input
// ============================================================

import { CANVAS_W, CANVAS_H, FLAP } from './config.js';
import { S, WIN_RETURN_BTN }         from './state.js';
import { update, updateChaser, updateMultiPlayer } from './physics.js';
import { drawBackground }            from './draw/background.js';
import { drawPipe }                  from './draw/pipes.js';
import { drawBird, drawLittleMan, drawChaser } from './draw/bird.js';
import {
  drawParticles, drawPoop, drawMarioCubes, drawRainEffect,
  drawGrowingPoopBall, drawPoopyAlert, drawPoopSlide,
  drawDizzyEffect, drawEagleAttack, drawMarioBasket,
  drawIceFreezeChicken, drawCrown, drawAngel, drawWinReturnBtn,
  drawArrows, drawRocketProjectile, drawRocketBoostFlame, drawPowerupBanner,
} from './draw/effects.js';
import { startGame, startMultiGame, showWinScreen, showMultiResult, setTheme, handleFlap, handleCanvasClick } from './ui.js';
import { closeRecordModal } from './highscore.js';

// ---- Canvas setup ----
const canvas = document.getElementById('c');
const ctx    = canvas.getContext('2d');
canvas.width  = CANVAS_W;
canvas.height = CANVAS_H;
S.canvas = canvas;
S.ctx    = ctx;

// ---- Input ----
document.addEventListener('keydown', e => {
  if (e.code === 'Space') handleFlap();
  if (e.code === 'KeyQ' && S.gameMode === 'multi' && S.gameState === 'playing' && S.multiL && S.multiL.bird.alive) {
    S.multiL.bird.vy = FLAP; S.multiL.birdFlapFrame = S.frame;
  }
  if (e.code === 'KeyL' && S.gameMode === 'multi' && S.gameState === 'playing' && S.multiR && S.multiR.bird.alive) {
    S.multiR.bird.vy = FLAP; S.multiR.birdFlapFrame = S.frame;
  }
  if (e.code === 'KeyS' && S.gameMode === 'single' && S.gameState === 'playing'
      && S.activePowerup && S.activePowerup.type === 'rocket_launcher'
      && S.rocketLauncherAmmo > 0 && !S.rocketProjectile) {
    S.rocketLauncherAmmo--;
    S.rocketProjectile = { x: S.bird.x + 30, y: S.bird.y, trail: [], active: true };
    if (S.rocketLauncherAmmo <= 0) S.activePowerup.timer = Math.min(S.activePowerup.timer, 120);
  }
});

canvas.addEventListener('click', e => {
  if (S.gameState === 'win' && S.winReturnBtnVisible) {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx     = (e.clientX - rect.left) * scaleX;
    const cy     = (e.clientY - rect.top)  * scaleY;
    const b      = WIN_RETURN_BTN;
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
      showWinScreen(); return;
    }
  }
  handleFlap();
});

// ---- Photo upload ----
document.getElementById('photoInput').addEventListener('change', function(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    const img = new Image();
    img.onload = () => { S.photoImg = img; };
    img.src = ev.target.result;
    const prev = document.getElementById('photoPreview');
    prev.src = ev.target.result; prev.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
});

// ---- Theme / mode buttons (wired up in index.html, exposed globally) ----
window.setTheme    = setTheme;
window.startGame   = () => startGame(loop);
window.startMultiGame = () => startMultiGame(loopMulti);
window.closeRecordModal = closeRecordModal;

// ============================================================
// ---- Single-player game loop --------------------------------
// ============================================================

export function loop() {
  if (S.gameState !== 'playing' && S.gameState !== 'win' && S.gameState !== 'countdown') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (S.gameState === 'countdown') { S.frame++; } else { update(); }

  drawBackground();
  S.pipes.forEach(drawPipe);
  if (S.gameMode === 'single') drawMarioCubes();
  S.poopItems.forEach(drawPoop);
  if (S.littleMan) drawLittleMan(S.littleMan);
  if (S.chaser)    drawChaser();
  if (S.gameMode === 'single') drawRainEffect();

  if (S.winDance) {
    S.danceFrame++;
    const offset = Math.sin(S.danceFrame * 0.15) * 30;
    const birdDrawX = S.bird.x + offset;
    const birdDrawY = S.bird.y + Math.sin(S.danceFrame * 0.1) * 5;
    if (S.danceFrame > 30) {
      const glowAlpha = Math.min((S.danceFrame - 30) / 70, 0.42);
      const grd = ctx.createRadialGradient(birdDrawX, birdDrawY - 40, 15, birdDrawX, birdDrawY - 40, 280);
      grd.addColorStop(0, `rgba(255,255,170,${glowAlpha})`);
      grd.addColorStop(1, 'rgba(255,240,80,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (S.danceFrame > 50 && S.danceFrame % 4 === 0) {
      const colors = ['#FFD700','#FFA500','#FF69B4','#87CEEB','#98FB98','#fff','#DDA0DD'];
      S.particles.push({ x: Math.random() * canvas.width, y: -10,
        vx: (Math.random()-0.5)*1.8, vy: 1.5+Math.random()*2.5,
        life: 1, color: colors[Math.floor(Math.random()*colors.length)], size: 3+Math.random()*5 });
    }
    drawBird(birdDrawX, birdDrawY, Math.sin(S.danceFrame * 0.15) * 0.4, false, false);
    if (S.danceFrame > 90) {
      const targetCrownY = birdDrawY - 60;
      S.crownY += (targetCrownY - S.crownY) * 0.038;
      drawCrown(birdDrawX, S.crownY);
    }
    if (S.danceFrame > 140) {
      const af = S.danceFrame - 140;
      drawAngel(birdDrawX - 100 + Math.sin(af*0.06)*8, birdDrawY - 5 + Math.sin(af*0.09)*14, false);
      drawAngel(birdDrawX + 100 + Math.sin(af*0.06+1.5)*8, birdDrawY - 5 + Math.sin(af*0.09+1)*14, true);
    }
    if (S.danceFrame > 320) { S.winReturnBtnVisible = true; drawWinReturnBtn(); }

  } else if (S.deathType === 'top' && S.topDeathPhase) {
    if (S.topDeathPhase === 'grow' || S.topDeathPhase === 'alert') {
      drawGrowingPoopBall(S.bird.x, S.bird.y, S.birdScale);
    }
  } else if (S.birdDizzy) {
    const dWobbleX = Math.sin(S.birdDizzyTimer*0.30)*24 + Math.sin(S.birdDizzyTimer*0.13)*10;
    const dWobbleY = Math.cos(S.birdDizzyTimer*0.23)*9  + Math.cos(S.birdDizzyTimer*0.44)*4;
    drawBird(S.bird.x+dWobbleX, S.bird.y+dWobbleY, S.bird.angle, false, false);
    drawDizzyEffect(S.bird.x+dWobbleX, S.bird.y+dWobbleY, S.birdDizzyTimer);
  } else {
    const eagleHasChicken = S.eagleAttackState &&
      (S.eagleAttackState.phase === 'grab' || S.eagleAttackState.phase === 'escape');
    const marioHasChicken = S.marioBasketState && !S.friedChicken;
    if (!eagleHasChicken && !marioHasChicken) {
      if (S.iceFreeze && S.friedChicken) {
        drawIceFreezeChicken(S.bird.x, S.bird.y, S.iceFreeze.progress);
      } else {
        if (S.gameMode === 'single') drawRocketBoostFlame();
        if (S.gameMode === 'single' && S.birdSizeScale !== 1.0) {
          ctx.save(); ctx.translate(S.bird.x, S.bird.y); ctx.scale(S.birdSizeScale, S.birdSizeScale); ctx.translate(-S.bird.x, -S.bird.y);
          drawBird(S.bird.x, S.bird.y, S.bird.angle, S.birdFire, S.friedChicken); ctx.restore();
        } else {
          drawBird(S.bird.x, S.bird.y, S.bird.angle, S.birdFire, S.friedChicken);
        }
      }
    }
  }

  if (S.eagleAttackState)  drawEagleAttack(S.eagleAttackState);
  if (S.marioBasketState)  drawMarioBasket(S.marioBasketState);
  drawParticles();
  if (S.gameMode === 'single') { drawArrows(); drawRocketProjectile(); drawPowerupBanner(); }
  if (S.poopSlideActive) drawPoopSlide(S.poopSlideY);
  if (S.deathType === 'top' && S.topDeathPhase === 'alert') drawPoopyAlert(S.topDeathTimer);

  // Best score HUD
  if (S.highScore > 0) {
    ctx.save(); ctx.font = 'bold 16px Arial'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(canvas.width - 130, 8, 122, 28);
    ctx.fillStyle = '#FFD700'; ctx.fillText('🏆 Best: ' + S.highScore, canvas.width - 10, 13);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.restore();
  }

  if (S.gameState === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 130px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12;
    ctx.fillText(S.countdownVal, canvas.width / 2, canvas.height / 2); ctx.shadowBlur = 0;
    ctx.font = 'bold 28px Arial'; ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 90);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  S.rafId = requestAnimationFrame(loop);
}

// ============================================================
// ---- Multiplayer loop ---------------------------------------
// ============================================================

const HALF_W = canvas.width / 2;

export function loopMulti() {
  if (S.gameMode !== 'multi') return;
  if (S.gameState !== 'playing' && S.gameState !== 'countdown') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  S.frame++;
  if (S.gameState === 'playing') {
    updateMultiPlayer(S.multiL);
    updateMultiPlayer(S.multiR);
  }
  drawMultiHalf(S.multiL, 0);
  drawMultiHalf(S.multiR, HALF_W);

  // Centre divider
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([14, 9]);
  ctx.beginPath(); ctx.moveTo(HALF_W, 0); ctx.lineTo(HALF_W, canvas.height); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();

  if (S.gameState === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.40)'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 130px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
    ctx.fillText(S.countdownVal > 0 ? S.countdownVal : 'GO!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.shadowBlur = 0; ctx.font = 'bold 26px Arial';
    ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 78);
    ctx.font = 'bold 19px Arial'; ctx.fillStyle = '#FFD700';
    ctx.fillText('[ Q ] to flap', HALF_W / 2, canvas.height / 2 + 128);
    ctx.fillText('[ L ] to flap', HALF_W + HALF_W / 2, canvas.height / 2 + 128);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  if (!S.multiGameOver && (S.multiL.dead || S.multiL.won) && (S.multiR.dead || S.multiR.won)) {
    S.multiGameOver = true;
    setTimeout(showMultiResult, 2800);
  }
  S.rafId = requestAnimationFrame(loopMulti);
}

function drawMultiHalf(p, offsetX) {
  // Swap globals so draw functions use this player's state
  const _bird = S.bird, _pipes = S.pipes, _particles = S.particles;
  const _score = S.score, _speed = S.speed, _bff = S.birdFlapFrame, _psw = S.pipesSpawned;
  S.bird = p.bird; S.pipes = p.pipes; S.particles = p.particles;
  S.score = p.score; S.speed = p.speed; S.birdFlapFrame = p.birdFlapFrame; S.pipesSpawned = p.pipesSpawned;

  ctx.save(); ctx.translate(offsetX, 0); ctx.scale(0.5, 1);
  ctx.beginPath(); ctx.rect(0, 0, canvas.width, canvas.height); ctx.clip();
  drawBackground();
  S.pipes.forEach(drawPipe);
  if (p.won) {
    const off = Math.sin(p.timer * 0.15) * 30;
    drawBird(S.bird.x + off, S.bird.y + Math.sin(p.timer * 0.1) * 5, Math.sin(p.timer * 0.15) * 0.4, false, false);
  } else {
    drawBird(S.bird.x, S.bird.y, p.dead ? Math.min(S.bird.angle + 0.8, Math.PI * 0.7) : S.bird.angle, false, false);
  }
  ctx.restore();

  // Restore globals
  S.bird = _bird; S.pipes = _pipes; S.particles = _particles;
  S.score = _score; S.speed = _speed; S.birdFlapFrame = _bff; S.pipesSpawned = _psw;

  // HUD + overlays (unscaled)
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(offsetX + 6, 6, 102, 64);
  ctx.font = 'bold 15px Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#fff';
  ctx.fillText('Score: ' + p.score, offsetX + 12, 11);
  ctx.font = 'bold 14px Arial'; ctx.fillStyle = '#FFD700';
  ctx.fillText(offsetX === 0 ? 'P1   [ Q ]' : 'P2   [ L ]', offsetX + 12, 31);
  ctx.font = '12px Arial'; ctx.fillStyle = 'rgba(180,255,180,0.9)';
  ctx.fillText('Speed: ' + p.speed.toFixed(1) + 'x', offsetX + 12, 51);
  if (p.dead && p.timer > 15) {
    const fade = Math.min((p.timer - 15) / 20, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.55*fade})`; ctx.fillRect(offsetX, 0, HALF_W, canvas.height);
    ctx.globalAlpha = fade; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px serif'; ctx.fillText('💀', offsetX + HALF_W / 2, canvas.height / 2 - 52);
    ctx.font = 'bold 28px Arial'; ctx.fillStyle = '#ff5555'; ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText(p.deathType === 'top' ? 'Hit top pillar!' : 'Hit bottom!', offsetX + HALF_W / 2, canvas.height / 2 + 4);
    ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + p.score, offsetX + HALF_W / 2, canvas.height / 2 + 46);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  if (p.won && p.timer > 30) {
    const fade = Math.min((p.timer - 30) / 25, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.38*fade})`; ctx.fillRect(offsetX, 0, HALF_W, canvas.height);
    ctx.globalAlpha = fade; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px serif'; ctx.fillText('🏆', offsetX + HALF_W / 2, canvas.height / 2 - 52);
    ctx.font = 'bold 30px Arial'; ctx.fillStyle = '#FFD700'; ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText('WINNER!', offsetX + HALF_W / 2, canvas.height / 2 + 4);
    ctx.font = 'bold 22px Arial'; ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + p.score, offsetX + HALF_W / 2, canvas.height / 2 + 46);
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  }
  ctx.restore();
}
