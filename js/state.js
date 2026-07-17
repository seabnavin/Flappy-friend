// ============================================================
// state.js — single mutable state object shared across modules
// ============================================================

import { CANVAS_W, CANVAS_H } from './config.js';

export const S = {
  // ----- canvas -----
  canvas: null,
  ctx:    null,

  // ----- game meta -----
  gameMode:  'single',   // 'single' | 'multi'
  theme:     'nature',
  photoImg:  null,
  gameState: 'menu',     // 'menu' | 'countdown' | 'playing' | 'win' | 'dead'
  highScore: parseInt(localStorage.getItem('flappyHighScore') || '0', 10),

  // ----- per-round -----
  score:  0,
  frame:  0,
  speed:  1,
  rafId:  null,

  // ----- bird -----
  bird:         { x: 200, y: 300, vy: 0, angle: 0, alive: true },
  birdFlapFrame: -999,
  birdSizeScale: 1.0,

  // ----- pipes -----
  pipes:         [],
  pipesSpawned:  0,
  lastPipeTopH:  null,

  // ----- particles / effects -----
  particles: [],
  poopItems: [],

  // ----- chaser -----
  chaser: null,

  // ----- death state -----
  birdDead:        false,
  deathType:       null,
  birdFire:        false,
  birdFired:       false,
  birdDizzy:       false,
  birdDizzyTimer:  0,
  friedChicken:    false,
  topDeathPhase:   null,
  topDeathTimer:   0,
  birdScale:       1,
  topDeathExploded: false,

  // ----- poop-slide -----
  poopSlideActive: false,
  poopSlideY:      0,
  poopSlideDone:   false,

  // ----- little man (bottom-death) -----
  littleMan: null,

  // ----- theme death animations -----
  eagleAttackState: null,
  marioBasketState: null,
  iceFreeze:        null,

  // ----- win -----
  winDance:           false,
  danceFrame:         0,
  crownY:             -80,
  winReturnBtnVisible: false,

  // ----- countdown -----
  countdownVal:      3,
  countdownInterval: null,

  // ----- power-ups -----
  marioCubes:          [],
  activePowerup:       null,
  arrowProjectiles:    [],
  rocketProjectile:    null,
  rainDrops:           [],
  windPhase:           0,
  powerupBanner:       null,
  lastCubeSpawnFrame:  0,
  rocketLauncherAmmo:  0,

  // ----- multiplayer -----
  multiL:                null,
  multiR:                null,
  multiGameOver:         false,
  multiCountdownInterval: null,
};

// Derived constant that needs canvas dims — set once canvas is initialised
export const WIN_RETURN_BTN = { x: CANVAS_W / 2 - 130, y: CANVAS_H - 100, w: 260, h: 55 };
