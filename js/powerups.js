// ============================================================
// powerups.js — Mario cube system + all powerup logic
// ============================================================

import { CUBE_SIZE, PIPE_GAP, WIN_SCORE } from './config.js';
import { S } from './state.js';
import { triggerBottomDeath, triggerWin, spawnExplosion } from './physics.js';

export function resetMarioPowerupSystem() {
  S.marioCubes         = [];
  S.activePowerup      = null;
  S.arrowProjectiles   = [];
  S.rocketProjectile   = null;
  S.rainDrops          = [];
  S.windPhase          = 0;
  S.powerupBanner      = null;
  S.lastCubeSpawnFrame = 0;
  S.birdSizeScale      = 1.0;
  S.rocketLauncherAmmo = 0;
}

export function newRainDrop(randomY) {
  return { x: Math.random() * S.canvas.width,
           y: randomY ? Math.random() * S.canvas.height : -10,
           speed: 6 + Math.random() * 5,
           len:   12 + Math.random() * 9 };
}

export function trySpawnMarioCube() {
  if (S.score < 1)            return;
  if (S.activePowerup)        return;
  if (S.marioCubes.length >= 1) return;
  if (S.frame - S.lastCubeSpawnFrame < 600) return;
  const pipeNearBird = S.pipes.some(p => p.x > 120 && p.x < 480);
  if (pipeNearBird) return;
  const y = 90 + Math.random() * 300;
  S.marioCubes.push({ x: S.canvas.width + 10, y, hit: false, hitAnim: 0, spent: false });
  S.lastCubeSpawnFrame = S.frame;
}

export function updateMarioCubes() {
  trySpawnMarioCube();
  for (let i = S.marioCubes.length - 1; i >= 0; i--) {
    const cube = S.marioCubes[i];
    if (!cube.hit) {
      cube.x -= 3 * S.speed;
    } else {
      cube.hitAnim++;
      if (cube.hitAnim > 45) cube.spent = true;
    }
    if (cube.x + CUBE_SIZE < 0 || cube.spent) { S.marioCubes.splice(i, 1); continue; }
    if (!cube.hit && S.bird.alive) {
      const bLeft  = S.bird.x - 20 * S.birdSizeScale;
      const bRight = S.bird.x + 20 * S.birdSizeScale;
      const bTop   = S.bird.y - 14 * S.birdSizeScale;
      const bBot   = S.bird.y + 14 * S.birdSizeScale;
      if (bRight > cube.x && bLeft < cube.x + CUBE_SIZE &&
          bBot > cube.y  && bTop < cube.y + CUBE_SIZE) {
        cube.hit = true; cube.hitAnim = 0;
        activatePowerup();
      }
    }
  }
}

export function activatePowerup() {
  if (S.activePowerup) return;
  const isObstacle = Math.random() < 0.5;
  const type = isObstacle
    ? ['moving_pipes', 'arrows', 'rain_wind'][Math.floor(Math.random() * 3)]
    : (Math.random() < 0.5 ? 'small_bird'
       : (Math.random() < 0.5 ? 'rocket_launcher' : 'rocket_boost'));

  const durations = {
    moving_pipes: 480, arrows: 420, rain_wind: 600,
    rocket_launcher: 900, small_bird: 480, rocket_boost: 200,
  };
  S.activePowerup = { type, timer: durations[type] };

  switch (type) {
    case 'moving_pipes':
      S.pipes.forEach(p => { p.baseTopH = p.topH; p.moveCycle = Math.random() * Math.PI * 2; });
      S.powerupBanner = { text: '⚠️ MOVING PIPES!',  color: '#FF6600', isAdvantage: false, timer: 320 };
      break;
    case 'arrows':
      S.arrowProjectiles = []; S.windPhase = 0;
      S.powerupBanner = { text: '⚠️ ARROW STORM!',   color: '#FF2200', isAdvantage: false, timer: 320 };
      break;
    case 'rain_wind':
      S.rainDrops = []; S.windPhase = 0;
      for (let i = 0; i < 65; i++) S.rainDrops.push(newRainDrop(true));
      S.powerupBanner = { text: '⚠️ STORM & WIND!',  color: '#4488ff', isAdvantage: false, timer: 320 };
      break;
    case 'rocket_launcher':
      S.rocketLauncherAmmo = 3; S.rocketProjectile = null;
      S.powerupBanner = { text: '🚀 ROCKET LAUNCHER! [S]', color: '#00dd44', isAdvantage: true, timer: 320 };
      break;
    case 'small_bird':
      S.birdSizeScale = 0.55;
      S.powerupBanner = { text: '🐤 TINY BIRD!',     color: '#FFD700', isAdvantage: true, timer: 320 };
      break;
    case 'rocket_boost':
      S.powerupBanner = { text: '🚀 ROCKET BOOST!',  color: '#FF8800', isAdvantage: true, timer: 320 };
      break;
  }
}

export function updatePowerup() {
  if (!S.activePowerup) return;
  S.activePowerup.timer--;

  switch (S.activePowerup.type) {
    case 'moving_pipes':
      S.pipes.forEach(p => {
        if (p.baseTopH !== undefined)
          p.topH = p.baseTopH + Math.sin(S.frame * 0.04 + (p.moveCycle || 0)) * 35;
      });
      break;

    case 'arrows':
      S.windPhase++;
      if (S.windPhase % 75 === 0) {
        const ay = 80 + Math.random() * (S.canvas.height - 200);
        S.arrowProjectiles.push({ x: S.canvas.width + 20, y: ay,
                                   vy: (Math.random() - 0.5) * 2.2,
                                   spd: 7 + Math.random() * 3 });
      }
      for (let i = S.arrowProjectiles.length - 1; i >= 0; i--) {
        const a = S.arrowProjectiles[i];
        a.x -= a.spd; a.y += a.vy;
        if (a.x < -30) { S.arrowProjectiles.splice(i, 1); continue; }
        if (S.bird.alive) {
          const bs = S.birdSizeScale;
          if (a.x >= S.bird.x - 20 * bs && a.x <= S.bird.x + 20 * bs &&
              a.y >= S.bird.y - 14 * bs && a.y <= S.bird.y + 14 * bs) {
            triggerBottomDeath();
          }
        }
      }
      break;

    case 'rain_wind':
      S.windPhase++;
      S.rainDrops.forEach(d => {
        d.y += d.speed;
        d.x += Math.sin(S.windPhase * 0.018) * 2;
        if (d.y > S.canvas.height) { d.y = -10; d.x = Math.random() * S.canvas.width; }
      });
      if (S.windPhase % 22 === 0 && S.bird.alive) S.bird.vy += (Math.random() - 0.35) * 2.8;
      if (S.bird.alive) S.bird.vy += 0.07;
      break;

    case 'rocket_launcher':
      if (S.rocketProjectile && S.rocketProjectile.active) {
        S.rocketProjectile.trail.push({ x: S.rocketProjectile.x, y: S.rocketProjectile.y });
        if (S.rocketProjectile.trail.length > 14) S.rocketProjectile.trail.shift();
        S.rocketProjectile.x += 14;
        for (let i = S.pipes.length - 1; i >= 0; i--) {
          const p = S.pipes[i];
          if (S.rocketProjectile.x >= p.x && S.rocketProjectile.x <= p.x + 60) {
            spawnExplosion(p.x + 30, p.topH + PIPE_GAP / 2, '#FF8800', 18);
            S.pipes.splice(i, 1);
            S.rocketProjectile.active = false;
            break;
          }
        }
        if (S.rocketProjectile.x > S.canvas.width + 40) S.rocketProjectile.active = false;
      }
      break;

    case 'rocket_boost':
      // pipe destruction handled inline in physics.js update loop
      break;

    case 'small_bird':
      // no per-frame logic needed
      break;
  }

  if (S.activePowerup.timer <= 0) {
    if (S.activePowerup.type === 'small_bird') S.birdSizeScale = 1.0;
    if (S.activePowerup.type === 'moving_pipes') {
      S.pipes.forEach(p => { if (p.baseTopH !== undefined) p.topH = p.baseTopH; });
    }
    S.activePowerup      = null;
    S.arrowProjectiles   = [];
    S.rocketProjectile   = null;
    S.rocketLauncherAmmo = 0;
  }
}
