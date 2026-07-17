const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = 720;
canvas.height = 640;

// ---- Constants ----
const GRAVITY = 0.45;
const FLAP = -8;
const PIPE_GAP = 160;
const WIN_SCORE = 30;

// ---- Theme config ----
const themes = {
  nature:   { bg: ['#70c5ce', '#70c5ce'], ground: '#ded895', name: 'OG',      pillarType: 'normal'  },
  desert:   { bg: ['#f4a460', '#c2956c'], ground: '#c2956c', name: 'Desert',   pillarType: 'cactus'  },
  mountain: { bg: ['#aad4f5', '#d0eaff'], ground: '#e8e8e8', name: 'Mountain', pillarType: 'icicle'  },
};

// ---- High Score ----
let highScore = parseInt(localStorage.getItem('flappyHighScore') || '0', 10);

function checkAndSaveHighScore(currentScore) {
  if (currentScore > highScore) {
    const prev = highScore;
    highScore = currentScore;
    localStorage.setItem('flappyHighScore', highScore);
    return prev;
  }
  return null;
}

function showRecordModal(currentScore, prevBest) {
  const modal = document.getElementById('record-modal');
  document.getElementById('record-msg').textContent = `Your new best: ${currentScore} 🎯`;
  document.getElementById('record-prev').textContent = prevBest > 0 ? `Previous best was: ${prevBest}` : `First record set!`;
  modal.style.display = 'flex';
}

function closeRecordModal() {
  document.getElementById('record-modal').style.display = 'none';
}

// ---- State ----
let gameMode = 'single'; // 'single' | 'multi'
let theme = 'nature';
let photoImg = null;
let gameState = 'menu';
let score = 0;
let frame = 0;
let speed = 1;
let pipes = [];
let particles = [];
let poopItems = [];
let littleMan = null;
let birdFire = false;
let birdFired = false;
let birdDizzy = false;
let birdDizzyTimer = 0;
let birdDead = false;
let deathType = null;
let friedChicken = false;
let poopSlideActive = false;
let poopSlideY = 0;
let poopSlideDone = false;
let winDance = false;
let danceFrame = 0;
let eagleAttackState = null; // eagle swoop-and-grab animation after fried chicken (desert only)
let marioBasketState = null; // OG theme: Mario picks up chicken in a basket and runs off
let iceFreeze = null;         // Mountain theme: { timer, progress, done } — chicken freezes solid
let birdFlapFrame = -999; // frame when last flap happened (for wing animation)
// ---- Mario Cube Power-up state (single-player) ----
let marioCubes = [];
let activePowerup = null;     // { type, timer } — see activatePowerup()
let arrowProjectiles = [];    // [ { x, y, vy, spd } ] obstacle
let rocketProjectile = null;  // { x, y, trail[], active } advantage
let rainDrops = [];           // rain/wind obstacle
let windPhase = 0;
let powerupBanner = null;     // { text, color, isAdvantage, timer }
let lastCubeSpawnFrame = 0;
let birdSizeScale = 1.0;      // 1.0 normal, 0.55 tiny-bird
let rocketLauncherAmmo = 0;
let rafId = null;
let topDeathPhase = null; // 'grow' | 'alert' | 'explode' | 'brown'
let topDeathTimer = 0;
let birdScale = 1;
let topDeathExploded = false;
let chaser = null;
let crownY = -80;
let winReturnBtnVisible = false;
const WIN_RETURN_BTN = { x: canvas.width / 2 - 130, y: canvas.height - 100, w: 260, h: 55 };

let bird = { x: 200, y: 300, vy: 0, angle: 0, alive: true };
let countdownVal = 3;
let countdownInterval = null;

// ---- Input ----
document.addEventListener('keydown', e => {
  if (e.code === 'Space') handleFlap();
  // Multiplayer controls
  if (e.code === 'KeyQ' && gameMode === 'multi' && gameState === 'playing' && multiL && multiL.bird.alive) {
    multiL.bird.vy = FLAP;
    multiL.birdFlapFrame = frame;
  }
  if (e.code === 'KeyL' && gameMode === 'multi' && gameState === 'playing' && multiR && multiR.bird.alive) {
    multiR.bird.vy = FLAP;
    multiR.birdFlapFrame = frame;
  }
  // Rocket launcher fire (single player)
  if (e.code === 'KeyS' && gameMode === 'single' && gameState === 'playing'
      && activePowerup && activePowerup.type === 'rocket_launcher'
      && rocketLauncherAmmo > 0 && !rocketProjectile) {
    rocketLauncherAmmo--;
    rocketProjectile = { x: bird.x + 30, y: bird.y, trail: [], active: true };
    if (rocketLauncherAmmo <= 0) activePowerup.timer = Math.min(activePowerup.timer, 120);
  }
});
canvas.addEventListener('click', handleCanvasClick);

function handleFlap() {
  if (gameMode === 'multi') return; // Space/click does nothing in multi mode
  if (gameState === 'playing' && bird.alive) {
    bird.vy = FLAP;
    birdFlapFrame = frame; // record when flap happened for wing animation
  }
}

function handleCanvasClick(e) {
  if (gameState === 'win' && winReturnBtnVisible) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const b = WIN_RETURN_BTN;
    if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
      showWinScreen(); return;
    }
  }
  handleFlap();
}

// ---- Photo upload ----
document.getElementById('photoInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (ev) {
    const img = new Image();
    img.onload = () => { photoImg = img; };
    img.src = ev.target.result;
    const prev = document.getElementById('photoPreview');
    prev.src = ev.target.result;
    prev.style.display = 'inline-block';
  };
  reader.readAsDataURL(file);
});

// ---- Theme selection ----
function setTheme(t) {
  theme = t;
  ['nature', 'desert', 'mountain'].forEach(n => {
    document.getElementById('btn-' + n).classList.toggle('active', n === t);
  });
}

// ---- Game start / reset ----
function startGame() {
  if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
  cancelAnimationFrame(rafId);
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('score-display').style.display = 'none';
  score = 0; frame = 0; speed = 1;
  pipesSpawned = 0;
  lastPipeTopH = null;
  birdFlapFrame = -999;
  bird = { x: 200, y: 300, vy: 0, angle: 0, alive: true };
  pipes = [];
  particles = [];
  poopItems = [];
  littleMan = null;
  birdFire = false; birdFired = false; birdDizzy = false; birdDizzyTimer = 0; birdDead = false;
  deathType = null; friedChicken = false;
  poopSlideActive = false; poopSlideY = 0; poopSlideDone = false;
  topDeathPhase = null; topDeathTimer = 0; birdScale = 1; topDeathExploded = false;
  chaser = { x: bird.x - 140, y: bird.y, state: 'chase', fleeVx: 0, fleeVy: 0, alpha: 1, ashParticles: [], ashTimer: 0, ashSpawnDone: false };
  crownY = -80; winReturnBtnVisible = false;
  winDance = false; danceFrame = 0;
  eagleAttackState = null;
  marioBasketState = null;
  iceFreeze = null;
  resetMarioPowerupSystem();
  document.getElementById('poop-overlay').style.display = 'none';
  document.getElementById('scoreVal').textContent = '0';
  document.getElementById('speedVal').textContent = '1.0';
  gameState = 'countdown';
  countdownVal = 3;
  loop();
  let tick = 3;
  countdownInterval = setInterval(() => {
    tick--;
    countdownVal = tick;
    if (tick <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      gameState = 'playing';
    }
  }, 1000);
}

// ---- Pipe spawning ----
let pipesSpawned = 0;
let lastPipeTopH = null; // tracks previous pipe height for smooth randomization

// Variant lookup per theme — every 3rd pipe is a special type
function pickPipeVariant(index) {
  if (theme === 'nature') {
    // alternate: normal, normal, minecraft_tree, normal, normal, minecraft_tree...
    return (index % 3 === 2) ? 'minecraft_tree' : 'normal';
  } else if (theme === 'desert') {
    return 'cactus'; // only cactus — no trees
  } else if (theme === 'mountain') {
    return (index % 3 === 2) ? 'spruce_tree' : 'icicle';
  }
  return 'normal';
}

function spawnPipe() {
  if (pipesSpawned >= 31) return;
  const minTop = 80;
  const maxTop = canvas.height - 120 - PIPE_GAP;
  // Constrain next pipe to be within 120px of the last one so the gap never jumps wildly
  let topH;
  if (lastPipeTopH === null) {
    topH = minTop + Math.random() * (maxTop - minTop);
  } else {
    const maxStep = 120;
    const lo = Math.max(minTop, lastPipeTopH - maxStep);
    const hi = Math.min(maxTop, lastPipeTopH + maxStep);
    topH = lo + Math.random() * (hi - lo);
  }
  lastPipeTopH = topH;
  const variant = pickPipeVariant(pipesSpawned);
  const newPipe = { x: canvas.width + 20, topH, scored: false, pipeIndex: pipesSpawned + 1, variant };
  if (activePowerup && activePowerup.type === 'moving_pipes') {
    newPipe.baseTopH = topH;
    newPipe.moveCycle = Math.random() * Math.PI * 2;
  }
  pipes.push(newPipe);
  pipesSpawned++;
}

// ---- Collision ----
function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---- Death triggers ----
function triggerTopDeath() {
  deathType = 'top';
  bird.alive = false;
  birdDead = true;
  topDeathPhase = 'grow';
  topDeathTimer = 0;
  birdScale = 1;
  topDeathExploded = false;
  if (chaser) { chaser.state = 'flee'; chaser.fleeVx = -3 + (Math.random()-0.5)*3; chaser.fleeVy = -8 - Math.random()*4; }
}

function triggerBottomDeath() {
  deathType = 'bottom';
  bird.alive = false;
  bird.vy = 0; // freeze bird in air
  birdDead = true;
  littleMan = {
    x: canvas.width + 30,          // starts off-screen right
    y: canvas.height - 50,
    targetX: 600,                  // far right side — long shot across the screen to bird at x=200
    state: 'walking',              // 'walking' | 'aiming' | 'fired'
    aimTimer: 0,
    bullet: { x: 0, y: 0, vx: 0, vy: 0, active: false }
  };
  birdFired = false;
  birdFire = false;
  if (chaser) { chaser.state = 'flee'; chaser.fleeVx = -3 + (Math.random()-0.5)*3; chaser.fleeVy = 7 + Math.random()*4; }
}

// ---- Particles ----
function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 2 + Math.random() * 4;
    particles.push({ x, y, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, life: 1, color, size: 4 + Math.random() * 6 });
  }
}

// ---- Win ----
function triggerWin() {
  bird.alive = false;
  winDance = true;
  gameState = 'win';
  pipes = [];
  winReturnBtnVisible = false;
  crownY = -80;
  if (chaser) {
    chaser.state = 'ash';
    chaser.ashTimer = 0;
    chaser.ashSpawnDone = false;
    chaser.alpha = 1;
  }
}

// ---- Screen helpers ----
function showDeathScreen() {
  gameState = 'dead';
  cancelAnimationFrame(rafId);
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = deathType === 'top' ? '💩 Pooped Out!' : '🍗 Fried Chicken!';
  const msg = deathType === 'top'
    ? 'You hit a top pillar and pooped everywhere!'
    : 'You hit a bottom pillar and got fried!';
  ov.querySelector('p').textContent = `Score: ${score} | ${msg}`;
  document.getElementById('startBtn').textContent = '🔄 Restart';
  const prevBest = checkAndSaveHighScore(score);
  if (prevBest !== null) {
    setTimeout(() => showRecordModal(score, prevBest), 400);
  }
}

function showWinScreen() {
  gameState = 'dead';
  cancelAnimationFrame(rafId);
  winDance = false;
  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = '\u{1F3C6} You Win!';
  ov.querySelector('p').textContent = `Amazing! Score: ${score}! You're the champion!`;
  document.getElementById('startBtn').textContent = '\u25B6 Play Again';
  const prevBest = checkAndSaveHighScore(score);
  if (prevBest !== null) {
    setTimeout(() => showRecordModal(score, prevBest), 600);
  }
}

// ---- Update ----
function update() {
  frame++;
  speed = 1 + score * 0.05;
  document.getElementById('speedVal').textContent = speed.toFixed(1);
  if (chaser) updateChaser();

  if (!bird.alive) {
    if (deathType === 'top') {
      topDeathTimer++;
      if (topDeathPhase === 'grow') {
        birdScale = 1 + (topDeathTimer / 80) * 4.5;
        if (topDeathTimer >= 80) { topDeathPhase = 'alert'; topDeathTimer = 0; }
      } else if (topDeathPhase === 'alert') {
        if (topDeathTimer >= 75) { topDeathPhase = 'explode'; topDeathTimer = 0; }
      } else if (topDeathPhase === 'explode') {
        if (!topDeathExploded) {
          topDeathExploded = true;
          const eColors = ['#7b4f2e','#a06030','#5a3620','#c8a060','#3d2010','#8B4513','#D2691E'];
          for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = 4 + Math.random() * 14; // faster burst so particles fly outward and disperse
            particles.push({ x: bird.x, y: bird.y, vx: Math.cos(angle)*spd, vy: Math.sin(angle)*spd, life: 1, color: eColors[Math.floor(Math.random()*eColors.length)], size: 3 + Math.random() * 8 });
          }
          // Poop slide does NOT start yet — wait until 'brown' phase
        }
        particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.life-=0.018; p.vy+=0.12; });
        particles = particles.filter(p => p.life > 0);
        if (topDeathTimer >= 60) { topDeathPhase = 'brown'; topDeathTimer = 0; particles = []; } // clear lingering explosion bits so slide is the brownification
      } else if (topDeathPhase === 'brown') {
        particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.life-=0.025; p.vy+=0.15; });
        particles = particles.filter(p => p.life > 0);
        // NOW start the poop slide from the top — after explosion has fully played
        if (!poopSlideActive) {
          poopSlideActive = true;
          poopSlideY = 0;
          poopSlideDone = false;
        }
        if (poopSlideActive && !poopSlideDone) {
          poopSlideY += 5; // slow dramatic drip down the screen
          if (poopSlideY >= canvas.height + 80) {
            poopSlideDone = true;
            setTimeout(showDeathScreen, 700);
          }
        }
      }
      return;
    }

    if (deathType === 'bottom') {
      // Bird hovers gently in the air until shot
      if (!birdFired && !birdDizzy) {
        bird.y += Math.sin(frame * 0.08) * 0.3;
      }

      if (littleMan) {
        if (littleMan.state === 'walking') {
          littleMan.x -= 1.0; // very slow walk
          if (littleMan.x <= littleMan.targetX) {
            littleMan.x = littleMan.targetX;
            littleMan.state = 'aiming';
            littleMan.aimTimer = 80; // ~1.3s aim pause before firing
          }
        } else if (littleMan.state === 'aiming') {
          littleMan.aimTimer--;
          if (littleMan.aimTimer <= 0) {
            littleMan.state = 'fired';
            // Fire bullet toward bird
            const gunX = littleMan.x - 22;
            const gunY = littleMan.y - 18;
            const dx = bird.x - gunX;
            const dy = bird.y - gunY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            littleMan.bullet.x = gunX;
            littleMan.bullet.y = gunY;
            littleMan.bullet.vx = (dx / dist) * 4.2; // fast enough to cross long distance while still visible
            littleMan.bullet.vy = (dy / dist) * 4.2;
            littleMan.bullet.active = true;
          }
        }

        if (littleMan.bullet.active) {
          littleMan.bullet.x += littleMan.bullet.vx;
          littleMan.bullet.y += littleMan.bullet.vy;
          const dx = littleMan.bullet.x - bird.x;
          const dy = littleMan.bullet.y - bird.y;
          if (Math.sqrt(dx * dx + dy * dy) < 28) {
            littleMan.bullet.active = false;
            birdDizzy = true;
            birdDizzyTimer = 0;
          }
        }
      }

      // Dizzy phase after being hit by boxing glove — bird staggers wildly
      if (birdDizzy && !birdFired) {
        birdDizzyTimer++;
        // Erratic multi-frequency sway — looks very disoriented
        bird.y += Math.sin(frame * 0.16) * 1.8 + Math.sin(frame * 0.39) * 0.7;
        bird.angle = Math.sin(birdDizzyTimer * 0.32) * 1.15 + Math.sin(birdDizzyTimer * 0.17) * 0.45;
        if (birdDizzyTimer >= 200) {
          birdDizzy = false;
          birdFired = true;
          bird.vy = 0.5;
        }
      }

      if (birdFired) {
        bird.vy += GRAVITY * 0.35; // slow fall
        bird.y += bird.vy;
        bird.angle += 0.06; // spin faster
        if (bird.y >= canvas.height - 60 - 20) {
          bird.y = canvas.height - 60 - 20;
          if (!birdFire) {
            birdFire = true;
            const _t = theme, _bx = bird.x, _by = bird.y;
            setTimeout(() => {
              friedChicken = true;
              // Wait 3.5s then trigger the theme-specific animation
              setTimeout(() => {
                if (_t === 'desert') {
                  // Desert: eagle swoops in and grabs the chicken
                  eagleAttackState = { x: canvas.width + 40, y: -60, phase: 'approach', timer: 0, grabX: _bx, grabY: _by };
                } else if (_t === 'nature') {
                  // OG: Mario runs in, scoops chicken into basket, runs away
                  marioBasketState = { x: canvas.width + 30, phase: 'walk_in', timer: 0, targetX: _bx + 22, chickenX: _bx, chickenY: _by };
                } else if (_t === 'mountain') {
                  // Mountain: chicken slowly freezes solid from bottom to top
                  iceFreeze = { timer: 0, progress: 0, done: false };
                }
              }, 3500);
            }, 1000);
          }
        }
      }

      // Eagle attack state machine
      if (eagleAttackState) {
        const e = eagleAttackState;
        e.timer++;
        if (e.phase === 'approach') {
          const dx = e.grabX - e.x;
          const dy = e.grabY - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            e.phase = 'grab';
            e.timer = 0;
            friedChicken = false; // chicken snatched by eagle
          } else {
            const spd = 8;
            e.x += (dx / dist) * spd;
            e.y += (dy / dist) * spd;
          }
        } else if (e.phase === 'grab') {
          if (e.timer > 25) { e.phase = 'escape'; e.timer = 0; }
        } else if (e.phase === 'escape') {
          e.x += 9;
          e.y -= 5;
          if (e.x > canvas.width + 150) {
            eagleAttackState = null;
            showDeathScreen();
          }
        }
      }

      // Mario basket state machine (OG theme)
      if (marioBasketState) {
        const mb = marioBasketState;
        mb.timer++;
        if (mb.phase === 'walk_in') {
          mb.x -= 2.5;
          if (mb.x <= mb.targetX) { mb.x = mb.targetX; mb.phase = 'pickup'; mb.timer = 0; }
        } else if (mb.phase === 'pickup') {
          if (mb.timer === 25) friedChicken = false; // chicken scooped into basket
          if (mb.timer >= 70) { mb.phase = 'walk_out'; mb.timer = 0; }
        } else if (mb.phase === 'walk_out') {
          mb.x += 3.5;
          if (mb.x > canvas.width + 120) { marioBasketState = null; showDeathScreen(); }
        }
      }

      // Ice freeze state machine (Mountain theme)
      if (iceFreeze && !iceFreeze.done) {
        iceFreeze.timer++;
        iceFreeze.progress = Math.min(1, iceFreeze.timer / 210); // ~3.5s at 60fps to fully freeze
        if (iceFreeze.progress >= 1) {
          iceFreeze.done = true;
          setTimeout(showDeathScreen, 1000);
        }
      }
    }

    return;
  }

  // Bird physics
  bird.vy += GRAVITY;
  bird.y += bird.vy;
  bird.angle = Math.max(-0.4, Math.min(Math.PI / 2, bird.vy * 0.06));

  if (bird.y <= 0) { bird.y = 0; bird.vy = 0; }
  if (bird.y >= canvas.height - 60 - 20) { triggerBottomDeath(); return; }

  // Spawn pipes
  if (frame % Math.round(110 / speed) === 0) spawnPipe();

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    // Rocket boost: pipes rush at 6× speed
    const pipeSpd = (activePowerup && activePowerup.type === 'rocket_boost') ? 18 : 3 * speed;
    p.x -= pipeSpd;
    if (p.x + 60 < 0) { pipes.splice(i, 1); continue; }

    // Moving pipes obstacle: oscillate topH
    if (activePowerup && activePowerup.type === 'moving_pipes' && p.baseTopH !== undefined) {
      p.topH = p.baseTopH + Math.sin(frame * 0.04 + (p.moveCycle || 0)) * 35;
    }

    // Rocket boost: destroy pipes at bird's x
    if (activePowerup && activePowerup.type === 'rocket_boost') {
      if (p.x < bird.x + 40 && p.x + 60 > bird.x - 20) {
        // Score the pipe before destroying it
        if (!p.scored) {
          p.scored = true;
          score++;
          document.getElementById('scoreVal').textContent = score;
          if (score >= WIN_SCORE) { triggerWin(); return; }
        }
        spawnExplosion(p.x + 30, p.topH + PIPE_GAP / 2, '#FF8800', 15);
        pipes.splice(i, 1);
        continue;
      }
    }

    if (!p.scored && p.x + 60 < bird.x) {
      p.scored = true;
      score++;
      document.getElementById('scoreVal').textContent = score;
      if (score >= WIN_SCORE) { triggerWin(); return; }
    }

    const _bs = birdSizeScale;
    const bx = bird.x - 20 * _bs, by = bird.y - 14 * _bs, bw = 40 * _bs, bh = 28 * _bs;
    const pw = 60;
    // Bird is immune during rocket boost, and pipe 30 is the finish line (no collision)
    if (!(activePowerup && activePowerup.type === 'rocket_boost') && p.pipeIndex !== 30) {
      if (rectsOverlap(bx, by, bw, bh, p.x, 0, pw, p.topH)) { triggerTopDeath(); return; }
      if (rectsOverlap(bx, by, bw, bh, p.x, p.topH + PIPE_GAP, pw, canvas.height - p.topH - PIPE_GAP)) { triggerBottomDeath(); return; }
    }
  }

  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= 0.03; p.vy += 0.1; });
  particles = particles.filter(p => p.life > 0);

  if (gameMode === 'single') { updateMarioCubes(); updatePowerup(); }
}
function drawBackground() {
  const t = themes[theme];
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, t.bg[0]);
  grad.addColorStop(1, t.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (theme === 'nature') drawBgNature();
  else if (theme === 'desert') drawBgDesert();
  else if (theme === 'mountain') drawBgMountain();

  ctx.fillStyle = t.ground;
  ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
  ctx.fillStyle = theme === 'mountain' ? '#fff' : (theme === 'desert' ? '#b8864e' : '#5a8a00');
  ctx.fillRect(0, canvas.height - 60, canvas.width, 8);

  drawCeilingDecorations();
  drawFloorDecorations();
}

function drawBgNature() {
  // === SUN with rays ===
  const sx = canvas.width - 65, sy = 58;
  // outer glow
  const sglow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 80);
  sglow.addColorStop(0, 'rgba(255,248,120,0.6)');
  sglow.addColorStop(1, 'rgba(255,230,50,0)');
  ctx.fillStyle = sglow;
  ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI*2); ctx.fill();
  // animated rays
  ctx.save();
  ctx.strokeStyle = 'rgba(255,220,60,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + frame * 0.005;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a)*28, sy + Math.sin(a)*28);
    ctx.lineTo(sx + Math.cos(a)*58, sy + Math.sin(a)*58);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFEE70';
  ctx.beginPath(); ctx.arc(sx - 7, sy - 7, 12, 0, Math.PI*2); ctx.fill();

  // === FAR ROLLING HILLS ===
  ctx.fillStyle = 'rgba(60,110,8,0.22)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 60);
  ctx.bezierCurveTo(100, canvas.height - 180, 240, canvas.height - 130, 380, canvas.height - 200);
  ctx.bezierCurveTo(500, canvas.height - 250, 620, canvas.height - 150, canvas.width, canvas.height - 160);
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  ctx.fillStyle = 'rgba(70,130,10,0.32)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - 60);
  ctx.bezierCurveTo(60, canvas.height - 145, 160, canvas.height - 115, 250, canvas.height - 165);
  ctx.bezierCurveTo(340, canvas.height - 210, 420, canvas.height - 135, canvas.width, canvas.height - 115);
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  // === MARIO ? BLOCKS ===
  [[145,180],[290,130],[430,165],[560,145]].forEach(([bx2,by2],i) => {
    const bounce = Math.sin(frame*0.045+i*1.2)*2;
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(bx2-13,by2-12+bounce+3,26,26);
    ctx.fillStyle = '#e09000'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2;
    ctx.fillRect(bx2-13,by2-12+bounce,26,26); ctx.strokeRect(bx2-13,by2-12+bounce,26,26);
    ctx.fillStyle = '#b86800';
    ctx.fillRect(bx2-11,by2-10+bounce,22,3); ctx.fillRect(bx2-11,by2+9+bounce,22,3);
    ctx.fillRect(bx2-11,by2-10+bounce,3,22); ctx.fillRect(bx2+8,by2-10+bounce,3,22);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?',bx2,by2+2+bounce); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  });

  // === FLOATING COINS ===
  [185,208,231,492,515,538].forEach((cx2,i) => {
    const cy2 = 113 + Math.sin(frame*0.05+i*0.85)*5;
    ctx.fillStyle = 'rgba(255,220,0,0.22)'; ctx.beginPath(); ctx.arc(cx2,cy2,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#c08800'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx2,cy2,5.5,8,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(cx2-1.5,cy2-2,2,4,0,0,Math.PI*2); ctx.fill();
  });

  // === BACKGROUND MARIO PIPES ===
  [[55,canvas.height-108],[686,canvas.height-92]].forEach(([px,py]) => {
    ctx.fillStyle = 'rgba(45,130,0,0.36)'; ctx.strokeStyle = 'rgba(30,90,0,0.36)'; ctx.lineWidth = 2;
    ctx.fillRect(px-11,canvas.height-60,22,60);
    ctx.fillRect(px-15,py,30,16); ctx.strokeRect(px-15,py,30,16);
    ctx.fillStyle = 'rgba(80,200,0,0.2)'; ctx.fillRect(px-11,py+3,10,9);
  });

  // === STAR COINS in air ===
  [[360,95],[610,105]].forEach(([sx2,sy2],i) => {
    const sOff = Math.sin(frame*0.04+i)*4;
    ctx.save(); ctx.translate(sx2,sy2+sOff);
    ctx.fillStyle = 'rgba(255,200,0,0.3)'; ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#aa6600'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for(let sp=0;sp<5;sp++){const a=(sp/5)*Math.PI*2-Math.PI/2,ia=a+Math.PI/5;
      sp===0?ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10):ctx.lineTo(Math.cos(a)*10,Math.sin(a)*10);
      ctx.lineTo(Math.cos(ia)*4.5,Math.sin(ia)*4.5);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  });

  // === DETAILED CLOUDS ===
  [[80, 80, 42], [210, 58, 50], [355, 85, 36], [500, 62, 44], [620, 75, 30]].forEach(([cx, cy, r]) => {
    // shadow layer
    ctx.fillStyle = 'rgba(190,210,230,0.5)';
    ctx.beginPath(); ctx.arc(cx + 4, cy + 6, r * 0.85, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r*0.65, cy + 14, r*0.72, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r*0.45, cy + 14, r*0.65, 0, Math.PI*2); ctx.fill();
    // main white
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r*0.62, cy + 8, r*0.72, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r*0.47, cy + 10, r*0.65, 0, Math.PI*2); ctx.fill();
    // bright top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(cx - 4, cy - 6, r * 0.38, 0, Math.PI*2); ctx.fill();
  });

  // === BIRDS in sky ===
  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
  [[148,118],[163,110],[290,92],[306,98],[450,130],[464,124]].forEach(([bx2,by2]) => {
    ctx.beginPath();
    ctx.moveTo(bx2-9,by2); ctx.quadraticCurveTo(bx2-4,by2-6,bx2,by2);
    ctx.quadraticCurveTo(bx2+4,by2-6,bx2+9,by2); ctx.stroke();
  });

  // === RAINBOW (subtle) ===
  const rainbowColors = ['rgba(255,0,0,0.07)','rgba(255,140,0,0.07)','rgba(255,255,0,0.06)','rgba(0,200,0,0.06)','rgba(0,100,255,0.06)','rgba(130,0,200,0.05)'];
  rainbowColors.forEach((c, ri) => {
    ctx.strokeStyle = c; ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(80, canvas.height - 60, 200 + ri * 14, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  });
}

function drawBgDesert() {
  // === HOT SUN with pulsing glow ===
  const sx = canvas.width - 72, sy = 72;
  const pulse = 0.92 + Math.sin(frame * 0.02) * 0.08;
  const sglow = ctx.createRadialGradient(sx, sy, 12, sx, sy, 95 * pulse);
  sglow.addColorStop(0, 'rgba(255,200,60,0.65)');
  sglow.addColorStop(0.5, 'rgba(255,120,20,0.3)');
  sglow.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.fillStyle = sglow;
  ctx.beginPath(); ctx.arc(sx, sy, 95, 0, Math.PI*2); ctx.fill();
  // rotating rays
  ctx.save();
  ctx.strokeStyle = 'rgba(255,165,0,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + frame * 0.004;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a)*36, sy + Math.sin(a)*36);
    ctx.lineTo(sx + Math.cos(a)*68, sy + Math.sin(a)*68);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#FF6B00'; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFAA00'; ctx.beginPath(); ctx.arc(sx-7, sy-7, 15, 0, Math.PI*2); ctx.fill();

  // === DISTANT PYRAMID ===
  const pyX = 80, pyBase = canvas.height - 60;
  ctx.fillStyle = 'rgba(185,130,70,0.55)';
  ctx.beginPath();
  ctx.moveTo(pyX, pyBase);
  ctx.lineTo(pyX + 70, pyBase);
  ctx.lineTo(pyX + 35, pyBase - 100);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(140,90,40,0.55)';
  ctx.beginPath();
  ctx.moveTo(pyX + 35, pyBase - 100);
  ctx.lineTo(pyX + 70, pyBase);
  ctx.lineTo(pyX + 35, pyBase);
  ctx.closePath(); ctx.fill();
  // pyramid highlight
  ctx.strokeStyle = 'rgba(220,180,100,0.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(pyX+35, pyBase-100); ctx.lineTo(pyX, pyBase); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pyX+35, pyBase-100); ctx.lineTo(pyX+70, pyBase); ctx.stroke();

  // === LAYERED MESAS ===
  ctx.fillStyle = 'rgba(155,90,45,0.4)';
  ctx.beginPath();
  ctx.moveTo(160, canvas.height-60);
  ctx.lineTo(160, canvas.height-200); ctx.lineTo(215, canvas.height-210);
  ctx.lineTo(250, canvas.height-165); ctx.lineTo(320, canvas.height-205);
  ctx.lineTo(380, canvas.height-150); ctx.lineTo(445, canvas.height-185);
  ctx.lineTo(500, canvas.height-140); ctx.lineTo(580, canvas.height-195);
  ctx.lineTo(640, canvas.height-145); ctx.lineTo(canvas.width, canvas.height-155);
  ctx.lineTo(canvas.width, canvas.height-60); ctx.closePath(); ctx.fill();

  ctx.fillStyle = 'rgba(190,115,55,0.45)';
  ctx.beginPath();
  ctx.moveTo(200, canvas.height-60);
  ctx.lineTo(200, canvas.height-145); ctx.lineTo(260, canvas.height-175);
  ctx.lineTo(310, canvas.height-135); ctx.lineTo(370, canvas.height-168);
  ctx.lineTo(425, canvas.height-128); ctx.lineTo(490, canvas.height-162);
  ctx.lineTo(545, canvas.height-125); ctx.lineTo(canvas.width, canvas.height-140);
  ctx.lineTo(canvas.width, canvas.height-60); ctx.closePath(); ctx.fill();

  // === SAND DUNES ===
  ctx.fillStyle = 'rgba(220,175,90,0.42)';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height-60);
  ctx.quadraticCurveTo(80, canvas.height-115, 170, canvas.height-60);
  ctx.quadraticCurveTo(255, canvas.height-100, 350, canvas.height-60);
  ctx.quadraticCurveTo(435, canvas.height-92, 530, canvas.height-60);
  ctx.quadraticCurveTo(620, canvas.height-85, canvas.width, canvas.height-60);
  ctx.lineTo(canvas.width, canvas.height-60); ctx.closePath(); ctx.fill();
  // dune shadow edges
  ctx.fillStyle = 'rgba(170,110,40,0.2)';
  ctx.beginPath();
  ctx.quadraticCurveTo(75, canvas.height-60, 165, canvas.height-60);
  ctx.quadraticCurveTo(130, canvas.height-75, 85, canvas.height-60); ctx.fill();

  // === HEAT SHIMMER ===
  ctx.save();
  ctx.strokeStyle = 'rgba(255,170,0,0.1)'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 6; i++) {
    const hy = canvas.height - 95 + i * 8;
    ctx.beginPath(); ctx.moveTo(0, hy);
    for (let hx2 = 0; hx2 <= canvas.width; hx2 += 18) {
      ctx.lineTo(hx2 + 9, hy + Math.sin((hx2 + frame*0.7)*0.1)*3);
    }
    ctx.stroke();
  }
  ctx.restore();

  // === SOARING BALD EAGLE ===
  {
    const eagleX = ((frame * 0.55 + 100) % (canvas.width + 180)) - 90;
    const eagleY = 78 + Math.sin(frame * 0.013) * 30;
    const wb = Math.sin(frame * 0.07) * 0.35;
    ctx.save();
    ctx.translate(eagleX, eagleY);
    // Left wing
    ctx.fillStyle = '#2e1a08';
    ctx.beginPath(); ctx.moveTo(-2,-3); ctx.quadraticCurveTo(-22,-24+wb*20,-50,-20+wb*15); ctx.quadraticCurveTo(-34,-8+wb*6,-2,3); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
    for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(-38-ft*10,-20+wb*15+ft*2); ctx.lineTo(-41-ft*10,-28+wb*15+ft*5); ctx.stroke();}
    // Right wing
    ctx.fillStyle = '#2e1a08';
    ctx.beginPath(); ctx.moveTo(2,-3); ctx.quadraticCurveTo(22,-24+wb*20,50,-20+wb*15); ctx.quadraticCurveTo(34,-8+wb*6,2,3); ctx.closePath(); ctx.fill();
    for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(38+ft*10,-20+wb*15+ft*2); ctx.lineTo(41+ft*10,-28+wb*15+ft*5); ctx.stroke();}
    // Body
    ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.ellipse(0,0,14,6,0,0,Math.PI*2); ctx.fill();
    // White head
    ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(13,-2,7,0,Math.PI*2); ctx.fill();
    // Yellow beak
    ctx.fillStyle = '#e8b000'; ctx.strokeStyle = '#c08000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(19,-2); ctx.lineTo(27,1); ctx.lineTo(19,3); ctx.closePath(); ctx.fill(); ctx.stroke();
    // Eye
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(16,-4,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16.8,-4.5,0.7,0,Math.PI*2); ctx.fill();
    // White tail
    ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.moveTo(-12,-1); ctx.lineTo(-26,-5); ctx.lineTo(-24,6); ctx.lineTo(-12,2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-26,0); ctx.stroke();
    ctx.restore();
  }

  // === WANTED POSTER ===
  {
    const wx=128, wy=canvas.height-190;
    ctx.fillStyle='rgba(228,192,138,0.48)'; ctx.strokeStyle='rgba(110,70,25,0.48)'; ctx.lineWidth=2;
    ctx.fillRect(wx,wy,64,80); ctx.strokeRect(wx,wy,64,80);
    ctx.fillStyle='rgba(150,75,0,0.48)'; ctx.font='bold 8px Arial'; ctx.textAlign='center';
    ctx.fillText('WANTED',wx+32,wy+13);
    ctx.fillStyle='rgba(70,35,0,0.4)'; ctx.beginPath(); ctx.arc(wx+32,wy+38,18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(150,75,0,0.45)'; ctx.font='7px Arial';
    ctx.fillText('DEAD OR ALIVE',wx+32,wy+66); ctx.fillText('$1000 REWARD',wx+32,wy+76);
    ctx.textAlign='left';
  }
}

function drawBgMountain() {
  // === AURORA BOREALIS streaks at top ===
  ctx.save();
  const auroraColors = [
    'rgba(0,220,160,0.12)', 'rgba(80,200,255,0.10)',
    'rgba(180,100,255,0.09)', 'rgba(0,255,180,0.08)'
  ];
  auroraColors.forEach((c, ai) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const waveOff = frame * 0.004 + ai * 0.8;
    for (let ax = 0; ax <= canvas.width; ax += 10) {
      const ay = 30 + ai * 18 + Math.sin(ax * 0.015 + waveOff) * 22 + Math.sin(ax * 0.03 + waveOff * 1.3) * 12;
      if (ax === 0) ctx.moveTo(ax, ay); else ctx.lineTo(ax, ay);
    }
    ctx.lineTo(canvas.width, 0); ctx.closePath(); ctx.fill();
  });
  ctx.restore();

  // === FURTHEST mountain range (hazy blue) ===
  ctx.fillStyle = 'rgba(140,170,210,0.35)';
  ctx.beginPath(); ctx.moveTo(0, canvas.height - 60);
  const farPeaks = [[0,0.38],[40,0.18],[95,0.34],[150,0.14],[210,0.38],[270,0.10],[330,0.32],[395,0.15],[455,0.40],[510,0.12],[565,0.35],[620,0.18],[680,0.38],[720,0.28]];
  farPeaks.forEach(([mx, mh]) => ctx.lineTo(mx, (canvas.height - 60) * (1 - mh)));
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  // === MID mountain range ===
  ctx.fillStyle = 'rgba(100,140,190,0.50)';
  ctx.beginPath(); ctx.moveTo(0, canvas.height - 60);
  const midPeaks = [[0,0.30],[55,0.10],[115,0.26],[175,0.07],[235,0.30],[295,0.08],[355,0.24],[415,0.10],[475,0.28],[535,0.09],[590,0.22],[645,0.12],[695,0.27],[720,0.20]];
  midPeaks.forEach(([mx, mh]) => ctx.lineTo(mx, (canvas.height - 60) * (1 - mh)));
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  // === SNOW CAPS on mid peaks ===
  const snowPeaks = [[55,0.10],[175,0.07],[295,0.08],[415,0.10],[535,0.09],[645,0.12]];
  snowPeaks.forEach(([mx, mh]) => {
    const peakY = (canvas.height - 60) * (1 - mh);
    // main snow mass
    ctx.fillStyle = 'rgba(240,250,255,0.85)';
    ctx.beginPath(); ctx.moveTo(mx, peakY); ctx.lineTo(mx - 22, peakY + 28); ctx.lineTo(mx + 22, peakY + 28); ctx.closePath(); ctx.fill();
    // shadow side
    ctx.fillStyle = 'rgba(180,210,240,0.5)';
    ctx.beginPath(); ctx.moveTo(mx, peakY); ctx.lineTo(mx + 22, peakY + 28); ctx.lineTo(mx + 10, peakY + 28); ctx.closePath(); ctx.fill();
    // bright highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(mx, peakY); ctx.lineTo(mx - 10, peakY + 16); ctx.lineTo(mx + 2, peakY + 16); ctx.closePath(); ctx.fill();
  });

  // === NEAR foreground ridge (darker blue-green) ===
  ctx.fillStyle = 'rgba(60,95,140,0.45)';
  ctx.beginPath(); ctx.moveTo(0, canvas.height - 60);
  [[0,0.18],[80,0.05],[160,0.14],[240,0.03],[310,0.12],[385,0.06],[460,0.15],[535,0.04],[610,0.13],[685,0.07],[720,0.15]].forEach(([mx, mh]) => {
    ctx.lineTo(mx, (canvas.height - 60) * (1 - mh));
  });
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  // === PINE TREE SILHOUETTES on foreground ridge ===
  const pinePositions = [20, 68, 108, 280, 328, 378, 540, 600, 658, 704];
  pinePositions.forEach((px, i) => {
    const ph = 36 + (i % 3) * 10;  // shorter
    const pw2 = 20 + (i % 2) * 10; // wider boughs
    const pineY = canvas.height - 62;
    ctx.fillStyle = `rgba(20,55,30,${0.55 + (i%2)*0.1})`;
    ctx.beginPath(); ctx.moveTo(px, pineY - ph); ctx.lineTo(px - pw2, pineY - ph*0.45); ctx.lineTo(px + pw2, pineY - ph*0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, pineY - ph*0.52); ctx.lineTo(px - pw2*1.4, pineY - ph*0.12); ctx.lineTo(px + pw2*1.4, pineY - ph*0.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px, pineY - ph*0.22); ctx.lineTo(px - pw2*1.65, pineY + 2); ctx.lineTo(px + pw2*1.65, pineY + 2); ctx.closePath(); ctx.fill();
    // snow on bough tips
    ctx.fillStyle = 'rgba(220,240,255,0.5)';
    ctx.beginPath(); ctx.moveTo(px, pineY - ph); ctx.lineTo(px - pw2*0.22, pineY - ph*0.62); ctx.lineTo(px + pw2*0.22, pineY - ph*0.62); ctx.closePath(); ctx.fill();
    // trunk
    ctx.fillStyle = 'rgba(50,30,10,0.5)';
    ctx.fillRect(px - 3, pineY - ph*0.2, 6, ph*0.2 + 2);
  });

  // === DETAILED CLOUDS (puffy, shaded) ===
  [[55, 65, 36], [190, 48, 44], [350, 68, 32], [500, 55, 38], [650, 62, 28]].forEach(([cx, cy, r]) => {
    ctx.fillStyle = 'rgba(195,215,240,0.5)';
    ctx.beginPath(); ctx.arc(cx+4, cy+7, r*0.82, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.58, cy+13, r*0.7, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(240,248,255,0.88)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.58, cy+8, r*0.7, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx-r*0.48, cy+10, r*0.65, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(cx-4, cy-7, r*0.35, 0, Math.PI*2); ctx.fill();
  });

  // === ANIMATED SNOWFLAKES (falling) ===
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 22; i++) {
    const sfx = (i * 33 + frame * 0.5) % canvas.width;
    const sfy = (i * 55 + frame * 1.2) % (canvas.height - 90);
    const sfr = 1.2 + (i % 3) * 0.8;
    ctx.beginPath(); ctx.arc(sfx, sfy, sfr, 0, Math.PI*2); ctx.fill();
  }
  // larger slow snowflakes
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (let i = 0; i < 8; i++) {
    const sfx = (i * 88 + frame * 0.2) % canvas.width;
    const sfy = (i * 73 + frame * 0.45) % (canvas.height - 90);
    ctx.beginPath(); ctx.arc(sfx, sfy, 3, 0, Math.PI*2); ctx.fill();
  }
}

function drawCeilingDecorations() {
  if (theme === 'nature') {
    ctx.strokeStyle = '#2d7a00'; ctx.lineWidth = 2;
    [20, 60, 105, 155, 205, 255, 305, 355, 400, 445, 490, 535, 580, 625, 670, 710].forEach(vx => {
      const vlen = 18 + Math.sin(vx * 0.12) * 8;
      ctx.beginPath(); ctx.moveTo(vx, 0); ctx.quadraticCurveTo(vx + 6, vlen * 0.5, vx + 9, vlen); ctx.stroke();
      ctx.fillStyle = '#3da800';
      ctx.beginPath(); ctx.ellipse(vx + 9, vlen, 7, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    });
  } else if (theme === 'desert') {
    [18, 60, 105, 155, 200, 250, 300, 348, 395, 440, 485, 530, 575, 620, 665, 710].forEach(rx => {
      const rh = 10 + Math.sin(rx * 0.17) * 7;
      ctx.fillStyle = '#a07850';
      ctx.beginPath(); ctx.moveTo(rx - 12, 0); ctx.lineTo(rx, rh); ctx.lineTo(rx + 12, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8a6540';
      ctx.beginPath(); ctx.moveTo(rx - 6, 0); ctx.lineTo(rx, rh - 3); ctx.lineTo(rx + 6, 0); ctx.closePath(); ctx.fill();
    });
  } else if (theme === 'mountain') {
    ctx.strokeStyle = 'rgba(100,180,255,0.5)'; ctx.lineWidth = 1;
    [12, 42, 78, 118, 158, 200, 244, 290, 334, 378, 420, 460, 500, 540, 580, 620, 660, 700].forEach(ix => {
      const ih = 14 + Math.sin(ix * 0.22) * 9;
      ctx.fillStyle = 'rgba(210,235,255,0.8)';
      ctx.beginPath(); ctx.moveTo(ix - 8, 0); ctx.lineTo(ix, ih); ctx.lineTo(ix + 8, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle = 'rgba(230,245,255,0.55)';
    [28, 60, 98, 138, 180, 222, 267, 312, 356, 399, 440, 480, 520, 560, 600, 640, 680, 715].forEach(ix => {
      const ih = 6 + Math.sin(ix * 0.3) * 3;
      ctx.beginPath(); ctx.moveTo(ix - 4, 0); ctx.lineTo(ix, ih); ctx.lineTo(ix + 4, 0); ctx.closePath(); ctx.fill();
    });
  }
}

function drawFloorDecorations() {
  const gy = canvas.height - 60;
  if (theme === 'nature') {
    // Grass tufts
    ctx.strokeStyle = '#3d7000'; ctx.lineWidth = 1.5;
    [12, 50, 90, 130, 170, 210, 255, 298, 340, 382, 422, 460, 500, 540, 580, 620, 660, 700].forEach(tx => {
      [-2,-1,0,1,2].forEach(i => {
        const h = 8 + Math.abs(i) * 3;
        ctx.beginPath(); ctx.moveTo(tx + i * 4, gy - 8); ctx.lineTo(tx + i * 5, gy - 8 - h); ctx.stroke();
      });
    });
    // Flowers
    [30, 100, 185, 270, 358, 445, 520, 595, 665, 710].forEach(fx => {
      for (let a = 0; a < 5; a++) {
        const pa = (a / 5) * Math.PI * 2;
        ctx.fillStyle = a % 2 === 0 ? '#fff' : '#FFD6E7';
        ctx.beginPath(); ctx.arc(fx + Math.cos(pa) * 5, gy - 4 + Math.sin(pa) * 5, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(fx, gy - 4, 3, 0, Math.PI * 2); ctx.fill();
    });
    // === MARIO MUSHROOMS ===
    [55, 175, 310, 455, 590, 695].forEach((mx, i) => {
      // Stem
      ctx.fillStyle = '#f0eedd'; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
      ctx.fillRect(mx-5, gy-16, 10, 12); ctx.strokeRect(mx-5, gy-16, 10, 12);
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(mx-2,gy-12,2,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx+2,gy-9,1.5,0,Math.PI*2); ctx.fill();
      // Cap
      const capCol = i%2===0 ? '#e82010' : '#e87010';
      ctx.fillStyle = capCol;
      ctx.beginPath(); ctx.arc(mx, gy-20, 12, Math.PI, 0); ctx.fill();
      ctx.beginPath(); ctx.ellipse(mx, gy-16, 12, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#900'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(mx, gy-20, 12, Math.PI, 0); ctx.stroke();
      // White spots
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(mx-5, gy-23, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx+5, gy-23, 3, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(mx, gy-27, 2.5, 0, Math.PI*2); ctx.fill();
    });
  } else if (theme === 'desert') {
    // Rocks
    [[18,14,9],[78,11,8],[155,13,10],[248,15,10],[338,12,8],[428,14,9],[510,13,9],[588,14,10],[658,12,8],[708,13,9]].forEach(([rx,rw,rh]) => {
      ctx.fillStyle = '#a07850'; ctx.beginPath(); ctx.ellipse(rx, gy - rh * 0.4, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c09868'; ctx.beginPath(); ctx.ellipse(rx - 3, gy - rh * 0.5, rw * 0.5, rh * 0.5, -0.3, 0, Math.PI * 2); ctx.fill();
    });
    // Cracks in ground
    ctx.strokeStyle = 'rgba(140,90,40,0.45)'; ctx.lineWidth = 1;
    [[35,60],[130,175],[225,275],[318,370],[400,440],[480,530],[560,610],[630,680]].forEach(([x1,x2]) => {
      const mid = (x1 + x2) / 2;
      ctx.beginPath(); ctx.moveTo(x1, gy + 18); ctx.lineTo(mid, gy + 28); ctx.lineTo(x2, gy + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mid, gy + 28); ctx.lineTo(mid - 10, gy + 38); ctx.stroke();
    });
    // === ROLLING TUMBLEWEEDS ===
    [0, 1, 2, 3, 4].forEach(i => {
      const speed2 = 0.7 + i * 0.18;
      const roll = ((frame * speed2 + i * 148) % (canvas.width + 80)) - 40;
      const twSize = 14 + (i % 3) * 5;
      ctx.save();
      ctx.translate(roll, gy - twSize * 0.65);
      ctx.rotate(frame * 0.025 * speed2);
      // Intertwined branch loops
      ctx.strokeStyle = '#7a5510'; ctx.lineWidth = 1.8;
      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI;
        ctx.beginPath(); ctx.ellipse(0, 0, twSize, twSize * 0.38, a, 0, Math.PI * 2); ctx.stroke();
      }
      // Outer shadow ring
      ctx.strokeStyle = 'rgba(90,55,10,0.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, twSize, 0, Math.PI * 2); ctx.stroke();
      // Twig tips
      ctx.fillStyle = '#6a4808';
      for (let ti = 0; ti < 8; ti++) {
        const ta = (ti / 8) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(Math.cos(ta)*twSize*0.72, Math.sin(ta)*twSize*0.72, 2, 0, Math.PI*2); ctx.fill();
      }
      // Ground shadow
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.ellipse(roll, gy, twSize * 0.9, 4, 0, 0, Math.PI*2); ctx.fill();
    });
  } else if (theme === 'mountain') {
    // Snow mounds
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    [22, 80, 148, 218, 290, 360, 430, 500, 568, 635, 700].forEach(sx => {
      ctx.beginPath(); ctx.ellipse(sx, gy, 28, 13, 0, Math.PI, Math.PI * 2); ctx.fill();
    });
    // Small pine trees
    ctx.fillStyle = 'rgba(20,75,20,0.75)';
    [8, 52, 116, 195, 265, 338, 415, 468, 530, 592, 650, 708].forEach(tx => {
      ctx.beginPath(); ctx.moveTo(tx, gy - 28); ctx.lineTo(tx - 15, gy - 8); ctx.lineTo(tx + 15, gy - 8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx, gy - 16); ctx.lineTo(tx - 19, gy + 1); ctx.lineTo(tx + 19, gy + 1); ctx.closePath(); ctx.fill();
    });
    // === CHRISTMAS PRESENTS ===
    [[40,18],[118,22],[200,16],[288,20],[375,18],[460,22],[545,16],[625,20],[700,18]].forEach(([px, ph], i) => {
      const pw = ph + 4;
      const py = gy - ph;
      // Box shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(px-pw/2+3, py+3, pw, ph);
      // Box body
      const boxColors = ['#e82020','#2060e8','#20a820','#e89020','#a020e8'];
      ctx.fillStyle = boxColors[i % boxColors.length];
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
      ctx.fillRect(px-pw/2, py, pw, ph); ctx.strokeRect(px-pw/2, py, pw, ph);
      // Lid
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(px-pw/2, py, pw, ph*0.28);
      // Ribbon vertical
      ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#aa8800'; ctx.lineWidth = 0.8;
      ctx.fillRect(px-2, py, 4, ph); ctx.strokeRect(px-2, py, 4, ph);
      // Ribbon horizontal
      ctx.fillRect(px-pw/2, py+ph*0.28-2, pw, 4); ctx.strokeRect(px-pw/2, py+ph*0.28-2, pw, 4);
      // Bow
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.ellipse(px-4, py-2, 4, 3, -0.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(px+4, py-2, 4, 3, 0.5, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#FFEE44';
      ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI*2); ctx.fill();
    });
  }
}

// ---- Draw: Pipes ----
function drawPipe(pipe) {
  const pw = 60;
  // Pipe 30 is the finish line — no obstacle body, just the checkered banner
  if (pipe.pipeIndex === 30) {
    const fx = pipe.x + pw / 2;
    const finishTop = 0;
    const finishBottom = canvas.height - 60;
    const finishH = finishBottom - finishTop;
    const squareSize = 20;
    const cols = 2;
    const bannerW = cols * squareSize;
    const rows = Math.ceil(finishH / squareSize);
    ctx.save();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const isWhite = (row + col) % 2 === 0;
        ctx.fillStyle = isWhite ? '#ffffff' : '#000000';
        ctx.fillRect(fx - bannerW / 2 + col * squareSize, finishTop + row * squareSize, squareSize, squareSize);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(fx - bannerW / 2, finishTop, bannerW, finishH);
    const gapMid = canvas.height / 2;
    const pulse = 0.8 + Math.abs(Math.sin(frame * 0.08)) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('🏁 FINISH', fx, gapMid);
    ctx.fillText('🏁 FINISH', fx, gapMid);
    ctx.restore();
    return;
  }
  const v = pipe.variant || 'normal';
  if (v === 'cactus') {
    drawCactus(pipe.x, pipe.topH, pw, true);
    drawCactus(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  } else if (v === 'icicle') {
    drawIcicle(pipe.x, pipe.topH, pw, true);
    drawIcicle(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  } else if (v === 'minecraft_tree') {
    drawMinecraftTree(pipe.x, pipe.topH, pw, true);
    drawMinecraftTree(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  } else if (v === 'spruce_tree') {
    drawSpruceTree(pipe.x, pipe.topH, pw, true);
    drawSpruceTree(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  } else if (v === 'palm_bundle') {
    drawPalmBundle(pipe.x, pipe.topH, pw, true);
    drawPalmBundle(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  } else {
    drawNormalPipe(pipe.x, pipe.topH, pw, true);
    drawNormalPipe(pipe.x, pipe.topH + PIPE_GAP, pw, false, canvas.height - pipe.topH - PIPE_GAP - 60);
  }
  // Checkpoint flags on 10th and 20th pillar
  if (pipe.pipeIndex === 10 || pipe.pipeIndex === 20) {
    const label = pipe.pipeIndex === 10 ? '10' : '20';
    const flagX = pipe.x + pw / 2;
    const gapMid = pipe.topH + PIPE_GAP / 2;
    ctx.save();
    // Pole
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(flagX, pipe.topH + 8);
    ctx.lineTo(flagX, pipe.topH + PIPE_GAP - 8);
    ctx.stroke();
    // Top flag
    const fw = 36, fh = 22;
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(flagX, pipe.topH + 8);
    ctx.lineTo(flagX + fw, pipe.topH + 8 + fh / 2);
    ctx.lineTo(flagX, pipe.topH + 8 + fh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a7a42'; ctx.lineWidth = 1;
    ctx.stroke();
    // Flag number text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, flagX + fw * 0.38, pipe.topH + 8 + fh / 2);
    // Bottom flag (mirrored)
    ctx.fillStyle = '#27ae60';
    ctx.beginPath();
    ctx.moveTo(flagX, pipe.topH + PIPE_GAP - 8);
    ctx.lineTo(flagX + fw, pipe.topH + PIPE_GAP - 8 - fh / 2);
    ctx.lineTo(flagX, pipe.topH + PIPE_GAP - 8 - fh);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1a7a42'; ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(label, flagX + fw * 0.38, pipe.topH + PIPE_GAP - 8 - fh / 2);
    ctx.restore();
  }


}

function drawNormalPipe(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;
  // Main shaft
  ctx.fillStyle = '#75b300'; ctx.strokeStyle = '#5a8a00'; ctx.lineWidth = 3;
  ctx.fillRect(x + 5, startY, w - 10, actualH);
  ctx.strokeRect(x + 5, startY, w - 10, actualH);
  // Highlight stripe
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 9, startY, 7, actualH);
  // Rivets along edges
  ctx.fillStyle = '#4a7000';
  for (let ry = startY + 18; ry < startY + actualH - 8; ry += 28) {
    ctx.beginPath(); ctx.arc(x + 11, ry, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 11, ry, 3, 0, Math.PI * 2); ctx.fill();
  }
  // Vine wrapping
  ctx.strokeStyle = '#2d7a00'; ctx.lineWidth = 1.5;
  for (let vy = startY + 12; vy < startY + actualH - 8; vy += 22) {
    ctx.beginPath();
    ctx.moveTo(x + 5, vy); ctx.quadraticCurveTo(x + w / 2, vy + 11, x + w - 5, vy + 3); ctx.stroke();
    ctx.fillStyle = '#4db800';
    ctx.beginPath(); ctx.ellipse(x + w / 2 + 2, vy + 13, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  // Cap
  ctx.fillStyle = '#75b300'; ctx.strokeStyle = '#5a8a00'; ctx.lineWidth = 3;
  const capY = isTop ? y - 20 : y;
  ctx.fillRect(x, capY, w, 20); ctx.strokeRect(x, capY, w, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 4, capY + 4, w - 8, 7);
}

function drawCactus(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;
  // Main shaft
  ctx.fillStyle = '#2d8a00'; ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 2;
  ctx.fillRect(x + 10, startY, w - 20, actualH);
  ctx.strokeRect(x + 10, startY, w - 20, actualH);
  // Horizontal ridges
  ctx.strokeStyle = '#1a6000'; ctx.lineWidth = 1.5;
  for (let ry = startY + 10; ry < startY + actualH - 4; ry += 11) {
    ctx.beginPath(); ctx.moveTo(x + 10, ry); ctx.lineTo(x + w - 10, ry); ctx.stroke();
  }
  // Thorns along sides
  ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 1;
  for (let ty = startY + 8; ty < startY + actualH - 5; ty += 12) {
    ctx.beginPath(); ctx.moveTo(x + 10, ty); ctx.lineTo(x + 3, ty - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, ty + 6); ctx.lineTo(x + 3, ty + 11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - 10, ty); ctx.lineTo(x + w - 3, ty - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - 10, ty + 6); ctx.lineTo(x + w - 3, ty + 11); ctx.stroke();
  }
  // Arms
  ctx.fillStyle = '#2d8a00'; ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 2;
  if (isTop) {
    ctx.fillRect(x, y - 50, 18, 30); ctx.strokeRect(x, y - 50, 18, 30);
    ctx.fillRect(x + w - 18, y - 70, 18, 30); ctx.strokeRect(x + w - 18, y - 70, 18, 30);
    ctx.strokeStyle = '#1a6000'; ctx.lineWidth = 1.5;
    for (let ry = y - 48; ry < y - 22; ry += 8) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + 18, ry); ctx.stroke(); }
    drawCactusFlower(x + 9, y - 52);
    drawCactusFlower(x + w - 9, y - 72);
    drawCactusFlower(x + w / 2, y - 2);
  } else {
    ctx.fillRect(x, y + 20, 18, 30); ctx.strokeRect(x, y + 20, 18, 30);
    ctx.fillRect(x + w - 18, y + 40, 18, 30); ctx.strokeRect(x + w - 18, y + 40, 18, 30);
    ctx.strokeStyle = '#1a6000'; ctx.lineWidth = 1.5;
    for (let ry = y + 22; ry < y + 48; ry += 8) { ctx.beginPath(); ctx.moveTo(x, ry); ctx.lineTo(x + 18, ry); ctx.stroke(); }
    drawCactusFlower(x + 9, y + 52);
    drawCactusFlower(x + w - 9, y + 72);
    drawCactusFlower(x + w / 2, y + 2);
  }
}

function drawIcicle(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;

  // --- SHAFT: gradient for ice depth ---
  const iceGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  iceGrad.addColorStop(0,   '#5a9fcf');
  iceGrad.addColorStop(0.18,'#d8f0ff');
  iceGrad.addColorStop(0.45,'#eafaff');
  iceGrad.addColorStop(0.75,'#b0d8f0');
  iceGrad.addColorStop(1,   '#4a88ba');
  ctx.fillStyle = iceGrad;
  ctx.strokeStyle = '#4a88ba'; ctx.lineWidth = 2;
  ctx.fillRect(x + 5, startY, w - 10, actualH);
  ctx.strokeRect(x + 5, startY, w - 10, actualH);

  // Bright highlight strip
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(x + 10, startY, 7, actualH);

  // Secondary shimmer strip
  ctx.fillStyle = 'rgba(200,240,255,0.2)';
  ctx.fillRect(x + w - 20, startY, 6, actualH);

  // Ice crack network
  ctx.strokeStyle = 'rgba(120,200,240,0.55)'; ctx.lineWidth = 1;
  const crackData = [
    [x+18, 18, 10, 16],  [x+38, 12, -8, 18],
    [x+50, 20,  7, 14],  [x+24, 16, -5, 20],
    [x+44, 10,  9, 12],
  ];
  crackData.forEach(([cx2, cy2off, dx2, dy2]) => {
    for (let ry = startY + cy2off; ry < startY + actualH - 10; ry += 44) {
      ctx.beginPath();
      ctx.moveTo(cx2, ry);
      ctx.lineTo(cx2 + dx2, ry + dy2);
      ctx.lineTo(cx2 + dx2 * 0.4, ry + dy2 * 1.6);
      ctx.stroke();
    }
  });

  // Horizontal frost bands
  ctx.strokeStyle = 'rgba(210,240,255,0.4)'; ctx.lineWidth = 1;
  for (let ly = startY + 10; ly < startY + actualH - 5; ly += 18) {
    ctx.beginPath(); ctx.moveTo(x + 5, ly); ctx.lineTo(x + w - 5, ly); ctx.stroke();
  }

  // Embedded snowflakes
  ctx.strokeStyle = 'rgba(180,225,255,0.75)'; ctx.lineWidth = 1.5;
  for (let isy = startY + 30; isy < startY + actualH - 20; isy += 48) {
    drawSnowflake(x + w / 2, isy, 9);
  }

  // --- ICICLE SPIKES ---
  const spikes = 5;
  const sw = (w - 10) / spikes;
  for (let i = 0; i < spikes; i++) {
    const sx2 = x + 5 + i * sw;
    // vary lengths for natural look
    const spikeLen = 18 + [12, 22, 30, 18, 26][i];
    const spikeGrad = ctx.createLinearGradient(sx2, 0, sx2 + sw, 0);
    spikeGrad.addColorStop(0,   '#8ac8e8');
    spikeGrad.addColorStop(0.3, '#e8f8ff');
    spikeGrad.addColorStop(1,   '#6aacd0');
    ctx.fillStyle = spikeGrad;
    ctx.strokeStyle = '#4a88ba'; ctx.lineWidth = 1;
    if (isTop) {
      ctx.beginPath();
      ctx.moveTo(sx2,          y);
      ctx.lineTo(sx2 + sw/2,   y + spikeLen);
      ctx.lineTo(sx2 + sw,     y);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.moveTo(sx2,          y);
      ctx.lineTo(sx2 + sw/2,   y - spikeLen);
      ctx.lineTo(sx2 + sw,     y);
      ctx.closePath();
    }
    ctx.fill(); ctx.stroke();
    // spike highlight
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    if (isTop) {
      ctx.moveTo(sx2 + sw*0.22, y);
      ctx.lineTo(sx2 + sw*0.32, y + spikeLen*0.55);
      ctx.lineTo(sx2 + sw*0.42, y);
    } else {
      ctx.moveTo(sx2 + sw*0.22, y);
      ctx.lineTo(sx2 + sw*0.32, y - spikeLen*0.55);
      ctx.lineTo(sx2 + sw*0.42, y);
    }
    ctx.closePath(); ctx.fill();
    // drip/water droplet at spike tip
    ctx.fillStyle = 'rgba(180,230,255,0.8)';
    const tipY = isTop ? y + spikeLen : y - spikeLen;
    ctx.beginPath(); ctx.arc(sx2 + sw/2, tipY + (isTop ? 4 : -4), 2.5, 0, Math.PI*2); ctx.fill();
  }

  // --- CAP/RIM ---
  const capGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  capGrad.addColorStop(0,   '#6aacd0');
  capGrad.addColorStop(0.3, '#d8f0ff');
  capGrad.addColorStop(1,   '#5a9fcf');
  ctx.fillStyle = capGrad;
  ctx.strokeStyle = '#4a88ba'; ctx.lineWidth = 2;
  const capY = isTop ? y - 22 : y;
  ctx.fillRect(x, capY, w, 22); ctx.strokeRect(x, capY, w, 22);

  // Snow/frost on rim
  ctx.fillStyle = 'rgba(235,250,255,0.85)';
  if (isTop) {
    // snow mounds along top cap
    for (let sx3 = x; sx3 < x + w - 4; sx3 += 10) {
      ctx.beginPath(); ctx.arc(sx3 + 5, capY + 4, 5, Math.PI, 0); ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 4, capY + 3, w - 8, 8);
}

// ---- Draw: Oak Tree pillar (nature theme) ----
function drawMinecraftTree(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;
  const cx = x + w / 2;

  // Thick gnarled oak trunk
  const trunkW = 22, trunkX = x + (w - trunkW) / 2;
  const tGrad = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0, '#4a2c08');
  tGrad.addColorStop(0.3, '#7a4e1c');
  tGrad.addColorStop(0.65, '#6a4218');
  tGrad.addColorStop(1, '#321808');
  ctx.fillStyle = tGrad;
  ctx.fillRect(trunkX, startY, trunkW, actualH);
  // Bark grooves
  ctx.strokeStyle = '#2e1a04'; ctx.lineWidth = 1;
  for (let by2 = startY + 8; by2 < startY + actualH; by2 += 12) {
    ctx.beginPath();
    ctx.moveTo(trunkX + 3, by2);
    ctx.quadraticCurveTo(cx, by2 + 5, trunkX + trunkW - 3, by2 + 1);
    ctx.stroke();
  }
  ctx.strokeStyle = '#2e1a04'; ctx.lineWidth = 2;
  ctx.strokeRect(trunkX, startY, trunkW, actualH);

  // Wide, bulky rounded oak canopy at gap end
  const R = w * 0.94 + 4; // ~61px radius for w=60 — very wide and bulky
  const canopyY = isTop ? y - R * 0.20 : y + R * 0.20;

  // Drop shadow
  ctx.fillStyle = 'rgba(15,60,5,0.30)';
  ctx.beginPath(); ctx.arc(cx + 5, canopyY + 7, R, 0, Math.PI * 2); ctx.fill();

  // Main canopy mass (deep forest green)
  ctx.fillStyle = '#1e6a0a';
  ctx.beginPath(); ctx.arc(cx, canopyY, R, 0, Math.PI * 2); ctx.fill();

  // Wide side lobes for natural irregular shape
  ctx.fillStyle = '#1a5e08';
  ctx.beginPath(); ctx.arc(cx - R * 0.58, canopyY + R * 0.20, R * 0.78, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + R * 0.58, canopyY + R * 0.20, R * 0.78, 0, Math.PI * 2); ctx.fill();

  // Mid-layer lighter green
  ctx.fillStyle = '#308a14';
  ctx.beginPath(); ctx.arc(cx - R * 0.30, canopyY - R * 0.08, R * 0.66, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + R * 0.30, canopyY - R * 0.08, R * 0.66, 0, Math.PI * 2); ctx.fill();

  // Top highlight clusters (bright spring green)
  ctx.fillStyle = '#48b81e';
  ctx.beginPath(); ctx.arc(cx, canopyY - R * 0.36, R * 0.46, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - R * 0.24, canopyY - R * 0.46, R * 0.32, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + R * 0.22, canopyY - R * 0.44, R * 0.30, 0, Math.PI * 2); ctx.fill();

  // Sunlit specular
  ctx.fillStyle = 'rgba(110,230,40,0.20)';
  ctx.beginPath(); ctx.arc(cx - R * 0.10, canopyY - R * 0.26, R * 0.18, 0, Math.PI * 2); ctx.fill();
}

// ---- Draw: Fir Tree pillar (mountain theme) ----
function drawSpruceTree(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;
  const cx = x + w / 2;

  // Thick fir trunk
  const trunkW = 16, trunkX = x + (w - trunkW) / 2;
  const tGrad = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0, '#2e1e08'); tGrad.addColorStop(0.4, '#4e3218'); tGrad.addColorStop(1, '#201008');
  ctx.fillStyle = tGrad;
  ctx.fillRect(trunkX, startY, trunkW, actualH);
  ctx.strokeStyle = '#180c04'; ctx.lineWidth = 2;
  ctx.strokeRect(trunkX, startY, trunkW, actualH);

  // Wide layered fir boughs — 5 tiers, tip at gap, widening away from gap
  const numBoughs = 5;
  const maxBW = w * 2.1;  // very wide outermost bough
  for (let bi = 0; bi < numBoughs; bi++) {
    const progress = bi / (numBoughs - 1); // 0=tip at gap, 1=widest away from gap
    const bw = maxBW * (0.22 + progress * 0.78);
    const bh = 18 + progress * 10;
    let tipY, baseY;
    if (isTop) {
      tipY = y - bi * 18;       // tip closest to gap, stacked upward
      baseY = tipY - bh;
    } else {
      tipY = y + bi * 18;       // tip closest to gap, stacked downward
      baseY = tipY + bh;
    }
    const green = Math.floor(68 + progress * 24);
    ctx.fillStyle = `rgb(22, ${green}, 22)`;
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - bw / 2, baseY);
    ctx.lineTo(cx + bw / 2, baseY);
    ctx.closePath(); ctx.fill();

    // Snow cap near bough tip
    ctx.fillStyle = 'rgba(218,240,255,0.82)';
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - bw * 0.42, isTop ? baseY + bh * 0.28 : baseY - bh * 0.28);
    ctx.lineTo(cx + bw * 0.42, isTop ? baseY + bh * 0.28 : baseY - bh * 0.28);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = '#102810'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, tipY);
    ctx.lineTo(cx - bw / 2, baseY);
    ctx.lineTo(cx + bw / 2, baseY);
    ctx.closePath(); ctx.stroke();

    // Christmas lights along bough edges
    const lightColors = ['#ff2020','#20dd20','#2080ff','#FFD700','#ff80ff','#20ffee'];
    const numLights = Math.floor(bw / 18);
    for (let li = 0; li < numLights; li++) {
      const lt = (li + 0.5) / numLights;
      const lx = cx - bw/2 + bw * lt;
      const ly = isTop ? baseY + bh*0.08 : baseY - bh*0.08;
      const lColor = lightColors[(bi * numLights + li) % lightColors.length];
      // Wire
      ctx.strokeStyle = 'rgba(30,30,30,0.6)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(lx, isTop ? tipY + (baseY-tipY)*0.5 : tipY - (tipY-baseY)*0.5); ctx.lineTo(lx, ly); ctx.stroke();
      // Glow
      ctx.fillStyle = lColor.replace(')',',0.3)').replace('rgb','rgba');
      ctx.beginPath(); ctx.arc(lx, ly, 6, 0, Math.PI*2); ctx.fill();
      // Bulb
      ctx.fillStyle = lColor;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI*2); ctx.fill(); ctx.stroke();
      // Shine
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.arc(lx-1, ly-1, 1.2, 0, Math.PI*2); ctx.fill();
    }
  }
}

// ---- Draw: Baobab Tree pillar (desert theme) ----
function drawPalmBundle(x, y, w, isTop, h) {
  const actualH = isTop ? y : h;
  const startY = isTop ? 0 : y;
  const cx = x + w / 2;

  // Massive barrel-shaped baobab trunk — almost full width, bulging sides
  const trunkW = w - 2, trunkX = x + 1;
  const tGrad = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0, '#7a4e1e');
  tGrad.addColorStop(0.22, '#c08840');
  tGrad.addColorStop(0.52, '#b07830');
  tGrad.addColorStop(0.80, '#9a6428');
  tGrad.addColorStop(1, '#5e3410');
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  ctx.moveTo(trunkX, startY);
  ctx.bezierCurveTo(trunkX - 8, startY + actualH * 0.35, trunkX - 8, startY + actualH * 0.65, trunkX, startY + actualH);
  ctx.lineTo(trunkX + trunkW, startY + actualH);
  ctx.bezierCurveTo(trunkX + trunkW + 8, startY + actualH * 0.65, trunkX + trunkW + 8, startY + actualH * 0.35, trunkX + trunkW, startY);
  ctx.closePath(); ctx.fill();
  // Bark wrinkles
  ctx.strokeStyle = '#6a3e18'; ctx.lineWidth = 1.2;
  for (let by2 = startY + 10; by2 < startY + actualH - 6; by2 += 15) {
    ctx.beginPath(); ctx.moveTo(trunkX + 6, by2); ctx.quadraticCurveTo(cx, by2 + 5, trunkX + trunkW - 6, by2 + 2); ctx.stroke();
  }
  ctx.strokeStyle = '#4e2c0e'; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(trunkX, startY);
  ctx.bezierCurveTo(trunkX - 8, startY + actualH * 0.35, trunkX - 8, startY + actualH * 0.65, trunkX, startY + actualH);
  ctx.moveTo(trunkX + trunkW, startY);
  ctx.bezierCurveTo(trunkX + trunkW + 8, startY + actualH * 0.35, trunkX + trunkW + 8, startY + actualH * 0.65, trunkX + trunkW, startY + actualH);
  ctx.stroke();

  // Gnarly branches + leaf clusters at the gap end
  const rootY = isTop ? y : y;
  const branchAngles = isTop
    ? [-0.85, -0.38, 0.0, 0.38, 0.85]
    : [Math.PI + 0.85, Math.PI + 0.38, Math.PI, Math.PI - 0.38, Math.PI - 0.85];
  branchAngles.forEach((ba, bi) => {
    const bLen = 24 + (bi % 3) * 8;
    ctx.strokeStyle = '#7a4e20';
    ctx.lineWidth = 5 - bi * 0.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, rootY);
    const bex = cx + Math.cos(ba) * bLen;
    const bey = rootY + Math.sin(ba) * bLen;
    ctx.quadraticCurveTo(
      cx + Math.cos(ba) * bLen * 0.5,
      rootY + Math.sin(ba) * bLen * 0.5 + (isTop ? -6 : 6),
      bex, bey
    );
    ctx.stroke();
    // Full leaf clusters at branch tips — big and lush
    const leafR = 16 + (bi % 3) * 5;
    ctx.fillStyle = bi % 2 === 0 ? '#267008' : '#32880e';
    ctx.beginPath(); ctx.arc(bex, bey, leafR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(50,140,15,0.45)';
    ctx.beginPath(); ctx.arc(bex - 5, bey - 5, leafR * 0.60, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(80,180,20,0.28)';
    ctx.beginPath(); ctx.arc(bex - 3, bey - 8, leafR * 0.35, 0, Math.PI * 2); ctx.fill();
  });
}

function drawCactusFlower(fx, fy) {
  ctx.fillStyle = '#ff6b9d';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 4, 2.5, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
}

function drawSnowflake(sfx, sfy, sfsize) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(sfx, sfy); ctx.lineTo(sfx + Math.cos(a) * sfsize, sfy + Math.sin(a) * sfsize); ctx.stroke();
  }
}

// ---- Draw: Growing Poop Ball ----
function drawGrowingPoopBall(bx, by, scale) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.scale(scale, scale);
  const progress = (scale - 1) / 4.5;
  if (scale > 1.8) { ctx.shadowColor = 'rgba(60,20,0,0.55)'; ctx.shadowBlur = 18; }
  // Body: yellow-to-brown transition
  const cr = Math.floor(200 - progress * 110);
  const cg = Math.floor(150 - progress * 110);
  const cb = Math.floor(50 - progress * 35);
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgb(${Math.floor(cr*0.6)},${Math.floor(cg*0.5)},${Math.floor(cb*0.4)})`;
  ctx.lineWidth = 2 / scale; ctx.stroke();
  // Photo overlay fades out
  if (photoImg) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - progress * 1.6);
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(photoImg, -21, -21, 42, 42);
    ctx.restore();
  } else {
    const eyeR = 5 + progress * 2.5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(9, -5, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    if (progress < 0.45) {
      ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5 / scale;
      ctx.beginPath(); ctx.arc(2, 5, 7, 0, Math.PI); ctx.stroke();
    } else {
      ctx.fillStyle = '#c03000'; ctx.beginPath(); ctx.ellipse(2, 6, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff9090'; ctx.beginPath(); ctx.ellipse(2, 7, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Poop swirl appears after 40% growth
  if (progress > 0.4) {
    const sa = (progress - 0.4) / 0.6;
    ctx.save(); ctx.globalAlpha = sa;
    ctx.strokeStyle = '#4a2a08'; ctx.lineWidth = 2.5 / scale;
    ctx.beginPath(); ctx.arc(0, -5, 10, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(3, -10, 6, Math.PI, Math.PI * 2.1); ctx.stroke();
    ctx.restore();
  }
  // Panic speed lines after 70% growth
  if (progress > 0.7) {
    const la = (progress - 0.7) / 0.3;
    ctx.strokeStyle = `rgba(160,60,0,${la * 0.65})`;
    ctx.lineWidth = 1.5 / scale;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
      ctx.lineTo(Math.cos(a) * 35, Math.sin(a) * 35);
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

// ---- Draw: Poopy Alert ----
function drawPoopyAlert(timer) {
  ctx.fillStyle = `rgba(70,10,0,${Math.min(timer / 20, 0.35)})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const alertWords = [
    { text: 'POOPY ALERT!', x: canvas.width / 2, y: canvas.height / 2 - 35, size: 52, color: '#FF3300', outline: '#fff', delay: 3 },
    { text: 'Oh...', x: 72, y: 145, size: 34, color: '#CC2200', outline: 'rgba(255,255,255,0.8)', delay: 10 },
    { text: 'NO NO NO!', x: canvas.width - 78, y: 175, size: 28, color: '#AA1100', outline: 'rgba(255,255,255,0.8)', delay: 16 },
    { text: "It's time!", x: canvas.width / 2, y: canvas.height / 2 + 58, size: 30, color: '#CC2200', outline: 'rgba(255,255,255,0.8)', delay: 22 },
    { text: '!!!!', x: 48, y: canvas.height / 2 + 15, size: 42, color: '#EE2200', outline: 'rgba(255,255,255,0.8)', delay: 12 },
    { text: 'RUN!!!', x: canvas.width - 55, y: canvas.height / 2 - 55, size: 34, color: '#BB1100', outline: 'rgba(255,255,255,0.8)', delay: 28 },
    { text: '\u{1F4A9}\u{1F4A9}\u{1F4A9}', x: canvas.width / 2, y: canvas.height / 2 + 108, size: 28, color: '#7b4f2e', outline: 'transparent', delay: 40 },
  ];
  alertWords.forEach(w => {
    const elapsed = timer - w.delay;
    if (elapsed <= 0) return;
    const sc = elapsed < 10 ? (2.5 - elapsed * 0.15) : (1 + Math.sin(elapsed * 0.25 + w.delay) * 0.05);
    ctx.save();
    ctx.translate(w.x, w.y); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${w.size}px Arial`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12;
    if (w.outline !== 'transparent') {
      ctx.strokeStyle = w.outline; ctx.lineWidth = 5; ctx.strokeText(w.text, 0, 0);
    }
    ctx.fillStyle = w.color; ctx.fillText(w.text, 0, 0);
    ctx.restore();
  });
}

// ---- Draw: Bird ----
function drawBird(bx, by, angle, showFire, friedMode) {
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);

  if (friedMode) {
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍗', 0, 0);
    ctx.textBaseline = 'alphabetic';
  } else {
    // Wings only animate for ~18 frames after a flap, then rest
    const timeSinceFlap = frame - birdFlapFrame;
    const flapActive = timeSinceFlap < 18;
    const wingFlap = flapActive ? Math.sin(timeSinceFlap * 0.55) : 0; // -1 to 1 when flapping, else neutral
    const wingOffY  = wingFlap * 11;            // wing tip vertical travel

    // --- TAIL FEATHERS ---
    ctx.fillStyle = '#c89000';
    ctx.beginPath();
    ctx.moveTo(-18, -3);
    ctx.lineTo(-34, -12);
    ctx.lineTo(-30,  -2);
    ctx.lineTo(-36,   4);
    ctx.lineTo(-28,   3);
    ctx.lineTo(-33,  12);
    ctx.lineTo(-18,   4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a07000'; ctx.lineWidth = 1;
    ctx.stroke();

    // --- LOWER WING (behind body) ---
    ctx.save();
    ctx.translate(-6, 4);
    ctx.fillStyle = '#d4a800';
    ctx.strokeStyle = '#b08800'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, wingOffY * 0.35, 18, 7, 0.15, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // --- BODY (round like original flappy bird) ---
    const bodyGrad = ctx.createRadialGradient(-2, 0, 3, -2, 2, 22);
    bodyGrad.addColorStop(0, '#ffe066');
    bodyGrad.addColorStop(0.6, '#f5c518');
    bodyGrad.addColorStop(1, '#c89000');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#a87800'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-2, 2, 20, 0, Math.PI * 2); // nearly perfect circle, chubby like original
    ctx.fill(); ctx.stroke();

    // belly highlight
    ctx.fillStyle = 'rgba(255,240,120,0.35)';
    ctx.beginPath();
    ctx.ellipse(-5, -2, 11, 9, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // --- ROCKET LAUNCHER (power-up accessory) ---
    if (gameMode === 'single' && activePowerup && activePowerup.type === 'rocket_launcher') {
      ctx.fillStyle = '#404040';
      ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.5;
      ctx.fillRect(-28, -17, 26, 11); ctx.strokeRect(-28, -17, 26, 11);
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath(); ctx.arc(-28, -11, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#666';
      ctx.beginPath(); ctx.arc(-28, -11, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(-8, -17, 6, 3);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('\u00d7' + rocketLauncherAmmo, -15, -25);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }

    // --- UPPER WING (in front of body) ---
    ctx.save();
    ctx.translate(-5, -2);
    ctx.rotate(-wingFlap * 0.55);
    const wGrad = ctx.createLinearGradient(0, -8, 0, 8);
    wGrad.addColorStop(0, '#ffe070');
    wGrad.addColorStop(1, '#c89000');
    ctx.fillStyle = wGrad;
    ctx.strokeStyle = '#a87800'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, wingOffY * 0.5, 20, 7, -0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // feather lines
    ctx.strokeStyle = 'rgba(168,120,0,0.6)'; ctx.lineWidth = 1;
    for (let fi = 0; fi < 4; fi++) {
      const fx = -14 + fi * 8;
      ctx.beginPath();
      ctx.moveTo(fx, wingOffY * 0.5 - 3);
      ctx.lineTo(fx + 2, wingOffY * 0.5 + 6);
      ctx.stroke();
    }
    ctx.restore();

    // --- HEAD (larger than body — face is clearly visible) ---
    const headGrad = ctx.createRadialGradient(12, -17, 3, 14, -12, 26);
    headGrad.addColorStop(0, '#ffe870');
    headGrad.addColorStop(0.65, '#f5c518');
    headGrad.addColorStop(1, '#c89000');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#a87800'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(14, -12, 26, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // head top feather tuft
    ctx.fillStyle = '#e0a800';
    ctx.beginPath();
    ctx.moveTo(9, -37); ctx.lineTo(13, -51); ctx.lineTo(17, -37);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(17, -37); ctx.lineTo(22, -49); ctx.lineTo(27, -35);
    ctx.closePath(); ctx.fill();

    // --- PHOTO or FACE ---
    if (photoImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(14, -12, 25, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(photoImg, -11, -37, 50, 50);
      ctx.restore();
      ctx.strokeStyle = '#a87800'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(14, -12, 25, 0, Math.PI * 2); ctx.stroke();
    } else {
      // big white eye
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(24, -18, 11, 0, Math.PI * 2); ctx.fill();
      // pupil
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(26, -18, 6, 0, Math.PI * 2); ctx.fill();
      // eye shine
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(29, -21, 2.5, 0, Math.PI * 2); ctx.fill();
      // cheek blush
      ctx.fillStyle = 'rgba(255,130,80,0.38)';
      ctx.beginPath(); ctx.ellipse(17, -3, 7, 5, 0.3, 0, Math.PI * 2); ctx.fill();
    }

    // --- BEAK ---
    ctx.fillStyle = '#FF8C00';
    ctx.strokeStyle = '#cc5500'; ctx.lineWidth = 1.2;
    // upper beak
    ctx.beginPath();
    ctx.moveTo(36, -18);
    ctx.lineTo(52, -12);
    ctx.lineTo(36, -9);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // lower beak
    ctx.fillStyle = '#e07000';
    ctx.beginPath();
    ctx.moveTo(36, -9);
    ctx.lineTo(50, -10);
    ctx.lineTo(36, -4);
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // --- THEME COSTUME (unlocked by reaching checkpoints) ---
    // Hat unlocks after pillar 10 (score >= 10)
    if (score >= 10) {
      if (theme === 'desert') drawBirdHatDesert();
      else if (theme === 'mountain') drawBirdHatMountain();
    }
    // Body accessory unlocks after pillar 20 (score >= 20)
    if (score >= 20) {
      if (theme === 'desert') drawBirdBodyDesert();
      else if (theme === 'mountain') drawBirdBodyMountain();
    }
  }

  ctx.restore();
}

// ---- Draw: Desert cowboy hat (drawn in bird-local coords, head centre ~14,-12) ----
function drawBirdHatDesert() {
  ctx.save();
  ctx.translate(14, -12);
  // Hat brim
  ctx.fillStyle = '#8B4513';
  ctx.strokeStyle = '#5a2a08'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, -22, 30, 7, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Brim highlight
  ctx.fillStyle = 'rgba(255,200,100,0.2)';
  ctx.beginPath(); ctx.ellipse(-4, -24, 18, 3.5, -0.1, 0, Math.PI * 2); ctx.fill();
  // Hat crown
  ctx.fillStyle = '#8B4513';
  ctx.strokeStyle = '#5a2a08'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-16, -22);
  ctx.bezierCurveTo(-17, -50, -10, -56, 0, -57);
  ctx.bezierCurveTo(10, -56, 17, -50, 16, -22);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Crown crease
  ctx.strokeStyle = '#5a2a08'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-6, -55); ctx.quadraticCurveTo(0, -60, 6, -55);
  ctx.stroke();
  // Hat band
  ctx.fillStyle = '#2a1a08';
  ctx.beginPath();
  ctx.moveTo(-16, -26); ctx.lineTo(16, -26);
  ctx.lineTo(15, -32); ctx.lineTo(-15, -32);
  ctx.closePath(); ctx.fill();
  // Hat band buckle
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#aa9000'; ctx.lineWidth = 1;
  ctx.fillRect(-4, -31, 8, 6); ctx.strokeRect(-4, -31, 8, 6);
  ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 0.8;
  ctx.strokeRect(-2, -29, 4, 2);
  // Crown highlight
  ctx.fillStyle = 'rgba(255,200,100,0.18)';
  ctx.beginPath(); ctx.ellipse(-3, -44, 7, 11, -0.1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Draw: Mountain Santa hat (drawn in bird-local coords, head centre ~14,-12) ----
function drawBirdHatMountain() {
  ctx.save();
  ctx.translate(14, -12);
  // White fluffy brim
  ctx.fillStyle = '#f0f0f0';
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -22, 27, 8, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(-4, -25, 16, 4, -0.1, 0, Math.PI * 2); ctx.fill();
  // Red cone
  ctx.fillStyle = '#c0392b';
  ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-18, -22);
  ctx.quadraticCurveTo(-16, -45, 2, -58);
  ctx.quadraticCurveTo(16, -52, 14, -22);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Droopy tip
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(2, -58);
  ctx.quadraticCurveTo(18, -66, 22, -52);
  ctx.quadraticCurveTo(20, -44, 14, -42);
  ctx.closePath();
  ctx.fill();
  // Highlight stripe on cone
  ctx.fillStyle = 'rgba(255,150,140,0.3)';
  ctx.beginPath();
  ctx.moveTo(-10, -24); ctx.quadraticCurveTo(-12, -44, 0, -56);
  ctx.quadraticCurveTo(-2, -44, -4, -24);
  ctx.closePath(); ctx.fill();
  // White pom-pom
  ctx.fillStyle = '#f0f0f0';
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(22, -52, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath(); ctx.arc(20, -54, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Draw: Desert sheriff star badge (body, clear of face) ----
function drawBirdBodyDesert() {
  // Gold sheriff star pinned to the chest (body centre ~-2,2)
  ctx.save();
  ctx.translate(-6, 6); // chest area, well below the face
  // Star glow
  ctx.shadowColor = 'rgba(255,220,0,0.7)';
  ctx.shadowBlur = 8;
  // Draw 5-pointed star
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#aa8800'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 10 : 4.5;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Star inner highlight
  ctx.fillStyle = 'rgba(255,255,200,0.5)';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 5.5 : 2.5;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath(); ctx.fill();
  // Pin dot in centre
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#aa8800';
  ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- Draw: Mountain Santa coat (body, clear of face) ----
function drawBirdBodyMountain() {
  // Red Santa jacket over the body circle (~-2,2 r=20), not touching the head
  ctx.save();
  // Red coat — covers lower half of body
  ctx.fillStyle = '#c0392b';
  ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(-2, 2, 20, 0.15, Math.PI - 0.15); // lower arc of body
  ctx.lineTo(-2, 2);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // White fluffy trim along the coat bottom edge
  ctx.fillStyle = '#f0f0f0';
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.ellipse(-2, 22, 19, 5, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // White trim along the coat opening (front centre vertical)
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath();
  ctx.ellipse(-2, 8, 4, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // Black belt across the middle
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-20, 3, 36, 6);
  // Gold belt buckle
  ctx.fillStyle = '#FFD700';
  ctx.strokeStyle = '#aa8800'; ctx.lineWidth = 1;
  ctx.fillRect(-5, 2, 10, 8); ctx.strokeRect(-5, 2, 10, 8);
  // Buckle inner rectangle
  ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 0.8;
  ctx.strokeRect(-2, 4, 4, 4);
  // Coat button (top one, below belt area)
  ctx.fillStyle = '#f0f0f0';
  ctx.beginPath(); ctx.arc(-2, -8, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.restore();
}

// ---- Draw: Little man ----
function drawLittleMan(man) {
  ctx.save();
  ctx.translate(man.x, man.y);
  ctx.fillStyle = '#555'; ctx.fillRect(-6, -20, 12, 20);
  ctx.fillStyle = '#ffcc99'; ctx.beginPath(); ctx.arc(0, -26, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#333'; ctx.fillRect(-8, -36, 16, 6); ctx.fillRect(-5, -42, 10, 8);
  ctx.fillStyle = '#555'; ctx.fillRect(-18, -18, 18, 5);
  ctx.fillStyle = '#888'; ctx.fillRect(-22, -19, 6, 7);
  ctx.restore();
  if (man.bullet && man.bullet.active) {
    // Spring/coil arm extending from gun toward the glove
    const fromX = man.x - 22;
    const fromY = man.y - 18;
    const dx = man.bullet.x - fromX;
    const dy = man.bullet.y - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / dist, ny = dy / dist;
    const perpX = -ny, perpY = nx;
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const springSegs = 7;
    for (let s = 0; s <= springSegs; s++) {
      const t = s / springSegs;
      const wobble = (s % 2 === 0 ? 5 : -5);
      const cx2 = fromX + dx * t + perpX * wobble;
      const cy2 = fromY + dy * t + perpY * wobble;
      if (s === 0) ctx.moveTo(cx2, cy2); else ctx.lineTo(cx2, cy2);
    }
    ctx.stroke();
    // Boxing glove
    const gx = man.bullet.x;
    const gy2 = man.bullet.y;
    const gloveAngle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(gx, gy2);
    ctx.rotate(gloveAngle);
    // Glove body
    ctx.fillStyle = '#CC1A00';
    ctx.strokeStyle = '#7a0e00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Knuckle bumps
    ctx.fillStyle = '#EE2A00';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(-6 + k * 6, -6, 3.5, Math.PI, 0);
      ctx.fill();
    }
    // Wrist band (white stripe)
    ctx.fillStyle = '#fff';
    ctx.fillRect(-11, 4, 22, 4);
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.8;
    ctx.strokeRect(-11, 4, 22, 4);
    // Thumb bump
    ctx.fillStyle = '#DD2200';
    ctx.beginPath();
    ctx.ellipse(-10, -2, 5, 3.5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---- Chaser: update ----
function updateChaser() {
  if (!chaser || chaser.state === 'gone') return;
  if (chaser.state === 'chase') {
    chaser.x = bird.x - 140;
    chaser.y += (bird.y - chaser.y) * 0.08;
  } else if (chaser.state === 'flee') {
    chaser.x += chaser.fleeVx;
    chaser.y += chaser.fleeVy;
    chaser.alpha -= 0.014;
    if (chaser.alpha <= 0) { chaser.alpha = 0; chaser.state = 'gone'; }
  } else if (chaser.state === 'ash') {
    chaser.ashTimer++;
    if (!chaser.ashSpawnDone) {
      for (let i = 0; i < 3; i++) {
        chaser.ashParticles.push({
          x: chaser.x + (Math.random()-0.5)*60, y: chaser.y + (Math.random()-0.5)*50,
          vx: (Math.random()-0.5)*1.8, vy: 0.8+Math.random()*1.5,
          size: 2+Math.random()*4, alpha: 0.6+Math.random()*0.4
        });
      }
      if (chaser.ashTimer > 60) chaser.ashSpawnDone = true;
    }
    chaser.alpha = Math.max(0, 1 - chaser.ashTimer / 65);
    chaser.ashParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.alpha -= 0.01; p.vy += 0.04; });
    chaser.ashParticles = chaser.ashParticles.filter(p => p.alpha > 0);
    if (chaser.ashTimer > 150 && chaser.ashParticles.length === 0) chaser.state = 'gone';
  }
}

// ---- Chaser: draw ----
function drawChaser() {
  if (!chaser || chaser.state === 'gone') return;
  if (chaser.state === 'ash' && chaser.ashParticles.length > 0) {
    chaser.ashParticles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      const g = Math.floor(70 + p.alpha * 60);
      ctx.fillStyle = `rgb(${g},${g-8},${g-16})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  if (chaser.alpha <= 0) return;
  if (theme === 'nature') drawPacman(chaser.x, chaser.y, frame, chaser.alpha);
  else if (theme === 'desert') drawCowboy(chaser.x, chaser.y, frame, chaser.alpha);
  else if (theme === 'mountain') drawYeti(chaser.x, chaser.y, frame, chaser.alpha);
}

function drawPacman(cx, cy, frm, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  const m = Math.abs(Math.sin(frm * 0.18)) * 0.45;
  // Body
  ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#cc8800'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,24,m,Math.PI*2-m); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Eye
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(7,-12,3.5,0,Math.PI*2); ctx.fill();
  // Ghost chasing Pac-Man
  ctx.globalAlpha = alpha * 0.65;
  ctx.fillStyle = '#7b7bff';
  ctx.beginPath();
  ctx.arc(-50, 0, 16, Math.PI, 0);
  ctx.lineTo(-34, 16); ctx.lineTo(-38, 12); ctx.lineTo(-43, 16); ctx.lineTo(-48, 12); ctx.lineTo(-53, 16); ctx.lineTo(-58, 12); ctx.lineTo(-66, 16); ctx.lineTo(-66, 0);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-45, -1, 5, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(-56, -1, 5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#00a'; ctx.beginPath(); ctx.arc(-44, -1, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#00a'; ctx.beginPath(); ctx.arc(-55, -1, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCowboy(cx, cy, frm, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);

  // Galloping animation
  const g = frm * 0.24;
  const legF1 = Math.sin(g) * 20;
  const legF2 = Math.sin(g + 0.6) * 20;
  const legB1 = Math.sin(g + Math.PI) * 20;
  const legB2 = Math.sin(g + Math.PI + 0.6) * 20;
  const bob = Math.abs(Math.sin(g)) * 3 - 1.5;

  ctx.save();
  ctx.translate(0, bob);

  // === BACK LEGS ===
  ctx.strokeStyle = '#6e3818'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-20,10); ctx.lineTo(-20+legB1*0.5,10+18); ctx.lineTo(-20+legB1,10+20+Math.abs(legB1)*0.28); ctx.stroke();
  ctx.fillStyle = '#1a0a00'; ctx.beginPath(); ctx.ellipse(-20+legB1,10+20+Math.abs(legB1)*0.28,5.5,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15,12); ctx.lineTo(-15+legB2*0.5,12+18); ctx.lineTo(-15+legB2,12+20+Math.abs(legB2)*0.28); ctx.stroke();
  ctx.fillStyle = '#1a0a00'; ctx.beginPath(); ctx.ellipse(-15+legB2,12+20+Math.abs(legB2)*0.28,5.5,2.5,0,0,Math.PI*2); ctx.fill();

  // === HORSE BODY ===
  const hbg = ctx.createRadialGradient(-4,0,4,-4,0,36);
  hbg.addColorStop(0,'#bf7040'); hbg.addColorStop(0.6,'#9e4e28'); hbg.addColorStop(1,'#7a3818');
  ctx.fillStyle = hbg; ctx.strokeStyle = '#5a2810'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0,0,38,20,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,150,0.16)'; ctx.beginPath(); ctx.ellipse(0,8,22,10,0,0,Math.PI*2); ctx.fill();

  // === TAIL ===
  const ts = Math.sin(g*0.7)*10;
  ctx.strokeStyle = '#200e00'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-36,-4); ctx.quadraticCurveTo(-52+ts,6,-46+ts,26); ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-36,-4); ctx.quadraticCurveTo(-50+ts,9,-42+ts,30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-35,-3); ctx.quadraticCurveTo(-54+ts,3,-49+ts,22); ctx.stroke();

  // === NECK + HEAD ===
  ctx.fillStyle = '#9e4e28'; ctx.strokeStyle = '#5a2810'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(23,-10); ctx.quadraticCurveTo(33,-22,36,-28); ctx.quadraticCurveTo(40,-30,42,-24); ctx.quadraticCurveTo(40,-16,30,-6); ctx.closePath(); ctx.fill(); ctx.stroke();
  const hg = ctx.createLinearGradient(30,-42,56,-24);
  hg.addColorStop(0,'#ae6030'); hg.addColorStop(1,'#883e18');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(44,-34,16,11,-0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#3a1008'; ctx.beginPath(); ctx.ellipse(55,-30,3,2,0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(52,-38,3.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(53,-39,1.2,0,Math.PI*2); ctx.fill();
  // Mane
  ctx.strokeStyle = '#180800'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  [[30,-30,20,-42,18,-36],[26,-26,16,-38,14,-32],[32,-34,22,-46,20,-40]].forEach(([mx,my,qx,qy,ex,ey]) => {
    ctx.beginPath(); ctx.moveTo(mx,my); ctx.quadraticCurveTo(qx,qy,ex,ey); ctx.stroke();
  });
  ctx.fillStyle = '#9e4e28';
  ctx.beginPath(); ctx.moveTo(46,-44); ctx.lineTo(42,-54); ctx.lineTo(50,-50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#be6e48';
  ctx.beginPath(); ctx.moveTo(46,-44); ctx.lineTo(43,-52); ctx.lineTo(49,-49); ctx.closePath(); ctx.fill();

  // === FRONT LEGS ===
  ctx.strokeStyle = '#6e3818'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(15,12); ctx.lineTo(15+legF1*0.5,12+18); ctx.lineTo(15+legF1,12+20+Math.abs(legF1)*0.25); ctx.stroke();
  ctx.fillStyle = '#1a0a00'; ctx.beginPath(); ctx.ellipse(15+legF1,12+20+Math.abs(legF1)*0.25,5.5,2.5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(22,10); ctx.lineTo(22+legF2*0.5,10+18); ctx.lineTo(22+legF2,10+20+Math.abs(legF2)*0.25); ctx.stroke();
  ctx.fillStyle = '#1a0a00'; ctx.beginPath(); ctx.ellipse(22+legF2,10+20+Math.abs(legF2)*0.25,5.5,2.5,0,0,Math.PI*2); ctx.fill();

  // === COWBOY BODY ===
  const vg = ctx.createLinearGradient(-10,-46,-10,-24);
  vg.addColorStop(0,'#8a6912'); vg.addColorStop(1,'#6a4e10');
  ctx.fillStyle = vg; ctx.strokeStyle = '#4a3008'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-14,-46,24,22,3); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a07820';
  ctx.beginPath(); ctx.moveTo(-4,-46); ctx.lineTo(-8,-32); ctx.lineTo(-2,-32); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(4,-46); ctx.lineTo(8,-32); ctx.lineTo(2,-32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#aa8800'; ctx.lineWidth = 1;
  ctx.fillRect(-5,-28,10,6); ctx.strokeRect(-5,-28,10,6);
  ctx.fillStyle = '#aa8800'; ctx.fillRect(-2,-27,4,4);

  // === LEFT ARM HOLDING GUN ===
  ctx.strokeStyle = '#8a6912'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-12,-40); ctx.lineTo(-30,-48); ctx.stroke();
  // Right arm on horse
  ctx.beginPath(); ctx.moveTo(8,-38); ctx.lineTo(22,-30); ctx.stroke();

  // === REVOLVER ===
  ctx.save();
  ctx.translate(-30,-48); ctx.rotate(-0.35);
  ctx.fillStyle = '#282828'; ctx.strokeStyle = '#111'; ctx.lineWidth = 1;
  ctx.fillRect(-14,-5,20,6); ctx.strokeRect(-14,-5,20,6); // barrel
  ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.arc(0,-2,5,0,Math.PI*2); ctx.fill(); ctx.stroke(); // cylinder
  for(let ci=0;ci<6;ci++){const ca=(ci/6)*Math.PI*2; ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(Math.cos(ca)*3,Math.sin(ca)*3-2,1,0,Math.PI*2); ctx.fill();}
  ctx.fillStyle = '#4a2c08'; ctx.strokeStyle = '#2a1404'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-3,0,8,12,2); ctx.fill(); ctx.stroke(); // handle
  ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 0.8;
  for(let gi=1;gi<5;gi++){ctx.beginPath();ctx.moveTo(-2,gi*2.2);ctx.lineTo(4,gi*2.2);ctx.stroke();} // grip
  ctx.fillStyle = '#555'; ctx.beginPath(); ctx.arc(-2,-6,3,0,Math.PI*2); ctx.fill(); // hammer
  ctx.strokeStyle = '#666'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2,0); ctx.lineTo(4,6); ctx.stroke(); // trigger
  ctx.restore();

  // === HEAD ===
  ctx.fillStyle = '#f4c88a'; ctx.strokeStyle = '#d4a060'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(-2,-54,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(70,40,15,0.18)'; ctx.beginPath(); ctx.arc(-2,-50,8,0,Math.PI); ctx.fill(); // stubble
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-6,-57,2,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(2,-57,2,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-9,-59); ctx.lineTo(-3,-58); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-1,-59); ctx.lineTo(5,-58); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-4,-52); ctx.quadraticCurveTo(0,-50,4,-52); ctx.stroke();

  // === COWBOY HAT ===
  ctx.fillStyle = '#281200'; ctx.strokeStyle = '#180c00'; ctx.lineWidth = 1.5;
  // Brim (wide)
  ctx.beginPath(); ctx.ellipse(-2,-65,23,6,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Crown
  ctx.fillStyle = '#281200';
  ctx.beginPath(); ctx.moveTo(-16,-65); ctx.lineTo(-14,-90); ctx.quadraticCurveTo(-2,-95,14,-90); ctx.lineTo(16,-65); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Dent
  ctx.fillStyle = '#180c00'; ctx.beginPath(); ctx.moveTo(-6,-90); ctx.quadraticCurveTo(-2,-94,6,-90); ctx.lineTo(4,-88); ctx.quadraticCurveTo(-2,-91,-4,-88); ctx.closePath(); ctx.fill();
  // Band
  ctx.fillStyle = '#8B0000'; ctx.strokeStyle = '#600000'; ctx.lineWidth = 1;
  ctx.fillRect(-15,-71,30,5); ctx.strokeRect(-15,-71,30,5);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.moveTo(-12,-68); ctx.lineTo(-10,-88); ctx.lineTo(-4,-88); ctx.lineTo(-6,-68); ctx.closePath(); ctx.fill();

  ctx.restore(); // bodyBob
  ctx.restore();
}

function drawYeti(cx, cy, frm, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  const bob = Math.sin(frm * 0.18);
  const stride = Math.sin(frm * 0.22);

  // === FEET with toe claws ===
  ctx.fillStyle = '#a8c8e0'; ctx.strokeStyle = '#7aa0c0'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-14+stride*5,42+bob*2,13,6,0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(14-stride*5,42-bob*2,13,6,-0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8f0ff';
  [-22+stride*5,-15+stride*5,-8+stride*5].forEach(tx => { ctx.beginPath(); ctx.moveTo(tx,36+bob*2); ctx.lineTo(tx-2,29+bob*2); ctx.lineTo(tx+3,36+bob*2); ctx.closePath(); ctx.fill(); });
  [8-stride*5,15-stride*5,22-stride*5].forEach(tx => { ctx.beginPath(); ctx.moveTo(tx,36-bob*2); ctx.lineTo(tx-2,29-bob*2); ctx.lineTo(tx+3,36-bob*2); ctx.closePath(); ctx.fill(); });

  // === LEGS ===
  ctx.fillStyle = '#c0dcee'; ctx.strokeStyle = '#98b8d0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-12,24+bob*4,10,16,stride*0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(12,24-bob*4,10,16,-stride*0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#b0cce4';
  ctx.beginPath(); ctx.arc(-12+stride*3,16+bob*3,6,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(12-stride*3,16-bob*3,6,0,Math.PI*2); ctx.fill();

  // === BODY ===
  const bGrad = ctx.createRadialGradient(-5,0,8,-5,0,30);
  bGrad.addColorStop(0,'#e8f4ff'); bGrad.addColorStop(0.6,'#c8ddf0'); bGrad.addColorStop(1,'#a8c0dc');
  ctx.fillStyle = bGrad; ctx.strokeStyle = '#88aacb'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0,4,28,30,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Shaggy fur strokes
  ctx.strokeStyle = 'rgba(160,190,220,0.65)'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
  [[-18,-8],[-13,4],[-9,-12],[-5,9],[0,-4],[5,12],[10,-8],[15,4],[18,-10],[20,2],[-16,14],[-8,18],[4,16],[14,14],[-20,4]].forEach(([fx,fy]) => {
    ctx.beginPath(); ctx.moveTo(fx,fy); ctx.lineTo(fx+1,fy+7); ctx.stroke();
  });
  // Belly patch
  ctx.fillStyle = 'rgba(235,250,255,0.55)'; ctx.beginPath(); ctx.ellipse(0,8,13,18,0,0,Math.PI*2); ctx.fill();

  // === ARMS ===
  ctx.fillStyle = '#c0dcee'; ctx.strokeStyle = '#98b8d0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-26,-10+bob*3); ctx.quadraticCurveTo(-46,-18+bob*6,-44,-6+bob*4); ctx.quadraticCurveTo(-40,6+bob*2,-28,4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8f0ff';
  [[-50,-4],[-44,2],[-38,-2]].forEach(([hx,hy]) => {
    ctx.beginPath(); ctx.moveTo(hx,hy+bob*4); ctx.lineTo(hx-3,hy-7+bob*4); ctx.lineTo(hx+4,hy-2+bob*4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#7aa0c0'; ctx.lineWidth=1; ctx.stroke();
  });
  ctx.fillStyle = '#c0dcee'; ctx.strokeStyle = '#98b8d0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(26,-10-bob*3); ctx.quadraticCurveTo(46,-18-bob*6,44,-6-bob*4); ctx.quadraticCurveTo(40,6-bob*2,28,4); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d8f0ff';
  [[50,-4],[44,2],[38,-2]].forEach(([hx,hy]) => {
    ctx.beginPath(); ctx.moveTo(hx,hy-bob*4); ctx.lineTo(hx+3,hy-7-bob*4); ctx.lineTo(hx-4,hy-2-bob*4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#7aa0c0'; ctx.lineWidth=1; ctx.stroke();
  });

  // === HEAD ===
  const hGrad = ctx.createRadialGradient(-4,-26,6,-4,-26,26);
  hGrad.addColorStop(0,'#f0f8ff'); hGrad.addColorStop(0.7,'#c8ddf0'); hGrad.addColorStop(1,'#a8c0dc');
  ctx.fillStyle = hGrad; ctx.strokeStyle = '#88aacb'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,-24,26,0,Math.PI*2); ctx.fill(); ctx.stroke();
  // Fur on top
  ctx.strokeStyle = 'rgba(165,192,220,0.8)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  [[-14,-44],[-8,-50],[0,-52],[8,-50],[14,-46],[-18,-38],[18,-38]].forEach(([fx,fy]) => { ctx.beginPath(); ctx.moveTo(fx,fy+4); ctx.lineTo(fx,fy); ctx.stroke(); });
  // Ears
  ctx.fillStyle = '#c0dcee'; ctx.strokeStyle = '#98b8d0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(-23,-28,8,10,-0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(23,-28,8,10,0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffaaaa';
  ctx.beginPath(); ctx.ellipse(-23,-28,5,7,-0.3,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(23,-28,5,7,0.3,0,Math.PI*2); ctx.fill();
  // Brow ridge
  ctx.fillStyle = '#a8c0dc';
  ctx.beginPath(); ctx.moveTo(-22,-38); ctx.quadraticCurveTo(-10,-44,0,-42); ctx.quadraticCurveTo(10,-44,22,-38); ctx.quadraticCurveTo(10,-36,0,-34); ctx.quadraticCurveTo(-10,-36,-22,-38); ctx.closePath(); ctx.fill();
  // Angry brows
  ctx.strokeStyle = '#5a80a8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-22,-38); ctx.lineTo(-8,-36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22,-38); ctx.lineTo(8,-36); ctx.stroke();

  // === EYES (glowing yellow) ===
  ctx.fillStyle = 'rgba(255,180,0,0.32)'; ctx.beginPath(); ctx.arc(-10,-30,12,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10,-30,12,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fffde8'; ctx.beginPath(); ctx.ellipse(-10,-30,9,8,0.1,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10,-30,9,8,-0.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(-10,-30,5.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(10,-30,5.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-10,-30,2,5,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(10,-30,2,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-12,-32,1.8,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(8,-32,1.8,0,Math.PI*2); ctx.fill();

  // === NOSE ===
  ctx.fillStyle = '#ff8888'; ctx.strokeStyle = '#cc4444'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(0,-22,6,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.arc(-2,-24,2.5,0,Math.PI*2); ctx.fill();

  // === MOUTH with fangs ===
  ctx.fillStyle = '#8a2020';
  ctx.beginPath(); ctx.moveTo(-16,-14); ctx.quadraticCurveTo(0,-6,16,-14); ctx.quadraticCurveTo(10,-10,0,-8); ctx.quadraticCurveTo(-10,-10,-16,-14); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fffff0'; ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
  [[-10,-14],[-4,-14],[4,-14],[10,-14]].forEach(([tx2,ty2]) => {
    ctx.beginPath(); ctx.moveTo(tx2,ty2); ctx.lineTo(tx2-2,ty2+8); ctx.lineTo(tx2+2,ty2+8); ctx.closePath(); ctx.fill(); ctx.stroke();
  });
  ctx.fillStyle = '#ff6080'; ctx.beginPath(); ctx.ellipse(0,-8,7,4,0,0,Math.PI*2); ctx.fill();

  // === ICE CRYSTALS on shoulders ===
  [[-22,-6],[22,-6]].forEach(([ix,iy]) => {
    ctx.strokeStyle = 'rgba(180,230,255,0.8)'; ctx.lineWidth = 1.5;
    for(let ii=0;ii<6;ii++){const ia=(ii/6)*Math.PI*2; ctx.beginPath(); ctx.moveTo(ix,iy); ctx.lineTo(ix+Math.cos(ia)*10,iy+Math.sin(ia)*10); ctx.stroke();}
    ctx.fillStyle = 'rgba(200,240,255,0.5)'; ctx.beginPath(); ctx.arc(ix,iy,3,0,Math.PI*2); ctx.fill();
  });

  ctx.restore();
}

// ---- Draw: Poop ----
function drawPoop(p) {
  ctx.fillStyle = '#7b4f2e';
  ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3620';
  ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.5, 0, Math.PI * 2); ctx.fill();
}

// ---- Draw: Particles ----
function drawParticles() {
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

// ---- Draw: Win Celebration ----
function drawCrown(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = '#FFD700';
  ctx.shadowBlur = 18 + Math.sin(danceFrame * 0.1) * 5;
  const cw = 38, ch = 24;
  ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#B8860B'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-cw, ch/2);
  ctx.lineTo(-cw, -ch*0.3);
  ctx.lineTo(-cw/2, -ch);
  ctx.lineTo(-cw/6, -ch*0.2);
  ctx.lineTo(0, -ch*1.4);
  ctx.lineTo(cw/6, -ch*0.2);
  ctx.lineTo(cw/2, -ch);
  ctx.lineTo(cw, -ch*0.3);
  ctx.lineTo(cw, ch/2);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  [[-cw/2, 2, '#E8192C'],[0, -ch*0.45, '#2F52E0'],[cw/2, 2, '#1A9E45']].forEach(([gx,gy,gc]) => {
    ctx.fillStyle = gc; ctx.beginPath(); ctx.arc(gx,gy,4.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(gx-1.5,gy-1.5,1.5,0,Math.PI*2); ctx.fill();
  });
  ctx.restore();
}

function drawAngel(x, y, flip) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  // Halo
  ctx.save();
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2.5;
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(0,-34,15,5,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  // Wing
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.moveTo(-4,-4);
  ctx.bezierCurveTo(-22,-20,-42,-6,-30,14);
  ctx.bezierCurveTo(-18,26,-6,14,-4,-4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,220,255,0.5)'; ctx.lineWidth = 1; ctx.stroke();
  // Robe
  ctx.fillStyle = '#f8f8ff';
  ctx.beginPath(); ctx.ellipse(0,8,8,15,0,0,Math.PI*2); ctx.fill();
  // Head
  ctx.fillStyle = '#ffe0c0';
  ctx.beginPath(); ctx.arc(0,-14,10,0,Math.PI*2); ctx.fill();
  // Hair
  ctx.fillStyle = '#ffd700';
  ctx.beginPath(); ctx.arc(0,-18,9,Math.PI,Math.PI*2); ctx.fill();
  // Face
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(-3,-14,1.5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(3,-14,1.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#cc7755'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0,-10,3,0,Math.PI); ctx.stroke();
  ctx.restore();
}

function drawWinReturnBtn() {
  const b = WIN_RETURN_BTN;
  const pulse = 1 + Math.sin(frame * 0.09) * 0.03;
  ctx.save();
  ctx.translate(b.x + b.w/2, b.y + b.h/2);
  ctx.scale(pulse, pulse);
  const bx = -b.w/2, by = -b.h/2;
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
  const grad = ctx.createLinearGradient(bx, by, bx, by + b.h);
  grad.addColorStop(0, '#FFE840'); grad.addColorStop(1, '#FFA500');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.roundRect(bx, by, b.w, b.h, 14); ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#cc8800'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(bx, by, b.w, b.h, 14); ctx.stroke();
  ctx.fillStyle = '#111';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('\u{1F3C6}  Return to Menu', 0, 0);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

// ---- Draw: Dizzy Effect ----
function drawDizzyEffect(bx, by, timer) {
  ctx.save();
  const intensity = Math.min(1, timer / 60);
  const ringCx = bx + 14;
  const ringY = by - 54;

  // Outer glow
  ctx.strokeStyle = `rgba(200, 140, 255, ${0.22 + intensity * 0.18})`;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.ellipse(ringCx, ringY, 28 + intensity * 6, 9 + intensity * 2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Spinning dashed dizzy ring
  ctx.strokeStyle = `rgba(170, 80, 255, ${0.75 + intensity * 0.22})`;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([9, 6]);
  ctx.lineDashOffset = -timer * 1.5;
  ctx.beginPath();
  ctx.ellipse(ringCx, ringY, 26 + intensity * 5, 8 + intensity * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // === SPINNING STARS around head ===
  const numStars = 3 + Math.floor(intensity * 2);
  for (let si = 0; si < numStars; si++) {
    const starAngle = (si / numStars) * Math.PI * 2 + timer * 0.10;
    const orbitR = 40 + intensity * 12;
    const starX = ringCx + Math.cos(starAngle) * orbitR;
    const starY = ringY + 12 + Math.sin(starAngle) * (orbitR * 0.38);
    const sz = 7 + intensity * 4;
    ctx.save();
    ctx.translate(starX, starY);
    ctx.rotate(starAngle * 2.5);
    // Star glow
    ctx.fillStyle = `rgba(255,240,0,${0.25 + intensity * 0.2})`;
    ctx.beginPath(); ctx.arc(0, 0, sz + 4, 0, Math.PI * 2); ctx.fill();
    // Star shape
    ctx.fillStyle = `rgba(255,220,0,${0.7 + intensity * 0.3})`;
    ctx.strokeStyle = `rgba(200,130,0,0.9)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let sp = 0; sp < 5; sp++) {
      const a = (sp / 5) * Math.PI * 2 - Math.PI / 2;
      const ia = a + Math.PI / 5;
      sp === 0 ? ctx.moveTo(Math.cos(a)*sz, Math.sin(a)*sz) : ctx.lineTo(Math.cos(a)*sz, Math.sin(a)*sz);
      ctx.lineTo(Math.cos(ia)*sz*0.42, Math.sin(ia)*sz*0.42);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // Star shine
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-sz*0.22, -sz*0.22, sz*0.22, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // Spiral dizzy arcs (at higher intensity)
  if (intensity > 0.3) {
    const lineAlpha = (intensity - 0.3) / 0.7;
    ctx.strokeStyle = `rgba(160,50,255,${lineAlpha * 0.55})`;
    ctx.lineWidth = 2;
    for (let li = 0; li < 3; li++) {
      const la = timer * 0.13 + li * (Math.PI * 2 / 3);
      ctx.beginPath();
      ctx.arc(ringCx, ringY, 18 + intensity * 14, la, la + Math.PI * 0.65);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ---- Draw: Poop Slide (camera lens effect) ----
function drawPoopSlide(slideY) {
  ctx.save();
  // Main poop mass sliding down
  ctx.fillStyle = '#7b4f2e';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, slideY);
  // Wavy / drippy bottom edge
  for (let wx = canvas.width; wx >= 0; wx -= 6) {
    const wave = Math.sin(wx * 0.07 + frame * 0.18) * 16 + Math.sin(wx * 0.15 + frame * 0.09) * 8 + 12;
    ctx.lineTo(wx, slideY + wave);
  }
  ctx.lineTo(0, slideY);
  ctx.closePath();
  ctx.fill();

  // Lighter highlight streak (lens sheen)
  ctx.fillStyle = 'rgba(160, 100, 40, 0.35)';
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.08, 0);
  ctx.lineTo(canvas.width * 0.28, 0);
  ctx.lineTo(canvas.width * 0.28, slideY);
  for (let wx = canvas.width * 0.28; wx >= canvas.width * 0.08; wx -= 6) {
    const wave = Math.sin(wx * 0.07 + frame * 0.18) * 16 + Math.sin(wx * 0.15 + frame * 0.09) * 8 + 12;
    ctx.lineTo(wx, slideY + wave);
  }
  ctx.lineTo(canvas.width * 0.08, slideY);
  ctx.closePath();
  ctx.fill();

  // Drips running ahead of the main mass
  const dripXs = [25, 80, 145, 215, 290, 365, 435, 505, 575, 640, 695, 718];
  dripXs.forEach((dx, i) => {
    const dripExtra = 28 + (i % 4) * 20 + Math.sin(frame * 0.12 + i * 1.4) * 10;
    const dripW = 5 + (i % 3) * 3;
    const tipY = slideY + dripExtra;
    // Drip shaft
    ctx.fillStyle = '#6a4020';
    ctx.beginPath();
    ctx.roundRect(dx - dripW * 0.5, slideY, dripW, dripExtra, dripW * 0.5);
    ctx.fill();
    // Drip blob tip
    ctx.fillStyle = '#7b4f2e';
    ctx.beginPath();
    ctx.arc(dx, tipY, dripW * 1.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // Poop emoji appears once mostly covered
  if (slideY > canvas.height * 0.35) {
    const emojiAlpha = Math.min(1, (slideY - canvas.height * 0.35) / (canvas.height * 0.25));
    ctx.globalAlpha = emojiAlpha;
    ctx.font = 'bold 90px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💩', canvas.width / 2, Math.min(slideY * 0.5, canvas.height * 0.4));
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// ---- Draw: Eagle Attack (swoops in, grabs fried chicken, flies away) ----
function drawEagleAttack(e) {
  const scale = 2.0;
  const facingRight = e.phase === 'escape';
  const wb = Math.sin(frame * 0.14) * 0.42; // wing beat

  ctx.save();
  ctx.translate(e.x, e.y);
  if (!facingRight) ctx.scale(-1, 1); // face left when diving in from the right
  ctx.scale(scale, scale);

  // Left wing
  ctx.fillStyle = '#2e1a08';
  ctx.beginPath(); ctx.moveTo(-2,-3); ctx.quadraticCurveTo(-22,-24+wb*20,-50,-20+wb*15); ctx.quadraticCurveTo(-34,-8+wb*6,-2,3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1a0e04'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(-38-ft*10,-20+wb*15+ft*2); ctx.lineTo(-41-ft*10,-28+wb*15+ft*5); ctx.stroke();}
  // Right wing
  ctx.fillStyle = '#2e1a08';
  ctx.beginPath(); ctx.moveTo(2,-3); ctx.quadraticCurveTo(22,-24+wb*20,50,-20+wb*15); ctx.quadraticCurveTo(34,-8+wb*6,2,3); ctx.closePath(); ctx.fill();
  for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(38+ft*10,-20+wb*15+ft*2); ctx.lineTo(41+ft*10,-28+wb*15+ft*5); ctx.stroke();}
  // Body
  ctx.fillStyle = '#3a2010'; ctx.beginPath(); ctx.ellipse(0,0,14,6,0,0,Math.PI*2); ctx.fill();
  // Talons extended during dive
  if (e.phase === 'approach') {
    ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(2,5); ctx.lineTo(-3,18); ctx.lineTo(-7,24); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5,6); ctx.lineTo(4,19); ctx.lineTo(4,25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8,5); ctx.lineTo(13,18); ctx.lineTo(17,24); ctx.stroke();
  }
  // White head
  ctx.fillStyle = '#f0f0f0'; ctx.beginPath(); ctx.arc(13,-2,7,0,Math.PI*2); ctx.fill();
  // Beak — open wide when holding chicken
  ctx.fillStyle = '#e8b000'; ctx.strokeStyle = '#c08000'; ctx.lineWidth = 1;
  if (e.phase === 'grab' || e.phase === 'escape') {
    ctx.beginPath(); ctx.moveTo(18,-5); ctx.lineTo(30,-1); ctx.lineTo(18,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c08000';
    ctx.beginPath(); ctx.moveTo(18,2); ctx.lineTo(28,6); ctx.lineTo(18,5); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(19,-2); ctx.lineTo(27,1); ctx.lineTo(19,3); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // Eye (fierce yellow)
  ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(16,-4,3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(16,-4,1.5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(16.8,-4.8,0.7,0,Math.PI*2); ctx.fill();
  // White tail
  ctx.fillStyle = '#e0e0e0'; ctx.beginPath(); ctx.moveTo(-12,-1); ctx.lineTo(-26,-5); ctx.lineTo(-24,6); ctx.lineTo(-12,2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-12,0); ctx.lineTo(-26,0); ctx.stroke();

 ctx.restore();

  // Fried chicken emoji held in beak during grab & escape phases
  if (e.phase === 'grab' || e.phase === 'escape') {
    const flipSign = facingRight ? 1 : -1;
    const beakTipX = e.x + flipSign * 30 * scale;
    const beakTipY = e.y + 3 * scale;
    ctx.save();
    ctx.font = '34px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍗', beakTipX, beakTipY);
    ctx.restore();
  }
}

// ---- Draw: Mario Basket (OG theme — Mario runs in, scoops chicken into basket, runs away) ----
function drawMarioBasket(mb) {
  const groundY = canvas.height - 60;
  const frm = mb.timer;
  const walkingRight = (mb.phase === 'walk_out');
  const isPicking = (mb.phase === 'pickup');
  const pickProgress = isPicking ? Math.min(1, frm / 30) : 0;
  const runCycle = isPicking ? 0 : Math.sin(frm * 0.28);
  const bob = isPicking ? 0 : Math.abs(Math.sin(frm * 0.28)) * 4;
  const bendY = pickProgress * 14; // body leans down during pickup

  ctx.save();
  ctx.translate(mb.x, groundY - 2);
  if (walkingRight) ctx.scale(-1, 1); // flip to face right when walking out
  ctx.translate(0, -bob);

  // === SHOES ===
  const lLegX = -5 + runCycle * 10;
  const rLegX = 5 - runCycle * 10;
  ctx.fillStyle = '#1a0800';
  ctx.beginPath(); ctx.ellipse(lLegX, 2, 10, 5, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(rLegX, 2, 10, 5, -0.2, 0, Math.PI * 2); ctx.fill();

  // === LEGS ===
  ctx.strokeStyle = '#1030c8'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-5, -4 + bendY); ctx.lineTo(lLegX, 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5, -4 + bendY); ctx.lineTo(rLegX, 2); ctx.stroke();

  // === BODY ===
  ctx.fillStyle = '#e8e8e8'; // white shirt
  ctx.beginPath(); ctx.roundRect(-12, -36 + bendY, 24, 14, 3); ctx.fill();
  ctx.fillStyle = '#1030c8'; ctx.strokeStyle = '#0018a0'; ctx.lineWidth = 1.2; // blue overalls
  ctx.beginPath(); ctx.roundRect(-13, -38 + bendY, 26, 22, 3); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-8, -44 + bendY, 16, 10, 2); ctx.fill(); ctx.stroke(); // bib
  ctx.fillStyle = '#FFD700'; // golden buttons
  ctx.beginPath(); ctx.arc(-4, -40 + bendY, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(4, -40 + bendY, 2.5, 0, Math.PI * 2); ctx.fill();

  // === ARM WITH BASKET ===
  const armLen = 18;
  const basketArmAngle = isPicking ? 0.7 + pickProgress * 0.5 : 0.55;
  const aEndX = -13 + Math.cos(Math.PI - basketArmAngle) * armLen;
  const aEndY = -36 + bendY + Math.sin(Math.PI - basketArmAngle) * armLen;
  ctx.strokeStyle = '#e8a860'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-13, -36 + bendY); ctx.lineTo(aEndX, aEndY); ctx.stroke();

  // === OTHER ARM (swings while running) ===
  ctx.strokeStyle = '#e8a860'; ctx.lineWidth = 8; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(13, -36 + bendY); ctx.lineTo(13 + runCycle * 9, -36 + bendY + 14); ctx.stroke();

  // === HEAD ===
  ctx.fillStyle = '#f0b870';
  ctx.beginPath(); ctx.arc(0, -52 + bendY * 0.5, 14, 0, Math.PI * 2); ctx.fill();
  // Sideburns
  ctx.fillStyle = '#3a200a';
  ctx.beginPath(); ctx.arc(-10, -57 + bendY * 0.5, 6, Math.PI * 0.6, Math.PI * 1.8); ctx.fill();
  ctx.beginPath(); ctx.arc(10, -57 + bendY * 0.5, 6, Math.PI * 1.2, Math.PI * 2.4); ctx.fill();
  // Eyes
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(-5, -54 + bendY * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(5, -54 + bendY * 0.5, 2.5, 0, Math.PI * 2); ctx.fill();
  // Nose
  ctx.fillStyle = '#e09060';
  ctx.beginPath(); ctx.arc(0, -50 + bendY * 0.5, 3.5, 0, Math.PI * 2); ctx.fill();
  // Big iconic mustache
  ctx.fillStyle = '#3a200a';
  ctx.beginPath(); ctx.ellipse(-5, -47 + bendY * 0.5, 7, 5, -0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -47 + bendY * 0.5, 7, 5, 0.15, 0, Math.PI * 2); ctx.fill();

  // === RED CAP ===
  const hy = -66 + bendY * 0.4;
  ctx.fillStyle = '#cc1010'; ctx.strokeStyle = '#880808'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, hy, 18, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); // brim
  ctx.beginPath();
  ctx.moveTo(-14, hy); ctx.lineTo(-12, hy - 18);
  ctx.quadraticCurveTo(0, hy - 22, 12, hy - 18);
  ctx.lineTo(14, hy); ctx.closePath(); ctx.fill(); ctx.stroke(); // crown
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('M', 0, hy - 10);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  // === BASKET ===
  ctx.save();
  ctx.translate(aEndX - 2, aEndY - 4);
  ctx.fillStyle = '#c88830'; ctx.strokeStyle = '#7a4e10'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.roundRect(-13, -2, 26, 20, 4); ctx.fill(); ctx.stroke();
  // Weave lines
  ctx.strokeStyle = 'rgba(90,50,10,0.5)'; ctx.lineWidth = 0.8;
  for (let wy = 2; wy <= 16; wy += 5) { ctx.beginPath(); ctx.moveTo(-13, wy); ctx.lineTo(13, wy); ctx.stroke(); }
  for (let wx = -9; wx <= 9; wx += 5) { ctx.beginPath(); ctx.moveTo(wx, -2); ctx.lineTo(wx, 18); ctx.stroke(); }
  // Handle arc
  ctx.strokeStyle = '#7a4e10'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(0, -2, 11, Math.PI, 0); ctx.stroke();
  // Chicken in basket once scooped
  const chickenVisible = (mb.phase === 'pickup' && mb.timer >= 25) || mb.phase === 'walk_out';
  if (chickenVisible) {
    ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍗', 0, 8);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();

  ctx.restore();
}

// ---- Draw: Ice Freeze Chicken (Mountain theme — chicken freezes from bottom up) ----
function drawIceFreezeChicken(bx, by, progress) {
  ctx.save();
  ctx.translate(bx, by);

  // Draw the base chicken emoji
  ctx.font = '64px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍗', 0, 0);

  if (progress > 0) {
    const halfH = 34;
    const frozenH = halfH * 2 * progress;   // grows from 0 → full height
    const iceTopY = halfH - frozenH;         // top edge of ice (moves upward)

    // Clip to the frozen portion (bottom section growing upward)
    ctx.save();
    ctx.beginPath();
    ctx.rect(-36, iceTopY, 72, frozenH + 4);
    ctx.clip();

    // Ice colour gradient (deep blue at base → pale frosty white at top edge)
    const iceGrad = ctx.createLinearGradient(0, halfH, 0, iceTopY);
    iceGrad.addColorStop(0, 'rgba(70, 155, 255, 0.93)');
    iceGrad.addColorStop(0.45, 'rgba(155, 215, 255, 0.88)');
    iceGrad.addColorStop(1, 'rgba(220, 245, 255, 0.80)');
    ctx.fillStyle = iceGrad;
    ctx.fillRect(-36, iceTopY, 72, frozenH + 4);

    // Highlight shimmer
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.ellipse(-9, iceTopY + frozenH * 0.35, 9, Math.max(2, frozenH * 0.22), -0.3, 0, Math.PI * 2); ctx.fill();

    // Internal crack lines
    ctx.strokeStyle = 'rgba(180,225,255,0.8)'; ctx.lineWidth = 1;
    [-24, -10, 4, 18].forEach(cx2 => {
      ctx.beginPath();
      ctx.moveTo(cx2, iceTopY + frozenH * 0.1);
      ctx.lineTo(cx2 + 5, iceTopY + frozenH * 0.38);
      ctx.lineTo(cx2 + 1, iceTopY + frozenH * 0.65);
      ctx.stroke();
    });
    ctx.restore(); // unclip

    // Freeze boundary: glowing dashed line + icicle tips
    if (progress < 1) {
      ctx.strokeStyle = 'rgba(120, 205, 255, 0.95)'; ctx.lineWidth = 3;
      ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(-34, iceTopY); ctx.lineTo(34, iceTopY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(200, 238, 255, 0.92)';
      for (let ix = -26; ix <= 26; ix += 10) {
        ctx.beginPath(); ctx.moveTo(ix - 3, iceTopY); ctx.lineTo(ix, iceTopY - 9); ctx.lineTo(ix + 3, iceTopY); ctx.closePath(); ctx.fill();
      }
    }

    // Full opaque ice block once completely frozen
    if (progress >= 1) {
      const capGrad = ctx.createLinearGradient(-36, 0, 36, 0);
      capGrad.addColorStop(0, 'rgba(70, 148, 240, 0.88)');
      capGrad.addColorStop(0.3, 'rgba(185, 232, 255, 0.92)');
      capGrad.addColorStop(0.7, 'rgba(135, 200, 255, 0.88)');
      capGrad.addColorStop(1, 'rgba(60, 138, 228, 0.86)');
      ctx.fillStyle = capGrad;
      ctx.beginPath(); ctx.roundRect(-35, -halfH, 70, halfH * 2, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.36)';
      ctx.beginPath(); ctx.ellipse(-8, -halfH + 10, 14, 8, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(100,185,255,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(-35, -halfH, 70, halfH * 2, 5); ctx.stroke();
    }
  }

  ctx.restore();
}

// ---- Main loop ----
function loop() {
  if (gameState !== 'playing' && gameState !== 'win' && gameState !== 'countdown') return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (gameState === 'countdown') {
    frame++; // keep wing animation going
  } else {
    update();
  }
  drawBackground();
  pipes.forEach(drawPipe);
  if (gameMode === 'single') drawMarioCubes();
  poopItems.forEach(drawPoop);
  if (littleMan) drawLittleMan(littleMan);
  if (chaser) drawChaser();
  if (gameMode === 'single') drawRainEffect();

  if (winDance) {
    danceFrame++;
    const offset = Math.sin(danceFrame * 0.15) * 30;
    const birdDrawX = bird.x + offset;
    const birdDrawY = bird.y + Math.sin(danceFrame * 0.1) * 5;

    // Bright celebration glow (sun shining brighter over time)
    if (danceFrame > 30) {
      const glowAlpha = Math.min((danceFrame - 30) / 70, 0.42);
      const grd = ctx.createRadialGradient(birdDrawX, birdDrawY - 40, 15, birdDrawX, birdDrawY - 40, 280);
      grd.addColorStop(0, `rgba(255,255,170,${glowAlpha})`);
      grd.addColorStop(1, 'rgba(255,240,80,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Sparkling confetti rain (from frame 50)
    if (danceFrame > 50 && danceFrame % 4 === 0) {
      const colors = ['#FFD700','#FFA500','#FF69B4','#87CEEB','#98FB98','#fff','#DDA0DD'];
      particles.push({ x: Math.random() * canvas.width, y: -10,
        vx: (Math.random()-0.5)*1.8, vy: 1.5+Math.random()*2.5,
        life: 1, color: colors[Math.floor(Math.random()*colors.length)], size: 3+Math.random()*5 });
    }

    // Bird victory dance
    drawBird(birdDrawX, birdDrawY, Math.sin(danceFrame * 0.15) * 0.4, false, false);

    // Crown descends slowly from above (starts frame 90)
    if (danceFrame > 90) {
      const targetCrownY = birdDrawY - 60;
      crownY += (targetCrownY - crownY) * 0.038;
      drawCrown(birdDrawX, crownY);
    }

    // Angels float in from sides (starts frame 140)
    if (danceFrame > 140) {
      const af = danceFrame - 140;
      drawAngel(birdDrawX - 100 + Math.sin(af*0.06)*8, birdDrawY - 5 + Math.sin(af*0.09)*14, false);
      drawAngel(birdDrawX + 100 + Math.sin(af*0.06+1.5)*8, birdDrawY - 5 + Math.sin(af*0.09+1)*14, true);
    }

    // "Return to Menu" button slides in (starts frame 320)
    if (danceFrame > 320) {
      winReturnBtnVisible = true;
      drawWinReturnBtn();
    }
  } else if (deathType === 'top' && topDeathPhase) {
    if (topDeathPhase === 'grow' || topDeathPhase === 'alert') {
      drawGrowingPoopBall(bird.x, bird.y, birdScale);
    }
    // In 'explode'/'brown' phases the bird has exploded — don't draw it
  } else if (birdDizzy) {
    // Very dizzy — bird staggers wildly with exaggerated multi-frequency wobble
    const dWobbleX = Math.sin(birdDizzyTimer * 0.30) * 24 + Math.sin(birdDizzyTimer * 0.13) * 10;
    const dWobbleY = Math.cos(birdDizzyTimer * 0.23) * 9 + Math.cos(birdDizzyTimer * 0.44) * 4;
    drawBird(bird.x + dWobbleX, bird.y + dWobbleY, bird.angle, false, false);
    drawDizzyEffect(bird.x + dWobbleX, bird.y + dWobbleY, birdDizzyTimer);
  } else {
    const eagleHasChicken = eagleAttackState &&
      (eagleAttackState.phase === 'grab' || eagleAttackState.phase === 'escape');
    const marioHasChicken = marioBasketState && !friedChicken;
    if (!eagleHasChicken && !marioHasChicken) {
      if (iceFreeze && friedChicken) {
        drawIceFreezeChicken(bird.x, bird.y, iceFreeze.progress);
      } else {
        if (gameMode === 'single') drawRocketBoostFlame();
        if (gameMode === 'single' && birdSizeScale !== 1.0) {
          ctx.save();
          ctx.translate(bird.x, bird.y);
          ctx.scale(birdSizeScale, birdSizeScale);
          ctx.translate(-bird.x, -bird.y);
          drawBird(bird.x, bird.y, bird.angle, birdFire, friedChicken);
          ctx.restore();
        } else {
          drawBird(bird.x, bird.y, bird.angle, birdFire, friedChicken);
        }
      }
    }
  }

  if (eagleAttackState) drawEagleAttack(eagleAttackState);
  if (marioBasketState) drawMarioBasket(marioBasketState);

  drawParticles();
  if (gameMode === 'single') { drawArrows(); drawRocketProjectile(); drawPowerupBanner(); }

  if (poopSlideActive) {
    drawPoopSlide(poopSlideY);
  }

  if (deathType === 'top' && topDeathPhase === 'alert') {
    drawPoopyAlert(topDeathTimer);
  }

  // Draw best score HUD at top of canvas
  if (highScore > 0) {
    ctx.save();
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(canvas.width - 130, 8, 122, 28);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('🏆 Best: ' + highScore, canvas.width - 10, 13);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  if (gameState === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 130px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fillText(countdownVal, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 28px Arial';
    ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 90);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  rafId = requestAnimationFrame(loop);
}

// ============================================================
// ---- MULTIPLAYER MODE ----------------------------------------
// ============================================================

const HALF_W = canvas.width / 2; // 360px per player
let multiL = null, multiR = null;
let multiGameOver = false;
let multiCountdownInterval = null;

function createMultiPlayerState() {
  return {
    bird: { x: 200, y: 300, vy: 0, angle: 0, alive: true },
    pipes: [],
    particles: [],
    score: 0,
    speed: 1,
    pipesSpawned: 0,
    birdFlapFrame: -999,
    dead: false,
    won: false,
    deathType: null,
    timer: 0,   // frames elapsed after death/win, drives overlay fade-in
  };
}

function startMultiGame() {
  gameMode = 'multi';
  if (countdownInterval)      { clearInterval(countdownInterval);      countdownInterval      = null; }
  if (multiCountdownInterval) { clearInterval(multiCountdownInterval); multiCountdownInterval = null; }
  cancelAnimationFrame(rafId);
  document.getElementById('overlay').style.display  = 'none';
  document.getElementById('score-display').style.display = 'none';
  document.getElementById('poop-overlay').style.display  = 'none';

  frame = 0;
  multiL = createMultiPlayerState();
  multiR = createMultiPlayerState();
  multiGameOver  = false;
  gameState      = 'countdown';
  countdownVal   = 3;

  loopMulti();

  let tick = 3;
  multiCountdownInterval = setInterval(() => {
    tick--;
    countdownVal = tick;
    if (tick <= 0) {
      clearInterval(multiCountdownInterval);
      multiCountdownInterval = null;
      gameState = 'playing';
    }
  }, 1000);
}

// Update one player's physics + pipe logic (uses player-local state only)
function updateMultiPlayer(p) {
  if (!p.bird.alive) { p.timer++; return; }

  p.speed = 1 + p.score * 0.05;

  // Physics
  p.bird.vy += GRAVITY;
  p.bird.y  += p.bird.vy;
  p.bird.angle = Math.max(-0.4, Math.min(Math.PI / 2, p.bird.vy * 0.06));

  if (p.bird.y <= 0) { p.bird.y = 0; p.bird.vy = 0; }
  if (p.bird.y >= canvas.height - 60 - 20) {
    p.bird.y = canvas.height - 60 - 20;
    p.bird.alive = false; p.dead = true; p.deathType = 'bottom'; return;
  }

  // Spawn pipes
  if (frame % Math.round(110 / p.speed) === 0 && p.pipesSpawned < 31) {
    const minTop = 80, maxTop = canvas.height - 120 - PIPE_GAP;
    const topH = minTop + Math.random() * (maxTop - minTop);
    const variant = pickPipeVariant(p.pipesSpawned);
    p.pipes.push({ x: canvas.width + 20, topH, scored: false, pipeIndex: p.pipesSpawned + 1, variant });
    p.pipesSpawned++;
  }

  // Move pipes, score, collision
  for (let i = p.pipes.length - 1; i >= 0; i--) {
    const pipe = p.pipes[i];
    pipe.x -= 3 * p.speed;
    if (pipe.x + 60 < 0) { p.pipes.splice(i, 1); continue; }

    if (!pipe.scored && pipe.x + 60 < p.bird.x) {
      pipe.scored = true;
      p.score++;
      if (p.score >= WIN_SCORE) { p.bird.alive = false; p.won = true; return; }
    }

    const bx = p.bird.x - 20, by = p.bird.y - 14, bw = 40, bh = 28, pw = 60;
    if (rectsOverlap(bx, by, bw, bh, pipe.x, 0, pw, pipe.topH)) {
      p.bird.alive = false; p.dead = true; p.deathType = 'top'; return;
    }
    if (rectsOverlap(bx, by, bw, bh, pipe.x, pipe.topH + PIPE_GAP, pw, canvas.height - pipe.topH - PIPE_GAP)) {
      p.bird.alive = false; p.dead = true; p.deathType = 'bottom'; return;
    }
  }

  p.particles.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.life -= 0.03; pt.vy += 0.1; });
  p.particles = p.particles.filter(pt => pt.life > 0);
}

// Draw one player's half.
// Strategy: translate to the half's x-offset, scale x by 0.5 so the full
// 720-wide game compresses into 360px. Temporarily swap globals so all the
// existing draw functions (drawBackground, drawPipe, drawBird …) use this
// player's state automatically.
function drawMultiHalf(p, offsetX) {
  // --- scaled game visuals ---
  ctx.save();
  ctx.translate(offsetX, 0);
  ctx.scale(0.5, 1);
  ctx.beginPath(); ctx.rect(0, 0, canvas.width, canvas.height); ctx.clip();

  // Swap globals
  const _bird = bird, _pipes = pipes, _particles = particles;
  const _score = score, _speed = speed, _bff = birdFlapFrame, _psw = pipesSpawned;
  bird          = p.bird;
  pipes         = p.pipes;
  particles     = p.particles;
  score         = p.score;
  speed         = p.speed;
  birdFlapFrame = p.birdFlapFrame;
  pipesSpawned  = p.pipesSpawned;

  drawBackground();
  pipes.forEach(drawPipe);

  if (p.won) {
    const off = Math.sin(p.timer * 0.15) * 30;
    drawBird(bird.x + off, bird.y + Math.sin(p.timer * 0.1) * 5,
             Math.sin(p.timer * 0.15) * 0.4, false, false);
  } else {
    drawBird(bird.x, bird.y,
             p.dead ? Math.min(bird.angle + 0.8, Math.PI * 0.7) : bird.angle,
             false, false);
  }

  // Restore globals
  bird          = _bird;
  pipes         = _pipes;
  particles     = _particles;
  score         = _score;
  speed         = _speed;
  birdFlapFrame = _bff;
  pipesSpawned  = _psw;
  ctx.restore();

  // --- HUD + overlays (in screen / unscaled coords) ---
  ctx.save();

  // Score / player HUD box
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(offsetX + 6, 6, 102, 64);
  ctx.font = 'bold 15px Arial';
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = '#fff';
  ctx.fillText('Score: ' + p.score, offsetX + 12, 11);
  ctx.font = 'bold 14px Arial';
  ctx.fillStyle = '#FFD700';
  ctx.fillText(offsetX === 0 ? 'P1   [ Q ]' : 'P2   [ L ]', offsetX + 12, 31);
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgba(180,255,180,0.9)';
  ctx.fillText('Speed: ' + p.speed.toFixed(1) + 'x', offsetX + 12, 51);

  // Death overlay
  if (p.dead && p.timer > 15) {
    const fade = Math.min((p.timer - 15) / 20, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * fade})`;
    ctx.fillRect(offsetX, 0, HALF_W, canvas.height);
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px serif';
    ctx.fillText('💀', offsetX + HALF_W / 2, canvas.height / 2 - 52);
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#ff5555';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
    ctx.fillText(p.deathType === 'top' ? 'Hit top pillar!' : 'Hit bottom!',
                 offsetX + HALF_W / 2, canvas.height / 2 + 4);
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + p.score, offsetX + HALF_W / 2, canvas.height / 2 + 46);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Win overlay
  if (p.won && p.timer > 30) {
    const fade = Math.min((p.timer - 30) / 25, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.38 * fade})`;
    ctx.fillRect(offsetX, 0, HALF_W, canvas.height);
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '72px serif';
    ctx.fillText('🏆', offsetX + HALF_W / 2, canvas.height / 2 - 52);
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 10;
    ctx.fillText('WINNER!', offsetX + HALF_W / 2, canvas.height / 2 + 4);
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('Score: ' + p.score, offsetX + HALF_W / 2, canvas.height / 2 + 46);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function showMultiResult() {
  if (gameMode !== 'multi') return;
  cancelAnimationFrame(rafId);
  gameMode = 'single';

  const ls = multiL.score, rs = multiR.score;
  const lw = multiL.won, rw = multiR.won;

  let title;
  if      (lw && !rw)  title = '🏆 Player 1 Wins!';
  else if (rw && !lw)  title = '🏆 Player 2 Wins!';
  else if (ls > rs)    title = '🏆 Player 1 Wins!';
  else if (rs > ls)    title = '🏆 Player 2 Wins!';
  else                 title = '🤝 It\'s a Tie!';

  const ov = document.getElementById('overlay');
  ov.style.display = 'flex';
  ov.querySelector('h1').textContent = title;
  ov.querySelector('p').textContent  = `P1: ${ls} pts   |   P2: ${rs} pts`;
  document.getElementById('startBtn').textContent = '▶ Play Again (1P)';
}

function loopMulti() {
  if (gameMode !== 'multi') return;
  if (gameState !== 'playing' && gameState !== 'countdown') return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  frame++;
  if (gameState === 'playing') {
    updateMultiPlayer(multiL);
    updateMultiPlayer(multiR);
  }

  drawMultiHalf(multiL, 0);
  drawMultiHalf(multiR, HALF_W);

  // Centre dividing line
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 9]);
  ctx.beginPath();
  ctx.moveTo(HALF_W, 0);
  ctx.lineTo(HALF_W, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Countdown overlay
  if (gameState === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 130px Arial';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 14;
    ctx.fillText(countdownVal > 0 ? countdownVal : 'GO!', canvas.width / 2, canvas.height / 2 - 20);
    ctx.shadowBlur = 0;
    ctx.font = 'bold 26px Arial';
    ctx.fillText('Get Ready!', canvas.width / 2, canvas.height / 2 + 78);
    ctx.font = 'bold 19px Arial';
    ctx.fillStyle = '#FFD700';
    ctx.fillText('[ Q ] to flap',         HALF_W / 2,          canvas.height / 2 + 128);
    ctx.fillText('[ L ] to flap', HALF_W + HALF_W / 2, canvas.height / 2 + 128);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // Both players done → schedule result screen
  if (!multiGameOver && (multiL.dead || multiL.won) && (multiR.dead || multiR.won)) {
    multiGameOver = true;
    setTimeout(showMultiResult, 2800);
  }

  rafId = requestAnimationFrame(loopMulti);
}

// ============================================================
// ---- MARIO CUBE POWER-UP SYSTEM (single-player only) -------
// ============================================================

const CUBE_SIZE = 36;

function resetMarioPowerupSystem() {
  marioCubes = [];
  activePowerup = null;
  arrowProjectiles = [];
  rocketProjectile = null;
  rainDrops = [];
  windPhase = 0;
  powerupBanner = null;
  lastCubeSpawnFrame = 0;
  birdSizeScale = 1.0;
  rocketLauncherAmmo = 0;
}

// ---- Cube spawning ----
function trySpawnMarioCube() {
  if (score < 1) return;
  if (activePowerup) return;
  if (marioCubes.length >= 1) return;
  if (frame - lastCubeSpawnFrame < 600) return;
  // Only spawn when no pipe is currently in the zone the cube will travel through
  // (x 120–480 = the stretch between the bird and mid-screen).
  // This works at any speed and guarantees a clear corridor.
  const pipeNearBird = pipes.some(p => p.x > 120 && p.x < 480);
  if (pipeNearBird) return;
  const y = 90 + Math.random() * 300;
  marioCubes.push({ x: canvas.width + 10, y, hit: false, hitAnim: 0, spent: false });
  lastCubeSpawnFrame = frame;
}

function updateMarioCubes() {
  trySpawnMarioCube();
  for (let i = marioCubes.length - 1; i >= 0; i--) {
    const cube = marioCubes[i];
    if (!cube.hit) {
      cube.x -= 3 * speed; // match pipe speed so relative gap is preserved
    } else {
      cube.hitAnim++;
      if (cube.hitAnim > 45) cube.spent = true;
    }
    if (cube.x + CUBE_SIZE < 0 || cube.spent) { marioCubes.splice(i, 1); continue; }
    // Hit detection: bird touches cube from any direction
    if (!cube.hit && bird.alive) {
      const bLeft  = bird.x - 20 * birdSizeScale;
      const bRight = bird.x + 20 * birdSizeScale;
      const bTop   = bird.y - 14 * birdSizeScale;
      const bBot   = bird.y + 14 * birdSizeScale;
      if (bRight > cube.x && bLeft < cube.x + CUBE_SIZE &&
          bBot > cube.y  && bTop < cube.y + CUBE_SIZE) {
        cube.hit = true; cube.hitAnim = 0;
        activatePowerup();
      }
    }
  }
}

// ---- Powerup activation ----
function activatePowerup() {
  if (activePowerup) return;
  const isObstacle = Math.random() < 0.5;
  // Among advantages, small_bird has 50% chance (rocket_launcher and rocket_boost 25% each)
  const type = isObstacle
    ? ['moving_pipes', 'arrows', 'rain_wind'][Math.floor(Math.random() * 3)]
    : (Math.random() < 0.5 ? 'small_bird' : (Math.random() < 0.5 ? 'rocket_launcher' : 'rocket_boost'));

  const durations = {
    moving_pipes: 480, arrows: 420, rain_wind: 600,
    rocket_launcher: 900, small_bird: 480, rocket_boost: 200,
  };
  activePowerup = { type, timer: durations[type] };

  switch (type) {
    case 'moving_pipes':
      pipes.forEach(p => { p.baseTopH = p.topH; p.moveCycle = Math.random() * Math.PI * 2; });
      powerupBanner = { text: '\u26a0\ufe0f MOVING PIPES!', color: '#FF6600', isAdvantage: false, timer: 320 };
      break;
    case 'arrows':
      arrowProjectiles = []; windPhase = 0;
      powerupBanner = { text: '\u26a0\ufe0f ARROW STORM!', color: '#FF2200', isAdvantage: false, timer: 320 };
      break;
    case 'rain_wind':
      rainDrops = []; windPhase = 0;
      for (let i = 0; i < 65; i++) rainDrops.push(newRainDrop(true));
      powerupBanner = { text: '\u26a0\ufe0f STORM & WIND!', color: '#4488ff', isAdvantage: false, timer: 320 };
      break;
    case 'rocket_launcher':
      rocketLauncherAmmo = 3; rocketProjectile = null;
      powerupBanner = { text: '\ud83d\ude80 ROCKET LAUNCHER! [S]', color: '#00dd44', isAdvantage: true, timer: 320 };
      break;
    case 'small_bird':
      birdSizeScale = 0.55;
      powerupBanner = { text: '\ud83d\udc24 TINY BIRD!', color: '#FFD700', isAdvantage: true, timer: 320 };
      break;
    case 'rocket_boost':
      powerupBanner = { text: '\ud83d\ude80 ROCKET BOOST!', color: '#FF8800', isAdvantage: true, timer: 320 };
      break;
  }
}

function newRainDrop(randomY) {
  return { x: Math.random() * canvas.width, y: randomY ? Math.random() * canvas.height : -10,
           speed: 6 + Math.random() * 5, len: 12 + Math.random() * 9 };
}

// ---- Powerup per-frame update ----
function updatePowerup() {
  if (!activePowerup) return;
  activePowerup.timer--;

  switch (activePowerup.type) {
    case 'moving_pipes':
      pipes.forEach(p => {
        if (p.baseTopH !== undefined)
          p.topH = p.baseTopH + Math.sin(frame * 0.04 + (p.moveCycle || 0)) * 35;
      });
      break;

    case 'arrows':
      windPhase++;
      if (windPhase % 75 === 0) {
        const ay = 80 + Math.random() * (canvas.height - 200);
        arrowProjectiles.push({ x: canvas.width + 20, y: ay, vy: (Math.random() - 0.5) * 2.2, spd: 7 + Math.random() * 3 });
      }
      for (let i = arrowProjectiles.length - 1; i >= 0; i--) {
        const a = arrowProjectiles[i];
        a.x -= a.spd; a.y += a.vy;
        if (a.x < -30) { arrowProjectiles.splice(i, 1); continue; }
        if (bird.alive) {
          const bs = birdSizeScale;
          if (a.x >= bird.x - 20*bs && a.x <= bird.x + 20*bs &&
              a.y >= bird.y - 14*bs && a.y <= bird.y + 14*bs) {
            triggerBottomDeath();
          }
        }
      }
      break;

    case 'rain_wind':
      windPhase++;
      rainDrops.forEach(d => {
        d.y += d.speed;
        d.x += Math.sin(windPhase * 0.018) * 2;
        if (d.y > canvas.height) { d.y = -10; d.x = Math.random() * canvas.width; }
      });
      if (windPhase % 22 === 0 && bird.alive) bird.vy += (Math.random() - 0.35) * 2.8;
      if (bird.alive) bird.vy += 0.07;
      break;

    case 'rocket_launcher':
      if (rocketProjectile && rocketProjectile.active) {
        rocketProjectile.trail.push({ x: rocketProjectile.x, y: rocketProjectile.y });
        if (rocketProjectile.trail.length > 14) rocketProjectile.trail.shift();
        rocketProjectile.x += 14;
        for (let i = pipes.length - 1; i >= 0; i--) {
          const p = pipes[i];
          if (rocketProjectile.x >= p.x && rocketProjectile.x <= p.x + 60) {
            spawnExplosion(p.x + 30, p.topH + PIPE_GAP / 2, '#FFD700', 22);
            pipes.splice(i, 1);
            rocketProjectile.active = false;
            rocketProjectile = null;
            break;
          }
        }
        if (rocketProjectile && rocketProjectile.x > canvas.width + 60) rocketProjectile = null;
      }
      break;

    case 'small_bird':
    case 'rocket_boost':
      break;
  }

  if (activePowerup.timer <= 0) endPowerup();
}

function endPowerup() {
  if (!activePowerup) return;
  switch (activePowerup.type) {
    case 'moving_pipes': pipes.forEach(p => { if (p.baseTopH !== undefined) p.topH = p.baseTopH; }); break;
    case 'arrows':       arrowProjectiles = []; break;
    case 'rain_wind':    rainDrops = []; windPhase = 0; break;
    case 'small_bird':   birdSizeScale = 1.0; break;
    case 'rocket_launcher': rocketLauncherAmmo = 0; rocketProjectile = null; break;
  }
  activePowerup = null;
  lastCubeSpawnFrame = frame;
}

// ============================================================
// ---- DRAW: Mario ? cubes ----
// ============================================================
function drawMarioCubes() {
  marioCubes.forEach(cube => {
    const s = CUBE_SIZE;
    let cy = cube.y;
    if (cube.hit && cube.hitAnim < 45)
      cy = cube.y - Math.sin((cube.hitAnim / 45) * Math.PI) * 11;

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(cube.x + 3, cy + 4, s, s);
    ctx.fillStyle = cube.hit ? '#a0844a' : '#e09000';
    ctx.strokeStyle = cube.hit ? '#6a5028' : '#8B5E00';
    ctx.lineWidth = 2;
    ctx.fillRect(cube.x, cy, s, s);
    ctx.strokeRect(cube.x, cy, s, s);
    // Bevels
    ctx.fillStyle = cube.hit ? '#c0a060' : '#FFDD44';
    ctx.fillRect(cube.x + 2, cy + 2, s - 4, 4);
    ctx.fillRect(cube.x + 2, cy + 2, 4, s - 4);
    ctx.fillStyle = cube.hit ? '#6a5028' : '#7a4e00';
    ctx.fillRect(cube.x + s - 5, cy + 5, 3, s - 7);
    ctx.fillRect(cube.x + 5, cy + s - 5, s - 7, 3);

    if (!cube.hit) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 23px Arial';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 3;
      ctx.fillText('?', cube.x + s / 2, cy + s / 2 + 1);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    } else {
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(cube.x + s / 2, cy + s / 2, 5, 0, Math.PI * 2); ctx.fill();
      if (cube.hitAnim < 22) {
        for (let si = 0; si < 5; si++) {
          const sa = (si / 5) * Math.PI * 2 + cube.hitAnim * 0.18;
          const sd = cube.hitAnim * 1.4;
          ctx.globalAlpha = 1 - cube.hitAnim / 22;
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(cube.x + s/2 + Math.cos(sa)*sd, cy + s/2 + Math.sin(sa)*sd, 4, 0, Math.PI*2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  });
}

// ============================================================
// ---- DRAW: Rain effect ----
// ============================================================
function drawRainEffect() {
  if (!activePowerup || activePowerup.type !== 'rain_wind') return;
  const fade = Math.min(activePowerup.timer / 80, 1);
  ctx.save();
  ctx.fillStyle = `rgba(0,10,30,${0.18 * fade})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = `rgba(160,210,255,${0.65 * fade})`;
  ctx.lineWidth = 1.4;
  const wo = Math.sin(windPhase * 0.018) * 0.28;
  rainDrops.forEach(d => {
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + wo * d.len * 2, d.y + d.len);
    ctx.stroke();
  });
  // Wind gust streaks
  ctx.strokeStyle = `rgba(180,220,255,${0.12 * fade})`;
  ctx.lineWidth = 1;
  for (let gi = 0; gi < 6; gi++) {
    const gy = 60 + gi * 90 + Math.sin(windPhase * 0.03 + gi) * 20;
    const gx = (windPhase * 2.5 + gi * 130) % (canvas.width + 80) - 40;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + 55 + gi * 10, gy + 3); ctx.stroke();
  }
  ctx.restore();
}

// ============================================================
// ---- DRAW: Arrows ----
// ============================================================
function drawArrows() {
  if (!activePowerup || activePowerup.type !== 'arrows') return;
  arrowProjectiles.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.atan2(a.vy, -a.spd) + Math.PI);
    ctx.strokeStyle = '#8B4513'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-30, 0); ctx.stroke();
    ctx.fillStyle = '#aaa'; ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(5, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#cc4400'; ctx.lineWidth = 2;
    [[-22, -5], [-22, 5], [-26, -5], [-26, 5]].forEach(([fx, fy]) => {
      ctx.beginPath(); ctx.moveTo(fx + 4, 0); ctx.lineTo(fx, fy); ctx.stroke();
    });
    ctx.restore();
  });
}

// ============================================================
// ---- DRAW: Rocket projectile (launcher advantage) ----
// ============================================================
function drawRocketProjectile() {
  if (!rocketProjectile || !rocketProjectile.active) return;
  const { x, y, trail } = rocketProjectile;
  trail.forEach((t, i) => {
    const p = i / trail.length;
    ctx.globalAlpha = p * 0.65;
    ctx.fillStyle = p > 0.55 ? '#FF6600' : '#FF2200';
    ctx.beginPath(); ctx.arc(t.x - 6, t.y, 1 + p * 8, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#cc0000'; ctx.strokeStyle = '#880000'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(7, -6); ctx.lineTo(7, 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ddd';
  ctx.fillRect(-10, -5, 17, 10); ctx.strokeRect(-10, -5, 17, 10);
  ctx.fillStyle = '#cc0000'; ctx.fillRect(-2, -5, 5, 10);
  ctx.fillStyle = '#FF8800';
  ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(-24, 0); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#FFEE00';
  ctx.beginPath(); ctx.moveTo(-10, -2); ctx.lineTo(-18, 0); ctx.lineTo(-10, 2); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ============================================================
// ---- DRAW: Rocket boost flame behind bird ----
// ============================================================
function drawRocketBoostFlame() {
  if (!activePowerup || activePowerup.type !== 'rocket_boost' || !bird.alive) return;
  const fl = 38 + Math.random() * 22;
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.angle);
  ctx.fillStyle = 'rgba(255,100,0,0.85)';
  ctx.beginPath(); ctx.moveTo(-22, -9); ctx.lineTo(-22 - fl, 0); ctx.lineTo(-22, 9); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,235,0,0.92)';
  ctx.beginPath(); ctx.moveTo(-22, -5); ctx.lineTo(-22 - fl * 0.6, 0); ctx.lineTo(-22, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ============================================================
// ---- DRAW: Power-up banner + timer bar ----
// ============================================================
function drawPowerupBanner() {
  // Timer bar near bottom
  if (activePowerup) {
    const maxT = { moving_pipes:480, arrows:420, rain_wind:600, rocket_launcher:900, small_bird:480, rocket_boost:200 };
    const prog = activePowerup.timer / (maxT[activePowerup.type] || 480);
    const barW = 210, barH = 10;
    const bx = canvas.width / 2 - barW / 2, by = canvas.height - 82;
    const isObs = ['moving_pipes','arrows','rain_wind'].includes(activePowerup.type);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(bx - 6, by - 22, barW + 12, barH + 32);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = isObs ? `hsl(${Math.floor(prog * 18)},100%,50%)` : `hsl(${120 - Math.floor((1-prog)*30)},95%,45%)`;
    ctx.fillRect(bx, by, barW * prog, barH);
    const labels = {
      moving_pipes: '\u26a0\ufe0f Moving Pipes', arrows: '\u26a0\ufe0f Arrow Storm',
      rain_wind: '\u26a0\ufe0f Storm & Wind', rocket_launcher: '\ud83d\ude80 Launcher [S] \u00d7' + rocketLauncherAmmo,
      small_bird: '\ud83d\udc24 Tiny Bird', rocket_boost: '\ud83d\ude80 BOOST!',
    };
    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(labels[activePowerup.type] || '', canvas.width / 2, by - 5);
    ctx.restore();
  }

  // Notification pop-up
  if (powerupBanner && powerupBanner.timer > 0) {
    powerupBanner.timer--;
    const t = powerupBanner.timer;
    const alpha = Math.min(t / 25, 1) * Math.min((320 - t) / 18 + 1, 1);
    if (alpha <= 0) return;
    const bw = 390, bh = 54;
    const bx = canvas.width / 2 - bw / 2, by = canvas.height / 2 - 105;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = powerupBanner.isAdvantage ? 'rgba(0,75,0,0.9)' : 'rgba(110,0,0,0.9)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 11);
    else ctx.rect(bx, by, bw, bh);
    ctx.fill();
    ctx.strokeStyle = powerupBanner.color; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 7;
    ctx.fillText(powerupBanner.text, canvas.width / 2, by + bh / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

// ============================================================
// ---- FULLSCREEN SCALING ------------------------------------
// Canvas and game-wrap are 100vw×100vh via CSS.
// resizeGame() is kept as a no-op shim so nothing breaks.
// ============================================================
function resizeGame() {}
window.addEventListener('resize', resizeGame);
