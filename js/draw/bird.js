// ============================================================
// draw/bird.js — bird, costumes, enemies (Pac-Man, Cowboy, Yeti)
// ============================================================

import { S } from '../state.js';

export function drawBird(bx, by, angle, showFire, friedMode) {
  const ctx   = S.ctx;
  const frame = S.frame;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(angle);

  if (friedMode) {
    ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍗', 0, 0); ctx.textBaseline = 'alphabetic';
  } else {
    const timeSinceFlap = frame - S.birdFlapFrame;
    const flapActive    = timeSinceFlap < 18;
    const wingFlap      = flapActive ? Math.sin(timeSinceFlap * 0.55) : 0;
    const wingOffY      = wingFlap * 11;

    ctx.fillStyle = '#c89000';
    ctx.beginPath(); ctx.moveTo(-18,-3); ctx.lineTo(-34,-12); ctx.lineTo(-30,-2); ctx.lineTo(-36,4); ctx.lineTo(-28,3); ctx.lineTo(-33,12); ctx.lineTo(-18,4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#a07000'; ctx.lineWidth = 1; ctx.stroke();

    ctx.save(); ctx.translate(-6,4);
    ctx.fillStyle='#d4a800'; ctx.strokeStyle='#b08800'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.ellipse(0,wingOffY*0.35,18,7,0.15,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.restore();

    const bodyGrad = ctx.createRadialGradient(-2,0,3,-2,2,22);
    bodyGrad.addColorStop(0,'#ffe066'); bodyGrad.addColorStop(0.6,'#f5c518'); bodyGrad.addColorStop(1,'#c89000');
    ctx.fillStyle = bodyGrad; ctx.strokeStyle = '#a87800'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-2,2,20,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,240,120,0.35)'; ctx.beginPath(); ctx.ellipse(-5,-2,11,9,-0.2,0,Math.PI*2); ctx.fill();

    if (S.gameMode === 'single' && S.activePowerup && S.activePowerup.type === 'rocket_launcher') {
      ctx.fillStyle='#404040'; ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1.5;
      ctx.fillRect(-28,-17,26,11); ctx.strokeRect(-28,-17,26,11);
      ctx.fillStyle='#2a2a2a'; ctx.beginPath(); ctx.arc(-28,-11,5.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#666'; ctx.beginPath(); ctx.arc(-28,-11,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#cc0000'; ctx.fillRect(-8,-17,6,3);
      ctx.fillStyle='#FFD700'; ctx.font='bold 11px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('×'+S.rocketLauncherAmmo,-15,-25); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    }

    ctx.save(); ctx.translate(-5,-2); ctx.rotate(-wingFlap*0.55);
    const wGrad=ctx.createLinearGradient(0,-8,0,8); wGrad.addColorStop(0,'#ffe070'); wGrad.addColorStop(1,'#c89000');
    ctx.fillStyle=wGrad; ctx.strokeStyle='#a87800'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(0,wingOffY*0.5,20,7,-0.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(168,120,0,0.6)'; ctx.lineWidth=1;
    for(let fi=0;fi<4;fi++){const fx=- 14+fi*8; ctx.beginPath(); ctx.moveTo(fx,wingOffY*0.5-3); ctx.lineTo(fx+2,wingOffY*0.5+6); ctx.stroke();}
    ctx.restore();

    const headGrad=ctx.createRadialGradient(12,-17,3,14,-12,26);
    headGrad.addColorStop(0,'#ffe870'); headGrad.addColorStop(0.65,'#f5c518'); headGrad.addColorStop(1,'#c89000');
    ctx.fillStyle=headGrad; ctx.strokeStyle='#a87800'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(14,-12,26,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e0a800';
    ctx.beginPath(); ctx.moveTo(9,-37); ctx.lineTo(13,-51); ctx.lineTo(17,-37); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(17,-37); ctx.lineTo(22,-49); ctx.lineTo(27,-35); ctx.closePath(); ctx.fill();

    if (S.photoImg) {
      ctx.save(); ctx.beginPath(); ctx.arc(14,-12,25,0,Math.PI*2); ctx.clip();
      ctx.drawImage(S.photoImg,-11,-37,50,50); ctx.restore();
      ctx.strokeStyle='#a87800'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(14,-12,25,0,Math.PI*2); ctx.stroke();
    } else {
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(24,-18,11,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(26,-18,6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(29,-21,2.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,130,80,0.38)'; ctx.beginPath(); ctx.ellipse(17,-3,7,5,0.3,0,Math.PI*2); ctx.fill();
    }

    ctx.fillStyle='#FF8C00'; ctx.strokeStyle='#cc5500'; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(36,-18); ctx.lineTo(52,-12); ctx.lineTo(36,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e07000';
    ctx.beginPath(); ctx.moveTo(36,-9); ctx.lineTo(50,-10); ctx.lineTo(36,-4); ctx.closePath(); ctx.fill(); ctx.stroke();

    if (S.score >= 10) {
      if (S.theme === 'desert')   drawBirdHatDesert();
      else if (S.theme === 'mountain') drawBirdHatMountain();
    }
    if (S.score >= 20) {
      if (S.theme === 'desert')   drawBirdBodyDesert();
      else if (S.theme === 'mountain') drawBirdBodyMountain();
    }
  }
  ctx.restore();
}

function drawBirdHatDesert() {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(14,-12);
  ctx.fillStyle='#8B4513'; ctx.strokeStyle='#5a2a08'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(0,-22,30,7,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,200,100,0.2)'; ctx.beginPath(); ctx.ellipse(-4,-24,18,3.5,-0.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#8B4513'; ctx.strokeStyle='#5a2a08'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-16,-22); ctx.bezierCurveTo(-17,-50,-10,-56,0,-57); ctx.bezierCurveTo(10,-56,17,-50,16,-22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle='#5a2a08'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(-6,-55); ctx.quadraticCurveTo(0,-60,6,-55); ctx.stroke();
  ctx.fillStyle='#2a1a08'; ctx.beginPath(); ctx.moveTo(-16,-26); ctx.lineTo(16,-26); ctx.lineTo(15,-32); ctx.lineTo(-15,-32); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#FFD700'; ctx.strokeStyle='#aa9000'; ctx.lineWidth=1;
  ctx.fillRect(-4,-31,8,6); ctx.strokeRect(-4,-31,8,6);
  ctx.strokeStyle='#2a1a08'; ctx.lineWidth=0.8; ctx.strokeRect(-2,-29,4,2);
  ctx.fillStyle='rgba(255,200,100,0.18)'; ctx.beginPath(); ctx.ellipse(-3,-44,7,11,-0.1,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBirdHatMountain() {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(14,-12);
  ctx.fillStyle='#f0f0f0'; ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.ellipse(0,-22,27,8,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(-4,-25,16,4,-0.1,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#c0392b'; ctx.strokeStyle='#922b21'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(-18,-22); ctx.quadraticCurveTo(-16,-45,2,-58); ctx.quadraticCurveTo(16,-52,14,-22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#c0392b'; ctx.beginPath(); ctx.moveTo(2,-58); ctx.quadraticCurveTo(18,-66,22,-52); ctx.quadraticCurveTo(20,-44,14,-42); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(255,150,140,0.3)'; ctx.beginPath(); ctx.moveTo(-10,-24); ctx.quadraticCurveTo(-12,-44,0,-56); ctx.quadraticCurveTo(-2,-44,-4,-24); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#f0f0f0'; ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(22,-52,7,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(20,-54,3,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBirdBodyDesert() {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(-6,6);
  ctx.shadowColor='rgba(255,220,0,0.7)'; ctx.shadowBlur=8;
  ctx.fillStyle='#FFD700'; ctx.strokeStyle='#aa8800'; ctx.lineWidth=1.2;
  ctx.beginPath();
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2-Math.PI/2,r=i%2===0?10:4.5; i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='rgba(255,255,200,0.5)';
  ctx.beginPath();
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2-Math.PI/2,r=i%2===0?5.5:2.5; i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle='#aa8800'; ctx.beginPath(); ctx.arc(0,0,1.8,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawBirdBodyMountain() {
  const ctx = S.ctx;
  ctx.save();
  ctx.fillStyle='#c0392b'; ctx.strokeStyle='#922b21'; ctx.lineWidth=1.2;
  ctx.beginPath(); ctx.arc(-2,2,20,0.15,Math.PI-0.15); ctx.lineTo(-2,2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f0f0f0'; ctx.strokeStyle='#ccc'; ctx.lineWidth=0.8;
  ctx.beginPath(); ctx.ellipse(-2,22,19,5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#f0f0f0'; ctx.beginPath(); ctx.ellipse(-2,8,4,13,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a1a1a'; ctx.fillRect(-20,3,36,6);
  ctx.fillStyle='#FFD700'; ctx.strokeStyle='#aa8800'; ctx.lineWidth=1;
  ctx.fillRect(-5,2,10,8); ctx.strokeRect(-5,2,10,8);
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=0.8; ctx.strokeRect(-2,4,4,4);
  ctx.fillStyle='#f0f0f0'; ctx.beginPath(); ctx.arc(-2,-8,2.5,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#ccc'; ctx.lineWidth=0.8; ctx.stroke();
  ctx.restore();
}

// ---- Little man ----
export function drawLittleMan(man) {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(man.x, man.y);
  ctx.fillStyle='#555'; ctx.fillRect(-6,-20,12,20);
  ctx.fillStyle='#ffcc99'; ctx.beginPath(); ctx.arc(0,-26,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#333'; ctx.fillRect(-8,-36,16,6); ctx.fillRect(-5,-42,10,8);
  ctx.fillStyle='#555'; ctx.fillRect(-18,-18,18,5);
  ctx.fillStyle='#888'; ctx.fillRect(-22,-19,6,7);
  ctx.restore();
  if (man.bullet && man.bullet.active) {
    const fromX=man.x-22, fromY=man.y-18;
    const dx=man.bullet.x-fromX, dy=man.bullet.y-fromY;
    const dist=Math.sqrt(dx*dx+dy*dy), nx=dx/dist, ny=dy/dist;
    const perpX=-ny, perpY=nx;
    ctx.strokeStyle='#aaa'; ctx.lineWidth=1.8; ctx.beginPath();
    const springSegs=7;
    for(let s=0;s<=springSegs;s++){const t=s/springSegs,wobble=s%2===0?5:-5,cx2=fromX+dx*t+perpX*wobble,cy2=fromY+dy*t+perpY*wobble; s===0?ctx.moveTo(cx2,cy2):ctx.lineTo(cx2,cy2);}
    ctx.stroke();
    const gx=man.bullet.x, gy2=man.bullet.y, gloveAngle=Math.atan2(dy,dx);
    ctx.save(); ctx.translate(gx,gy2); ctx.rotate(gloveAngle);
    ctx.fillStyle='#CC1A00'; ctx.strokeStyle='#7a0e00'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.ellipse(0,0,11,9,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#EE2A00';
    for(let k=0;k<3;k++){ctx.beginPath();ctx.arc(-6+k*6,-6,3.5,Math.PI,0);ctx.fill();}
    ctx.fillStyle='#fff'; ctx.fillRect(-11,4,22,4); ctx.strokeStyle='#ccc'; ctx.lineWidth=0.8; ctx.strokeRect(-11,4,22,4);
    ctx.fillStyle='#DD2200'; ctx.beginPath(); ctx.ellipse(-10,-2,5,3.5,-0.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

// ---- Chaser draw ----
export function drawChaser() {
  const ctx = S.ctx;
  const c   = S.chaser;
  if (!c || c.state === 'gone') return;
  if (c.state === 'ash' && c.ashParticles.length > 0) {
    c.ashParticles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      const g = Math.floor(70 + p.alpha * 60);
      ctx.fillStyle = `rgb(${g},${g-8},${g-16})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  if (c.alpha <= 0) return;
  if (S.theme === 'nature')        drawPacman(c.x, c.y, S.frame, c.alpha);
  else if (S.theme === 'desert')   drawCowboy(c.x, c.y, S.frame, c.alpha);
  else if (S.theme === 'mountain') drawYeti(c.x, c.y, S.frame, c.alpha);
}

function drawPacman(cx, cy, frm, alpha) {
  const ctx = S.ctx;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy);
  const m = Math.abs(Math.sin(frm * 0.18)) * 0.45;
  ctx.fillStyle='#FFD700'; ctx.strokeStyle='#cc8800'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,24,m,Math.PI*2-m); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(7,-12,3.5,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=alpha*0.65; ctx.fillStyle='#7b7bff';
  ctx.beginPath(); ctx.arc(-50,0,16,Math.PI,0); ctx.lineTo(-34,16); ctx.lineTo(-38,12); ctx.lineTo(-43,16); ctx.lineTo(-48,12); ctx.lineTo(-53,16); ctx.lineTo(-58,12); ctx.lineTo(-66,16); ctx.lineTo(-66,0); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(-45,-1,5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-56,-1,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#00a'; ctx.beginPath(); ctx.arc(-44,-1,2.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(-55,-1,2.5,0,Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawCowboy(cx, cy, frm, alpha) {
  const ctx = S.ctx;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy);
  const g=frm*0.24, legF1=Math.sin(g)*20, legF2=Math.sin(g+0.6)*20, legB1=Math.sin(g+Math.PI)*20, legB2=Math.sin(g+Math.PI+0.6)*20, bob=Math.abs(Math.sin(g))*3-1.5;
  ctx.save(); ctx.translate(0,bob);
  ctx.strokeStyle='#6e3818'; ctx.lineWidth=6; ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-20,10);ctx.lineTo(-20+legB1*0.5,10+18);ctx.lineTo(-20+legB1,10+20+Math.abs(legB1)*0.28);ctx.stroke();
  ctx.fillStyle='#1a0a00';ctx.beginPath();ctx.ellipse(-20+legB1,10+20+Math.abs(legB1)*0.28,5.5,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(-15,12);ctx.lineTo(-15+legB2*0.5,12+18);ctx.lineTo(-15+legB2,12+20+Math.abs(legB2)*0.28);ctx.stroke();
  ctx.fillStyle='#1a0a00';ctx.beginPath();ctx.ellipse(-15+legB2,12+20+Math.abs(legB2)*0.28,5.5,2.5,0,0,Math.PI*2);ctx.fill();
  const hbg=ctx.createRadialGradient(-4,0,4,-4,0,36);hbg.addColorStop(0,'#bf7040');hbg.addColorStop(0.6,'#9e4e28');hbg.addColorStop(1,'#7a3818');
  ctx.fillStyle=hbg;ctx.strokeStyle='#5a2810';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,38,20,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,210,150,0.16)';ctx.beginPath();ctx.ellipse(0,8,22,10,0,0,Math.PI*2);ctx.fill();
  const ts=Math.sin(g*0.7)*10;ctx.strokeStyle='#200e00';ctx.lineWidth=4;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-36,-4);ctx.quadraticCurveTo(-52+ts,6,-46+ts,26);ctx.stroke();
  ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-36,-4);ctx.quadraticCurveTo(-50+ts,9,-42+ts,30);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-35,-3);ctx.quadraticCurveTo(-54+ts,3,-49+ts,22);ctx.stroke();
  ctx.fillStyle='#9e4e28';ctx.strokeStyle='#5a2810';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(23,-10);ctx.quadraticCurveTo(33,-22,36,-28);ctx.quadraticCurveTo(40,-30,42,-24);ctx.quadraticCurveTo(40,-16,30,-6);ctx.closePath();ctx.fill();ctx.stroke();
  const hg=ctx.createLinearGradient(30,-42,56,-24);hg.addColorStop(0,'#ae6030');hg.addColorStop(1,'#883e18');
  ctx.fillStyle=hg;ctx.beginPath();ctx.ellipse(44,-34,16,11,-0.35,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#3a1008';ctx.beginPath();ctx.ellipse(55,-30,3,2,0.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(52,-38,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(53,-39,1.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#180800';ctx.lineWidth=2.5;ctx.lineCap='round';
  [[30,-30,20,-42,18,-36],[26,-26,16,-38,14,-32],[32,-34,22,-46,20,-40]].forEach(([mx,my,qx,qy,ex,ey])=>{ctx.beginPath();ctx.moveTo(mx,my);ctx.quadraticCurveTo(qx,qy,ex,ey);ctx.stroke();});
  ctx.fillStyle='#9e4e28';ctx.beginPath();ctx.moveTo(46,-44);ctx.lineTo(42,-54);ctx.lineTo(50,-50);ctx.closePath();ctx.fill();
  ctx.fillStyle='#be6e48';ctx.beginPath();ctx.moveTo(46,-44);ctx.lineTo(43,-52);ctx.lineTo(49,-49);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#6e3818';ctx.lineWidth=6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(15,12);ctx.lineTo(15+legF1*0.5,12+18);ctx.lineTo(15+legF1,12+20+Math.abs(legF1)*0.25);ctx.stroke();
  ctx.fillStyle='#1a0a00';ctx.beginPath();ctx.ellipse(15+legF1,12+20+Math.abs(legF1)*0.25,5.5,2.5,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(22,10);ctx.lineTo(22+legF2*0.5,10+18);ctx.lineTo(22+legF2,10+20+Math.abs(legF2)*0.25);ctx.stroke();
  ctx.fillStyle='#1a0a00';ctx.beginPath();ctx.ellipse(22+legF2,10+20+Math.abs(legF2)*0.25,5.5,2.5,0,0,Math.PI*2);ctx.fill();
  const vg=ctx.createLinearGradient(-10,-46,-10,-24);vg.addColorStop(0,'#8a6912');vg.addColorStop(1,'#6a4e10');
  ctx.fillStyle=vg;ctx.strokeStyle='#4a3008';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-14,-46,24,22,3);ctx.fill();ctx.stroke();
  ctx.fillStyle='#a07820';ctx.beginPath();ctx.moveTo(-4,-46);ctx.lineTo(-8,-32);ctx.lineTo(-2,-32);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(4,-46);ctx.lineTo(8,-32);ctx.lineTo(2,-32);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFD700';ctx.strokeStyle='#aa8800';ctx.lineWidth=1;ctx.fillRect(-5,-28,10,6);ctx.strokeRect(-5,-28,10,6);
  ctx.fillStyle='#aa8800';ctx.fillRect(-2,-27,4,4);
  ctx.strokeStyle='#8a6912';ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-12,-40);ctx.lineTo(-30,-48);ctx.stroke();
  ctx.beginPath();ctx.moveTo(8,-38);ctx.lineTo(22,-30);ctx.stroke();
  ctx.save();ctx.translate(-30,-48);ctx.rotate(-0.35);
  ctx.fillStyle='#282828';ctx.strokeStyle='#111';ctx.lineWidth=1;
  ctx.fillRect(-14,-5,20,6);ctx.strokeRect(-14,-5,20,6);
  ctx.fillStyle='#3a3a3a';ctx.beginPath();ctx.arc(0,-2,5,0,Math.PI*2);ctx.fill();ctx.stroke();
  for(let ci=0;ci<6;ci++){const ca=(ci/6)*Math.PI*2;ctx.fillStyle='#111';ctx.beginPath();ctx.arc(Math.cos(ca)*3,Math.sin(ca)*3-2,1,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#4a2c08';ctx.strokeStyle='#2a1404';ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(-3,0,8,12,2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='#3a2008';ctx.lineWidth=0.8;for(let gi=1;gi<5;gi++){ctx.beginPath();ctx.moveTo(-2,gi*2.2);ctx.lineTo(4,gi*2.2);ctx.stroke();}
  ctx.fillStyle='#555';ctx.beginPath();ctx.arc(-2,-6,3,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#666';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(2,0);ctx.lineTo(4,6);ctx.stroke();
  ctx.restore();
  ctx.fillStyle='#f4c88a';ctx.strokeStyle='#d4a060';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(-2,-54,10,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(70,40,15,0.18)';ctx.beginPath();ctx.arc(-2,-50,8,0,Math.PI);ctx.fill();
  ctx.fillStyle='#222';ctx.beginPath();ctx.arc(-6,-57,2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(2,-57,2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#5a3010';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-9,-59);ctx.lineTo(-3,-58);ctx.stroke();ctx.beginPath();ctx.moveTo(-1,-59);ctx.lineTo(5,-58);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-4,-52);ctx.quadraticCurveTo(0,-50,4,-52);ctx.stroke();
  ctx.fillStyle='#281200';ctx.strokeStyle='#180c00';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(-2,-65,23,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#281200';ctx.beginPath();ctx.moveTo(-16,-65);ctx.lineTo(-14,-90);ctx.quadraticCurveTo(-2,-95,14,-90);ctx.lineTo(16,-65);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#180c00';ctx.beginPath();ctx.moveTo(-6,-90);ctx.quadraticCurveTo(-2,-94,6,-90);ctx.lineTo(4,-88);ctx.quadraticCurveTo(-2,-91,-4,-88);ctx.closePath();ctx.fill();
  ctx.fillStyle='#8B0000';ctx.strokeStyle='#600000';ctx.lineWidth=1;ctx.fillRect(-15,-71,30,5);ctx.strokeRect(-15,-71,30,5);
  ctx.fillStyle='rgba(255,255,255,0.07)';ctx.beginPath();ctx.moveTo(-12,-68);ctx.lineTo(-10,-88);ctx.lineTo(-4,-88);ctx.lineTo(-6,-68);ctx.closePath();ctx.fill();
  ctx.restore(); // bodyBob
  ctx.restore();
}

function drawYeti(cx, cy, frm, alpha) {
  const ctx = S.ctx;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy);
  const bob=Math.sin(frm*0.18), stride=Math.sin(frm*0.22);
  ctx.fillStyle='#a8c8e0';ctx.strokeStyle='#7aa0c0';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(-14+stride*5,42+bob*2,13,6,0.15,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(14-stride*5,42-bob*2,13,6,-0.15,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#d8f0ff';
  [-22+stride*5,-15+stride*5,-8+stride*5].forEach(tx=>{ctx.beginPath();ctx.moveTo(tx,36+bob*2);ctx.lineTo(tx-2,29+bob*2);ctx.lineTo(tx+3,36+bob*2);ctx.closePath();ctx.fill();});
  [8-stride*5,15-stride*5,22-stride*5].forEach(tx=>{ctx.beginPath();ctx.moveTo(tx,36-bob*2);ctx.lineTo(tx-2,29-bob*2);ctx.lineTo(tx+3,36-bob*2);ctx.closePath();ctx.fill();});
  ctx.fillStyle='#c0dcee';ctx.strokeStyle='#98b8d0';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-12,24+bob*4,10,16,stride*0.15,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(12,24-bob*4,10,16,-stride*0.15,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#b0cce4';ctx.beginPath();ctx.arc(-12+stride*3,16+bob*3,6,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(12-stride*3,16-bob*3,6,0,Math.PI*2);ctx.fill();
  const bGrad=ctx.createRadialGradient(-5,0,8,-5,0,30);bGrad.addColorStop(0,'#e8f4ff');bGrad.addColorStop(0.6,'#c8ddf0');bGrad.addColorStop(1,'#a8c0dc');
  ctx.fillStyle=bGrad;ctx.strokeStyle='#88aacb';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,4,28,30,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(160,190,220,0.65)';ctx.lineWidth=1.5;ctx.lineCap='round';
  [[-18,-8],[-13,4],[-9,-12],[-5,9],[0,-4],[5,12],[10,-8],[15,4],[18,-10],[20,2],[-16,14],[-8,18],[4,16],[14,14],[-20,4]].forEach(([fx,fy])=>{ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx+1,fy+7);ctx.stroke();});
  ctx.fillStyle='rgba(235,250,255,0.55)';ctx.beginPath();ctx.ellipse(0,8,13,18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#c0dcee';ctx.strokeStyle='#98b8d0';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-26,-10+bob*3);ctx.quadraticCurveTo(-46,-18+bob*6,-44,-6+bob*4);ctx.quadraticCurveTo(-40,6+bob*2,-28,4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#d8f0ff';
  [[-50,-4],[-44,2],[-38,-2]].forEach(([hx,hy])=>{ctx.beginPath();ctx.moveTo(hx,hy+bob*4);ctx.lineTo(hx-3,hy-7+bob*4);ctx.lineTo(hx+4,hy-2+bob*4);ctx.closePath();ctx.fill();ctx.strokeStyle='#7aa0c0';ctx.lineWidth=1;ctx.stroke();});
  ctx.fillStyle='#c0dcee';ctx.strokeStyle='#98b8d0';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(26,-10-bob*3);ctx.quadraticCurveTo(46,-18-bob*6,44,-6-bob*4);ctx.quadraticCurveTo(40,6-bob*2,28,4);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#d8f0ff';
  [[50,-4],[44,2],[38,-2]].forEach(([hx,hy])=>{ctx.beginPath();ctx.moveTo(hx,hy-bob*4);ctx.lineTo(hx+3,hy-7-bob*4);ctx.lineTo(hx-4,hy-2-bob*4);ctx.closePath();ctx.fill();ctx.strokeStyle='#7aa0c0';ctx.lineWidth=1;ctx.stroke();});
  const hGrad=ctx.createRadialGradient(-4,-26,6,-4,-26,26);hGrad.addColorStop(0,'#f0f8ff');hGrad.addColorStop(0.7,'#c8ddf0');hGrad.addColorStop(1,'#a8c0dc');
  ctx.fillStyle=hGrad;ctx.strokeStyle='#88aacb';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,-24,26,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(165,192,220,0.8)';ctx.lineWidth=2;ctx.lineCap='round';
  [[-14,-44],[-8,-50],[0,-52],[8,-50],[14,-46],[-18,-38],[18,-38]].forEach(([fx,fy])=>{ctx.beginPath();ctx.moveTo(fx,fy+4);ctx.lineTo(fx,fy);ctx.stroke();});
  ctx.fillStyle='#c0dcee';ctx.strokeStyle='#98b8d0';ctx.lineWidth=2;
  ctx.beginPath();ctx.ellipse(-23,-28,8,10,-0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.ellipse(23,-28,8,10,0.3,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#ffaaaa';ctx.beginPath();ctx.ellipse(-23,-28,5,7,-0.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(23,-28,5,7,0.3,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#a8c0dc';ctx.beginPath();ctx.moveTo(-22,-38);ctx.quadraticCurveTo(-10,-44,0,-42);ctx.quadraticCurveTo(10,-44,22,-38);ctx.quadraticCurveTo(10,-36,0,-34);ctx.quadraticCurveTo(-10,-36,-22,-38);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#5a80a8';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-22,-38);ctx.lineTo(-8,-36);ctx.stroke();ctx.beginPath();ctx.moveTo(22,-38);ctx.lineTo(8,-36);ctx.stroke();
  ctx.fillStyle='rgba(255,180,0,0.32)';ctx.beginPath();ctx.arc(-10,-30,12,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(10,-30,12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fffde8';ctx.beginPath();ctx.ellipse(-10,-30,9,8,0.1,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(10,-30,9,8,-0.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(-10,-30,5.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(10,-30,5.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.ellipse(-10,-30,2,5,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(10,-30,2,5,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-12,-32,1.8,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(8,-32,1.8,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ff8888';ctx.strokeStyle='#cc4444';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,-22,6,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,0.4)';ctx.beginPath();ctx.arc(-2,-24,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8a2020';ctx.beginPath();ctx.moveTo(-16,-14);ctx.quadraticCurveTo(0,-6,16,-14);ctx.quadraticCurveTo(10,-10,0,-8);ctx.quadraticCurveTo(-10,-10,-16,-14);ctx.closePath();ctx.fill();
  ctx.fillStyle='#fffff0';ctx.strokeStyle='#ccc';ctx.lineWidth=1;
  [[-10,-14],[-4,-14],[4,-14],[10,-14]].forEach(([tx2,ty2])=>{ctx.beginPath();ctx.moveTo(tx2,ty2);ctx.lineTo(tx2-2,ty2+8);ctx.lineTo(tx2+2,ty2+8);ctx.closePath();ctx.fill();ctx.stroke();});
  ctx.fillStyle='#ff6080';ctx.beginPath();ctx.ellipse(0,-8,7,4,0,0,Math.PI*2);ctx.fill();
  [[-22,-6],[22,-6]].forEach(([ix,iy])=>{
    ctx.strokeStyle='rgba(180,230,255,0.8)';ctx.lineWidth=1.5;
    for(let ii=0;ii<6;ii++){const ia=(ii/6)*Math.PI*2;ctx.beginPath();ctx.moveTo(ix,iy);ctx.lineTo(ix+Math.cos(ia)*10,iy+Math.sin(ia)*10);ctx.stroke();}
    ctx.fillStyle='rgba(200,240,255,0.5)';ctx.beginPath();ctx.arc(ix,iy,3,0,Math.PI*2);ctx.fill();
  });
  ctx.restore();
}
