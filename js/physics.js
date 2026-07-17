// ============================================================
// physics.js — update loop, pipe spawning, collision, deaths
// ============================================================

import { GRAVITY, PIPE_GAP, WIN_SCORE } from './config.js';
import { S } from './state.js';
import { resetMarioPowerupSystem, updateMarioCubes, updatePowerup } from './powerups.js';
import { showDeathScreen, showWinScreen } from './ui.js';

// ---- Helpers ----
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 2 + Math.random() * 4;
    S.particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
                       life: 1, color, size: 4 + Math.random() * 6 });
  }
}

// ---- Pipe spawning ----
export function pickPipeVariant(index) {
  if (S.theme === 'nature')   return (index % 3 === 2) ? 'minecraft_tree' : 'normal';
  if (S.theme === 'desert')   return 'cactus';
  if (S.theme === 'mountain') return (index % 3 === 2) ? 'spruce_tree' : 'icicle';
  return 'normal';
}

export function spawnPipe() {
  if (S.pipesSpawned >= 31) return;
  const minTop = 80;
  const maxTop = S.canvas.height - 120 - PIPE_GAP;
  let topH;
  if (S.lastPipeTopH === null) {
    topH = minTop + Math.random() * (maxTop - minTop);
  } else {
    const maxStep = 120;
    const lo = Math.max(minTop, S.lastPipeTopH - maxStep);
    const hi = Math.min(maxTop, S.lastPipeTopH + maxStep);
    topH = lo + Math.random() * (hi - lo);
  }
  S.lastPipeTopH = topH;
  const variant = pickPipeVariant(S.pipesSpawned);
  const newPipe = { x: S.canvas.width + 20, topH, scored: false,
                    pipeIndex: S.pipesSpawned + 1, variant };
  if (S.activePowerup && S.activePowerup.type === 'moving_pipes') {
    newPipe.baseTopH  = topH;
    newPipe.moveCycle = Math.random() * Math.PI * 2;
  }
  S.pipes.push(newPipe);
  S.pipesSpawned++;
}

// ---- Death triggers ----
export function triggerTopDeath() {
  S.deathType       = 'top';
  S.bird.alive      = false;
  S.birdDead        = true;
  S.topDeathPhase   = 'grow';
  S.topDeathTimer   = 0;
  S.birdScale       = 1;
  S.topDeathExploded = false;
  if (S.chaser) {
    S.chaser.state   = 'flee';
    S.chaser.fleeVx  = -3 + (Math.random() - 0.5) * 3;
    S.chaser.fleeVy  = -8 - Math.random() * 4;
  }
}

export function triggerBottomDeath() {
  S.deathType  = 'bottom';
  S.bird.alive = false;
  S.bird.vy    = 0;
  S.birdDead   = true;
  S.littleMan  = {
    x: S.canvas.width + 30,
    y: S.canvas.height - 50,
    targetX: 600,
    state: 'walking',
    aimTimer: 0,
    bullet: { x: 0, y: 0, vx: 0, vy: 0, active: false },
  };
  S.birdFired = false;
  S.birdFire  = false;
  if (S.chaser) {
    S.chaser.state  = 'flee';
    S.chaser.fleeVx = -3 + (Math.random() - 0.5) * 3;
    S.chaser.fleeVy =  7 + Math.random() * 4;
  }
}

export function triggerWin() {
  S.bird.alive          = false;
  S.winDance            = true;
  S.gameState           = 'win';
  S.pipes               = [];
  S.winReturnBtnVisible = false;
  S.crownY              = -80;
  if (S.chaser) {
    S.chaser.state        = 'ash';
    S.chaser.ashTimer     = 0;
    S.chaser.ashSpawnDone = false;
    S.chaser.alpha        = 1;
  }
}

// ---- Chaser ----
export function updateChaser() {
  const c = S.chaser;
  if (!c || c.state === 'gone') return;
  if (c.state === 'chase') {
    c.x  = S.bird.x - 140;
    c.y += (S.bird.y - c.y) * 0.08;
  } else if (c.state === 'flee') {
    c.x     += c.fleeVx;
    c.y     += c.fleeVy;
    c.alpha -= 0.014;
    if (c.alpha <= 0) { c.alpha = 0; c.state = 'gone'; }
  } else if (c.state === 'ash') {
    c.ashTimer++;
    if (!c.ashSpawnDone) {
      for (let i = 0; i < 3; i++) {
        c.ashParticles.push({
          x: c.x + (Math.random() - 0.5) * 60,
          y: c.y + (Math.random() - 0.5) * 50,
          vx: (Math.random() - 0.5) * 1.8,
          vy: 0.8 + Math.random() * 1.5,
          size: 2 + Math.random() * 4,
          alpha: 0.6 + Math.random() * 0.4,
        });
      }
      if (c.ashTimer > 60) c.ashSpawnDone = true;
    }
    c.alpha = Math.max(0, 1 - c.ashTimer / 65);
    c.ashParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.01; p.vy += 0.04; });
    c.ashParticles = c.ashParticles.filter(p => p.alpha > 0);
    if (c.ashTimer > 150 && c.ashParticles.length === 0) c.state = 'gone';
  }
}

// ---- Main update ----
export function update() {
  S.frame++;
  S.speed = 1 + S.score * 0.05;
  document.getElementById('speedVal').textContent = S.speed.toFixed(1);
  if (S.chaser) updateChaser();

  if (!S.bird.alive) {
    if (S.deathType === 'top') {
      S.topDeathTimer++;
      if (S.topDeathPhase === 'grow') {
        S.birdScale = 1 + (S.topDeathTimer / 80) * 4.5;
        if (S.topDeathTimer >= 80) { S.topDeathPhase = 'alert'; S.topDeathTimer = 0; }
      } else if (S.topDeathPhase === 'alert') {
        if (S.topDeathTimer >= 75) { S.topDeathPhase = 'explode'; S.topDeathTimer = 0; }
      } else if (S.topDeathPhase === 'explode') {
        if (!S.topDeathExploded) {
          S.topDeathExploded = true;
          const eColors = ['#7b4f2e','#a06030','#5a3620','#c8a060','#3d2010','#8B4513','#D2691E'];
          for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd   = 4 + Math.random() * 14;
            S.particles.push({ x: S.bird.x, y: S.bird.y,
              vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
              life: 1, color: eColors[Math.floor(Math.random() * eColors.length)],
              size: 3 + Math.random() * 8 });
          }
        }
        S.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.018; p.vy += 0.12; });
        S.particles = S.particles.filter(p => p.life > 0);
        if (S.topDeathTimer >= 60) { S.topDeathPhase = 'brown'; S.topDeathTimer = 0; S.particles = []; }
      } else if (S.topDeathPhase === 'brown') {
        S.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.025; p.vy += 0.15; });
        S.particles = S.particles.filter(p => p.life > 0);
        if (!S.poopSlideActive) {
          S.poopSlideActive = true;
          S.poopSlideY      = 0;
          S.poopSlideDone   = false;
        }
        if (S.poopSlideActive && !S.poopSlideDone) {
          S.poopSlideY += 5;
          if (S.poopSlideY >= S.canvas.height + 80) {
            S.poopSlideDone = true;
            setTimeout(showDeathScreen, 700);
          }
        }
      }
      return;
    }

    if (S.deathType === 'bottom') {
      if (!S.birdFired && !S.birdDizzy) {
        S.bird.y += Math.sin(S.frame * 0.08) * 0.3;
      }

      if (S.littleMan) {
        const man = S.littleMan;
        if (man.state === 'walking') {
          man.x -= 1.0;
          if (man.x <= man.targetX) {
            man.x        = man.targetX;
            man.state    = 'aiming';
            man.aimTimer = 80;
          }
        } else if (man.state === 'aiming') {
          man.aimTimer--;
          if (man.aimTimer <= 0) {
            man.state = 'fired';
            const gunX = man.x - 22, gunY = man.y - 18;
            const dx   = S.bird.x - gunX, dy = S.bird.y - gunY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            man.bullet.x  = gunX; man.bullet.y  = gunY;
            man.bullet.vx = (dx / dist) * 4.2;
            man.bullet.vy = (dy / dist) * 4.2;
            man.bullet.active = true;
          }
        }
        if (man.bullet.active) {
          man.bullet.x += man.bullet.vx;
          man.bullet.y += man.bullet.vy;
          const dx = man.bullet.x - S.bird.x, dy = man.bullet.y - S.bird.y;
          if (Math.sqrt(dx * dx + dy * dy) < 28) {
            man.bullet.active = false;
            S.birdDizzy      = true;
            S.birdDizzyTimer = 0;
          }
        }
      }

      if (S.birdDizzy && !S.birdFired) {
        S.birdDizzyTimer++;
        S.bird.y     += Math.sin(S.frame * 0.16) * 1.8 + Math.sin(S.frame * 0.39) * 0.7;
        S.bird.angle  = Math.sin(S.birdDizzyTimer * 0.32) * 1.15 + Math.sin(S.birdDizzyTimer * 0.17) * 0.45;
        if (S.birdDizzyTimer >= 200) {
          S.birdDizzy = false;
          S.birdFired = true;
          S.bird.vy   = 0.5;
        }
      }

      if (S.birdFired) {
        S.bird.vy    += GRAVITY * 0.35;
        S.bird.y     += S.bird.vy;
        S.bird.angle += 0.06;
        if (S.bird.y >= S.canvas.height - 60 - 20) {
          S.bird.y = S.canvas.height - 60 - 20;
          if (!S.birdFire) {
            S.birdFire = true;
            const _t = S.theme, _bx = S.bird.x, _by = S.bird.y;
            setTimeout(() => {
              S.friedChicken = true;
              setTimeout(() => {
                if (_t === 'desert') {
                  S.eagleAttackState = { x: S.canvas.width + 40, y: -60, phase: 'approach',
                                         timer: 0, grabX: _bx, grabY: _by };
                } else if (_t === 'nature') {
                  S.marioBasketState = { x: S.canvas.width + 30, phase: 'walk_in', timer: 0,
                                         targetX: _bx + 22, chickenX: _bx, chickenY: _by };
                } else if (_t === 'mountain') {
                  S.iceFreeze = { timer: 0, progress: 0, done: false };
                }
              }, 3500);
            }, 1000);
          }
        }
      }

      if (S.eagleAttackState) {
        const e = S.eagleAttackState;
        e.timer++;
        if (e.phase === 'approach') {
          const dx   = e.grabX - e.x, dy = e.grabY - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) { e.phase = 'grab'; e.timer = 0; S.friedChicken = false; }
          else { const spd = 8; e.x += (dx / dist) * spd; e.y += (dy / dist) * spd; }
        } else if (e.phase === 'grab') {
          if (e.timer > 25) { e.phase = 'escape'; e.timer = 0; }
        } else if (e.phase === 'escape') {
          e.x += 9; e.y -= 5;
          if (e.x > S.canvas.width + 150) { S.eagleAttackState = null; showDeathScreen(); }
        }
      }

      if (S.marioBasketState) {
        const mb = S.marioBasketState;
        mb.timer++;
        if (mb.phase === 'walk_in') {
          mb.x -= 2.5;
          if (mb.x <= mb.targetX) { mb.x = mb.targetX; mb.phase = 'pickup'; mb.timer = 0; }
        } else if (mb.phase === 'pickup') {
          if (mb.timer === 25) S.friedChicken = false;
          if (mb.timer >= 70) { mb.phase = 'walk_out'; mb.timer = 0; }
        } else if (mb.phase === 'walk_out') {
          mb.x += 3.5;
          if (mb.x > S.canvas.width + 120) { S.marioBasketState = null; showDeathScreen(); }
        }
      }

      if (S.iceFreeze && !S.iceFreeze.done) {
        S.iceFreeze.timer++;
        S.iceFreeze.progress = Math.min(1, S.iceFreeze.timer / 210);
        if (S.iceFreeze.progress >= 1) {
          S.iceFreeze.done = true;
          setTimeout(showDeathScreen, 1000);
        }
      }
    }
    return;
  }

  // Bird physics
  S.bird.vy    += GRAVITY;
  S.bird.y     += S.bird.vy;
  S.bird.angle  = Math.max(-0.4, Math.min(Math.PI / 2, S.bird.vy * 0.06));

  if (S.bird.y <= 0) { S.bird.y = 0; S.bird.vy = 0; }
  if (S.bird.y >= S.canvas.height - 60 - 20) { triggerBottomDeath(); return; }

  if (S.frame % Math.round(110 / S.speed) === 0) spawnPipe();

  for (let i = S.pipes.length - 1; i >= 0; i--) {
    const p      = S.pipes[i];
    const pipeSpd = (S.activePowerup && S.activePowerup.type === 'rocket_boost') ? 18 : 3 * S.speed;
    p.x -= pipeSpd;
    if (p.x + 60 < 0) { S.pipes.splice(i, 1); continue; }

    if (S.activePowerup && S.activePowerup.type === 'moving_pipes' && p.baseTopH !== undefined) {
      p.topH = p.baseTopH + Math.sin(S.frame * 0.04 + (p.moveCycle || 0)) * 35;
    }

    if (S.activePowerup && S.activePowerup.type === 'rocket_boost') {
      if (p.x < S.bird.x + 40 && p.x + 60 > S.bird.x - 20) {
        if (!p.scored) {
          p.scored = true;
          S.score++;
          document.getElementById('scoreVal').textContent = S.score;
          if (S.score >= WIN_SCORE) { triggerWin(); return; }
        }
        spawnExplosion(p.x + 30, p.topH + PIPE_GAP / 2, '#FF8800', 15);
        S.pipes.splice(i, 1);
        continue;
      }
    }

    if (!p.scored && p.x + 60 < S.bird.x) {
      p.scored = true;
      S.score++;
      document.getElementById('scoreVal').textContent = S.score;
      if (S.score >= WIN_SCORE) { triggerWin(); return; }
    }

    const _bs = S.birdSizeScale;
    const bx  = S.bird.x - 20 * _bs, by = S.bird.y - 14 * _bs;
    const bw  = 40 * _bs,             bh = 28 * _bs;
    const pw  = 60;
    if (!(S.activePowerup && S.activePowerup.type === 'rocket_boost') && p.pipeIndex !== 30) {
      if (rectsOverlap(bx, by, bw, bh, p.x, 0, pw, p.topH))                          { triggerTopDeath();    return; }
      if (rectsOverlap(bx, by, bw, bh, p.x, p.topH + PIPE_GAP, pw, S.canvas.height - p.topH - PIPE_GAP)) { triggerBottomDeath(); return; }
    }
  }

  S.particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.vy += 0.1; });
  S.particles = S.particles.filter(p => p.life > 0);

  if (S.gameMode === 'single') { updateMarioCubes(); updatePowerup(); }
}

// ---- Multiplayer per-player update ----
export function updateMultiPlayer(p) {
  if (!p.bird.alive) { p.timer++; return; }
  p.speed = 1 + p.score * 0.05;
  p.bird.vy    += GRAVITY;
  p.bird.y     += p.bird.vy;
  p.bird.angle  = Math.max(-0.4, Math.min(Math.PI / 2, p.bird.vy * 0.06));
  if (p.bird.y <= 0) { p.bird.y = 0; p.bird.vy = 0; }
  if (p.bird.y >= S.canvas.height - 60 - 20) {
    p.bird.y    = S.canvas.height - 60 - 20;
    p.bird.alive = false; p.dead = true; p.deathType = 'bottom'; return;
  }
  if (S.frame % Math.round(110 / p.speed) === 0 && p.pipesSpawned < 31) {
    const minTop = 80, maxTop = S.canvas.height - 120 - PIPE_GAP;
    const topH   = minTop + Math.random() * (maxTop - minTop);
    const variant = pickPipeVariant(p.pipesSpawned);
    p.pipes.push({ x: S.canvas.width + 20, topH, scored: false,
                   pipeIndex: p.pipesSpawned + 1, variant });
    p.pipesSpawned++;
  }
  for (let i = p.pipes.length - 1; i >= 0; i--) {
    const pipe = p.pipes[i];
    pipe.x -= 3 * p.speed;
    if (pipe.x + 60 < 0) { p.pipes.splice(i, 1); continue; }
    if (!pipe.scored && pipe.x + 60 < p.bird.x) {
      pipe.scored = true; p.score++;
      if (p.score >= WIN_SCORE) { p.bird.alive = false; p.won = true; return; }
    }
    const bx = p.bird.x - 20, by = p.bird.y - 14, bw = 40, bh = 28, pw = 60;
    if (rectsOverlap(bx, by, bw, bh, pipe.x, 0, pw, pipe.topH)) {
      p.bird.alive = false; p.dead = true; p.deathType = 'top'; return;
    }
    if (rectsOverlap(bx, by, bw, bh, pipe.x, pipe.topH + PIPE_GAP, pw, S.canvas.height - pipe.topH - PIPE_GAP)) {
      p.bird.alive = false; p.dead = true; p.deathType = 'bottom'; return;
    }
  }
  p.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.03; pt.vy += 0.1; });
  p.particles = p.particles.filter(pt => pt.life > 0);
}
