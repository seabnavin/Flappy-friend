// ============================================================
// draw/effects.js — particles, poop, death animations, win
// ============================================================

import { S } from '../state.js';
import { WIN_RETURN_BTN } from '../state.js';

export function drawPoop(p) {
  const ctx = S.ctx;
  ctx.fillStyle = '#7b4f2e'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3620'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, p.r * 0.5, 0, Math.PI * 2); ctx.fill();
}

export function drawParticles() {
  const ctx = S.ctx;
  S.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}

export function drawGrowingPoopBall(bx, by, scale) {
  const ctx      = S.ctx;
  const progress = (scale - 1) / 4.5;
  ctx.save(); ctx.translate(bx, by); ctx.scale(scale, scale);
  if (scale > 1.8) { ctx.shadowColor = 'rgba(60,20,0,0.55)'; ctx.shadowBlur = 18; }
  const cr = Math.floor(200 - progress * 110), cg = Math.floor(150 - progress * 110), cb = Math.floor(50 - progress * 35);
  ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = `rgb(${Math.floor(cr*0.6)},${Math.floor(cg*0.5)},${Math.floor(cb*0.4)})`;
  ctx.lineWidth = 2 / scale; ctx.stroke();
  if (S.photoImg) {
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - progress * 1.6);
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.clip();
    ctx.drawImage(S.photoImg, -21, -21, 42, 42); ctx.restore();
  } else {
    const eyeR = 5 + progress * 2.5;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, -5, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(9, -5, eyeR * 0.55, 0, Math.PI * 2); ctx.fill();
    if (progress < 0.45) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5 / scale; ctx.beginPath(); ctx.arc(2, 5, 7, 0, Math.PI); ctx.stroke(); }
    else { ctx.fillStyle = '#c03000'; ctx.beginPath(); ctx.ellipse(2, 6, 7, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff9090'; ctx.beginPath(); ctx.ellipse(2, 7, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  if (progress > 0.4) {
    const sa = (progress - 0.4) / 0.6;
    ctx.save(); ctx.globalAlpha = sa; ctx.strokeStyle = '#4a2a08'; ctx.lineWidth = 2.5 / scale;
    ctx.beginPath(); ctx.arc(0, -5, 10, Math.PI, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(3, -10, 6, Math.PI, Math.PI * 2.1); ctx.stroke(); ctx.restore();
  }
  if (progress > 0.7) {
    const la = (progress - 0.7) / 0.3;
    ctx.strokeStyle = `rgba(160,60,0,${la * 0.65})`; ctx.lineWidth = 1.5 / scale;
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*26, Math.sin(a)*26); ctx.lineTo(Math.cos(a)*35, Math.sin(a)*35); ctx.stroke(); }
  }
  ctx.shadowBlur = 0; ctx.restore();
}

export function drawPoopyAlert(timer) {
  const ctx = S.ctx, canvas = S.canvas;
  ctx.fillStyle = `rgba(70,10,0,${Math.min(timer / 20, 0.35)})`; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const alertWords = [
    { text: 'POOPY ALERT!', x: canvas.width/2, y: canvas.height/2-35, size: 52, color: '#FF3300', outline: '#fff', delay: 3 },
    { text: 'Oh...', x: 72, y: 145, size: 34, color: '#CC2200', outline: 'rgba(255,255,255,0.8)', delay: 10 },
    { text: 'NO NO NO!', x: canvas.width-78, y: 175, size: 28, color: '#AA1100', outline: 'rgba(255,255,255,0.8)', delay: 16 },
    { text: "It's time!", x: canvas.width/2, y: canvas.height/2+58, size: 30, color: '#CC2200', outline: 'rgba(255,255,255,0.8)', delay: 22 },
    { text: '!!!!', x: 48, y: canvas.height/2+15, size: 42, color: '#EE2200', outline: 'rgba(255,255,255,0.8)', delay: 12 },
    { text: 'RUN!!!', x: canvas.width-55, y: canvas.height/2-55, size: 34, color: '#BB1100', outline: 'rgba(255,255,255,0.8)', delay: 28 },
    { text: '💩💩💩', x: canvas.width/2, y: canvas.height/2+108, size: 28, color: '#7b4f2e', outline: 'transparent', delay: 40 },
  ];
  alertWords.forEach(w => {
    const elapsed = timer - w.delay; if (elapsed <= 0) return;
    const sc = elapsed < 10 ? (2.5 - elapsed * 0.15) : (1 + Math.sin(elapsed * 0.25 + w.delay) * 0.05);
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(sc, sc);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${w.size}px Arial`;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12;
    if (w.outline !== 'transparent') { ctx.strokeStyle = w.outline; ctx.lineWidth = 5; ctx.strokeText(w.text, 0, 0); }
    ctx.fillStyle = w.color; ctx.fillText(w.text, 0, 0); ctx.restore();
  });
}

export function drawPoopSlide(slideY) {
  const ctx = S.ctx, canvas = S.canvas, frame = S.frame;
  ctx.save();
  ctx.fillStyle = '#7b4f2e'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, slideY);
  for (let wx = canvas.width; wx >= 0; wx -= 6) { const wave = Math.sin(wx*0.07+frame*0.18)*16+Math.sin(wx*0.15+frame*0.09)*8+12; ctx.lineTo(wx, slideY+wave); }
  ctx.lineTo(0, slideY); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(160,100,40,0.35)'; ctx.beginPath(); ctx.moveTo(canvas.width*0.08, 0); ctx.lineTo(canvas.width*0.28, 0); ctx.lineTo(canvas.width*0.28, slideY);
  for (let wx = canvas.width*0.28; wx >= canvas.width*0.08; wx -= 6) { const wave = Math.sin(wx*0.07+frame*0.18)*16+Math.sin(wx*0.15+frame*0.09)*8+12; ctx.lineTo(wx, slideY+wave); }
  ctx.lineTo(canvas.width*0.08, slideY); ctx.closePath(); ctx.fill();
  const dripXs = [25,80,145,215,290,365,435,505,575,640,695,718];
  dripXs.forEach((dx, i) => {
    const dripExtra = 28+(i%4)*20+Math.sin(frame*0.12+i*1.4)*10, dripW = 5+(i%3)*3, tipY = slideY+dripExtra;
    ctx.fillStyle = '#6a4020'; ctx.beginPath(); ctx.roundRect(dx-dripW*0.5, slideY, dripW, dripExtra, dripW*0.5); ctx.fill();
    ctx.fillStyle = '#7b4f2e'; ctx.beginPath(); ctx.arc(dx, tipY, dripW*1.1, 0, Math.PI*2); ctx.fill();
  });
  if (slideY > canvas.height * 0.35) {
    const emojiAlpha = Math.min(1, (slideY - canvas.height*0.35) / (canvas.height*0.25));
    ctx.globalAlpha = emojiAlpha; ctx.font = 'bold 90px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💩', canvas.width/2, Math.min(slideY*0.5, canvas.height*0.4)); ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export function drawDizzyEffect(bx, by, timer) {
  const ctx       = S.ctx;
  const intensity = Math.min(1, timer / 60);
  const ringCx    = bx + 14, ringY = by - 54;
  ctx.save();
  ctx.strokeStyle = `rgba(200,140,255,${0.22 + intensity * 0.18})`; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.ellipse(ringCx, ringY, 28+intensity*6, 9+intensity*2, 0, 0, Math.PI*2); ctx.stroke();
  ctx.strokeStyle = `rgba(170,80,255,${0.75 + intensity * 0.22})`; ctx.lineWidth = 3.5;
  ctx.setLineDash([9, 6]); ctx.lineDashOffset = -timer * 1.5;
  ctx.beginPath(); ctx.ellipse(ringCx, ringY, 26+intensity*5, 8+intensity*2, 0, 0, Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  const numStars = 3 + Math.floor(intensity * 2);
  for (let si = 0; si < numStars; si++) {
    const starAngle = (si / numStars) * Math.PI * 2 + timer * 0.10;
    const orbitR    = 40 + intensity * 12;
    const starX = ringCx + Math.cos(starAngle) * orbitR, starY = ringY + 12 + Math.sin(starAngle) * (orbitR * 0.38);
    const sz = 7 + intensity * 4;
    ctx.save(); ctx.translate(starX, starY); ctx.rotate(starAngle * 2.5);
    ctx.fillStyle = `rgba(255,240,0,${0.25 + intensity * 0.2})`; ctx.beginPath(); ctx.arc(0, 0, sz+4, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = `rgba(255,220,0,${0.7 + intensity * 0.3})`; ctx.strokeStyle = `rgba(200,130,0,0.9)`; ctx.lineWidth = 1;
    ctx.beginPath();
    for(let sp=0;sp<5;sp++){const a=(sp/5)*Math.PI*2-Math.PI/2,ia=a+Math.PI/5; sp===0?ctx.moveTo(Math.cos(a)*sz,Math.sin(a)*sz):ctx.lineTo(Math.cos(a)*sz,Math.sin(a)*sz); ctx.lineTo(Math.cos(ia)*sz*0.42,Math.sin(ia)*sz*0.42);}
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(-sz*0.22,-sz*0.22,sz*0.22,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if (intensity > 0.3) {
    const lineAlpha = (intensity - 0.3) / 0.7;
    ctx.strokeStyle = `rgba(160,50,255,${lineAlpha * 0.55})`; ctx.lineWidth = 2;
    for(let li=0;li<3;li++){const la=timer*0.13+li*(Math.PI*2/3); ctx.beginPath(); ctx.arc(ringCx,ringY,18+intensity*14,la,la+Math.PI*0.65); ctx.stroke();}
  }
  ctx.restore();
}

export function drawEagleAttack(e) {
  const ctx = S.ctx, frame = S.frame;
  const scale = 2.0, facingRight = e.phase === 'escape';
  const wb = Math.sin(frame * 0.14) * 0.42;
  ctx.save(); ctx.translate(e.x, e.y);
  if (!facingRight) ctx.scale(-1, 1);
  ctx.scale(scale, scale);
  ctx.fillStyle='#2e1a08'; ctx.beginPath();ctx.moveTo(-2,-3);ctx.quadraticCurveTo(-22,-24+wb*20,-50,-20+wb*15);ctx.quadraticCurveTo(-34,-8+wb*6,-2,3);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#1a0e04';ctx.lineWidth=1.2;ctx.lineCap='round';
  for(let fi=0;fi<5;fi++){const ft=fi/4;ctx.beginPath();ctx.moveTo(-38-ft*10,-20+wb*15+ft*2);ctx.lineTo(-41-ft*10,-28+wb*15+ft*5);ctx.stroke();}
  ctx.fillStyle='#2e1a08';ctx.beginPath();ctx.moveTo(2,-3);ctx.quadraticCurveTo(22,-24+wb*20,50,-20+wb*15);ctx.quadraticCurveTo(34,-8+wb*6,2,3);ctx.closePath();ctx.fill();
  for(let fi=0;fi<5;fi++){const ft=fi/4;ctx.beginPath();ctx.moveTo(38+ft*10,-20+wb*15+ft*2);ctx.lineTo(41+ft*10,-28+wb*15+ft*5);ctx.stroke();}
  ctx.fillStyle='#3a2010';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();
  if(e.phase==='approach'){ctx.strokeStyle='#5a3010';ctx.lineWidth=2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(2,5);ctx.lineTo(-3,18);ctx.lineTo(-7,24);ctx.stroke();ctx.beginPath();ctx.moveTo(5,6);ctx.lineTo(4,19);ctx.lineTo(4,25);ctx.stroke();ctx.beginPath();ctx.moveTo(8,5);ctx.lineTo(13,18);ctx.lineTo(17,24);ctx.stroke();}
  ctx.fillStyle='#f0f0f0';ctx.beginPath();ctx.arc(13,-2,7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e8b000';ctx.strokeStyle='#c08000';ctx.lineWidth=1;
  if(e.phase==='grab'||e.phase==='escape'){ctx.beginPath();ctx.moveTo(18,-5);ctx.lineTo(30,-1);ctx.lineTo(18,-1);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#c08000';ctx.beginPath();ctx.moveTo(18,2);ctx.lineTo(28,6);ctx.lineTo(18,5);ctx.closePath();ctx.fill();ctx.stroke();}
  else{ctx.beginPath();ctx.moveTo(19,-2);ctx.lineTo(27,1);ctx.lineTo(19,3);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.fillStyle='#ffcc00';ctx.beginPath();ctx.arc(16,-4,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(16,-4,1.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(16.8,-4.8,0.7,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e0e0e0';ctx.beginPath();ctx.moveTo(-12,-1);ctx.lineTo(-26,-5);ctx.lineTo(-24,6);ctx.lineTo(-12,2);ctx.closePath();ctx.fill();ctx.strokeStyle='#aaa';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(-26,0);ctx.stroke();
  ctx.restore();
  if(e.phase==='grab'||e.phase==='escape'){const flipSign=facingRight?1:-1,beakTipX=e.x+flipSign*30*scale,beakTipY=e.y+3*scale;ctx.save();ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍗',beakTipX,beakTipY);ctx.restore();}
}

export function drawMarioBasket(mb) {
  const ctx = S.ctx, canvas = S.canvas;
  const groundY = canvas.height - 60, frm = mb.timer;
  const walkingRight = (mb.phase === 'walk_out');
  const isPicking = (mb.phase === 'pickup');
  const pickProgress = isPicking ? Math.min(1, frm / 30) : 0;
  const runCycle = isPicking ? 0 : Math.sin(frm * 0.28);
  const bob = isPicking ? 0 : Math.abs(Math.sin(frm * 0.28)) * 4;
  const bendY = pickProgress * 14;
  ctx.save(); ctx.translate(mb.x, groundY - 2);
  if (walkingRight) ctx.scale(-1, 1);
  ctx.translate(0, -bob);
  const lLegX = -5+runCycle*10, rLegX = 5-runCycle*10;
  ctx.fillStyle='#1a0800'; ctx.beginPath();ctx.ellipse(lLegX,2,10,5,0.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(rLegX,2,10,5,-0.2,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#1030c8';ctx.lineWidth=9;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-5,-4+bendY);ctx.lineTo(lLegX,2);ctx.stroke();ctx.beginPath();ctx.moveTo(5,-4+bendY);ctx.lineTo(rLegX,2);ctx.stroke();
  ctx.fillStyle='#e8e8e8';ctx.beginPath();ctx.roundRect(-12,-36+bendY,24,14,3);ctx.fill();
  ctx.fillStyle='#1030c8';ctx.strokeStyle='#0018a0';ctx.lineWidth=1.2;ctx.beginPath();ctx.roundRect(-13,-38+bendY,26,22,3);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.roundRect(-8,-44+bendY,16,10,2);ctx.fill();ctx.stroke();
  ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(-4,-40+bendY,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(4,-40+bendY,2.5,0,Math.PI*2);ctx.fill();
  const armLen=18,basketArmAngle=isPicking?0.7+pickProgress*0.5:0.55;
  const aEndX=-13+Math.cos(Math.PI-basketArmAngle)*armLen,aEndY=-36+bendY+Math.sin(Math.PI-basketArmAngle)*armLen;
  ctx.strokeStyle='#e8a860';ctx.lineWidth=8;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-13,-36+bendY);ctx.lineTo(aEndX,aEndY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(13,-36+bendY);ctx.lineTo(13+runCycle*9,-36+bendY+14);ctx.stroke();
  ctx.fillStyle='#f0b870';ctx.beginPath();ctx.arc(0,-52+bendY*0.5,14,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a200a';ctx.beginPath();ctx.arc(-10,-57+bendY*0.5,6,Math.PI*0.6,Math.PI*1.8);ctx.fill();ctx.beginPath();ctx.arc(10,-57+bendY*0.5,6,Math.PI*1.2,Math.PI*2.4);ctx.fill();
  ctx.fillStyle='#111';ctx.beginPath();ctx.arc(-5,-54+bendY*0.5,2.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(5,-54+bendY*0.5,2.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#e09060';ctx.beginPath();ctx.arc(0,-50+bendY*0.5,3.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a200a';ctx.beginPath();ctx.ellipse(-5,-47+bendY*0.5,7,5,-0.15,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,-47+bendY*0.5,7,5,0.15,0,Math.PI*2);ctx.fill();
  const hy=-66+bendY*0.4;
  ctx.fillStyle='#cc1010';ctx.strokeStyle='#880808';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(0,hy,18,6,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-14,hy);ctx.lineTo(-12,hy-18);ctx.quadraticCurveTo(0,hy-22,12,hy-18);ctx.lineTo(14,hy);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('M',0,hy-10);ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.save();ctx.translate(aEndX-2,aEndY-4);
  ctx.fillStyle='#c88830';ctx.strokeStyle='#7a4e10';ctx.lineWidth=1.5;ctx.beginPath();ctx.roundRect(-13,-2,26,20,4);ctx.fill();ctx.stroke();
  ctx.strokeStyle='rgba(90,50,10,0.5)';ctx.lineWidth=0.8;for(let wy=2;wy<=16;wy+=5){ctx.beginPath();ctx.moveTo(-13,wy);ctx.lineTo(13,wy);ctx.stroke();}for(let wx=-9;wx<=9;wx+=5){ctx.beginPath();ctx.moveTo(wx,-2);ctx.lineTo(wx,18);ctx.stroke();}
  ctx.strokeStyle='#7a4e10';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,-2,11,Math.PI,0);ctx.stroke();
  const chickenVisible=(mb.phase==='pickup'&&mb.timer>=25)||mb.phase==='walk_out';
  if(chickenVisible){ctx.font='14px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍗',0,8);ctx.textAlign='left';ctx.textBaseline='alphabetic';}
  ctx.restore();ctx.restore();
}

export function drawIceFreezeChicken(bx, by, progress) {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(bx, by);
  ctx.font='64px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🍗',0,0);
  if(progress>0){
    const halfH=34,frozenH=halfH*2*progress,iceTopY=halfH-frozenH;
    ctx.save();ctx.beginPath();ctx.rect(-36,iceTopY,72,frozenH+4);ctx.clip();
    const iceGrad=ctx.createLinearGradient(0,halfH,0,iceTopY);iceGrad.addColorStop(0,'rgba(70,155,255,0.93)');iceGrad.addColorStop(0.45,'rgba(155,215,255,0.88)');iceGrad.addColorStop(1,'rgba(220,245,255,0.80)');
    ctx.fillStyle=iceGrad;ctx.fillRect(-36,iceTopY,72,frozenH+4);
    ctx.fillStyle='rgba(255,255,255,0.32)';ctx.beginPath();ctx.ellipse(-9,iceTopY+frozenH*0.35,9,Math.max(2,frozenH*0.22),-0.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(180,225,255,0.8)';ctx.lineWidth=1;
    [-24,-10,4,18].forEach(cx2=>{ctx.beginPath();ctx.moveTo(cx2,iceTopY+frozenH*0.1);ctx.lineTo(cx2+5,iceTopY+frozenH*0.38);ctx.lineTo(cx2+1,iceTopY+frozenH*0.65);ctx.stroke();});
    ctx.restore();
    if(progress<1){ctx.strokeStyle='rgba(120,205,255,0.95)';ctx.lineWidth=3;ctx.setLineDash([5,3]);ctx.beginPath();ctx.moveTo(-34,iceTopY);ctx.lineTo(34,iceTopY);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='rgba(200,238,255,0.92)';for(let ix=-26;ix<=26;ix+=10){ctx.beginPath();ctx.moveTo(ix-3,iceTopY);ctx.lineTo(ix,iceTopY-9);ctx.lineTo(ix+3,iceTopY);ctx.closePath();ctx.fill();}}
    if(progress>=1){const capGrad=ctx.createLinearGradient(-36,0,36,0);capGrad.addColorStop(0,'rgba(70,148,240,0.88)');capGrad.addColorStop(0.3,'rgba(185,232,255,0.92)');capGrad.addColorStop(0.7,'rgba(135,200,255,0.88)');capGrad.addColorStop(1,'rgba(60,138,228,0.86)');
      ctx.fillStyle=capGrad;ctx.beginPath();ctx.roundRect(-35,-halfH,70,halfH*2,5);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.36)';ctx.beginPath();ctx.ellipse(-8,-halfH+10,14,8,-0.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(100,185,255,0.7)';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-35,-halfH,70,halfH*2,5);ctx.stroke();}
  }
  ctx.restore();
}

// ---- Win celebration ----
export function drawCrown(x, y) {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(x, y);
  ctx.shadowColor='#FFD700'; ctx.shadowBlur=18+Math.sin(S.danceFrame*0.1)*5;
  const cw=38,ch=24;
  ctx.fillStyle='#FFD700';ctx.strokeStyle='#B8860B';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(-cw,ch/2);ctx.lineTo(-cw,-ch*0.3);ctx.lineTo(-cw/2,-ch);ctx.lineTo(-cw/6,-ch*0.2);ctx.lineTo(0,-ch*1.4);ctx.lineTo(cw/6,-ch*0.2);ctx.lineTo(cw/2,-ch);ctx.lineTo(cw,-ch*0.3);ctx.lineTo(cw,ch/2);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;
  [[-cw/2,2,'#E8192C'],[0,-ch*0.45,'#2F52E0'],[cw/2,2,'#1A9E45']].forEach(([gx,gy,gc])=>{ctx.fillStyle=gc;ctx.beginPath();ctx.arc(gx,gy,4.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,0.55)';ctx.beginPath();ctx.arc(gx-1.5,gy-1.5,1.5,0,Math.PI*2);ctx.fill();});
  ctx.restore();
}

export function drawAngel(x, y, flip) {
  const ctx = S.ctx;
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1);
  ctx.save();ctx.strokeStyle='#FFD700';ctx.lineWidth=2.5;ctx.shadowColor='#FFD700';ctx.shadowBlur=8;ctx.beginPath();ctx.ellipse(0,-34,15,5,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.fillStyle='rgba(255,255,255,0.88)';ctx.beginPath();ctx.moveTo(-4,-4);ctx.bezierCurveTo(-22,-20,-42,-6,-30,14);ctx.bezierCurveTo(-18,26,-6,14,-4,-4);ctx.fill();ctx.strokeStyle='rgba(200,220,255,0.5)';ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle='#f8f8ff';ctx.beginPath();ctx.ellipse(0,8,8,15,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffe0c0';ctx.beginPath();ctx.arc(0,-14,10,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffd700';ctx.beginPath();ctx.arc(0,-18,9,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#333';ctx.beginPath();ctx.arc(-3,-14,1.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(3,-14,1.5,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#cc7755';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,-10,3,0,Math.PI);ctx.stroke();
  ctx.restore();
}

export function drawWinReturnBtn() {
  const ctx = S.ctx, b = WIN_RETURN_BTN, frame = S.frame;
  const pulse = 1 + Math.sin(frame * 0.09) * 0.03;
  ctx.save(); ctx.translate(b.x+b.w/2, b.y+b.h/2); ctx.scale(pulse, pulse);
  const bx=-b.w/2, by=-b.h/2;
  ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
  const grad=ctx.createLinearGradient(bx,by,bx,by+b.h);grad.addColorStop(0,'#FFE840');grad.addColorStop(1,'#FFA500');
  ctx.fillStyle=grad;ctx.beginPath();ctx.roundRect(bx,by,b.w,b.h,14);ctx.fill();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle='#cc8800';ctx.lineWidth=3;ctx.beginPath();ctx.roundRect(bx,by,b.w,b.h,14);ctx.stroke();
  ctx.fillStyle='#111';ctx.font='bold 20px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('🏆  Return to Menu',0,0);ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.restore();
}

// ---- Power-up draw functions ----
export function drawMarioCubes() {
  const ctx = S.ctx;
  const CUBE_SIZE = 36;
  S.marioCubes.forEach(cube => {
    const s = CUBE_SIZE;
    let cy = cube.y;
    if (cube.hit && cube.hitAnim < 45) cy = cube.y - Math.sin((cube.hitAnim/45)*Math.PI)*11;
    ctx.fillStyle='rgba(0,0,0,0.18)';ctx.fillRect(cube.x+3,cy+4,s,s);
    ctx.fillStyle=cube.hit?'#a0844a':'#e09000';ctx.strokeStyle=cube.hit?'#6a5028':'#8B5E00';ctx.lineWidth=2;
    ctx.fillRect(cube.x,cy,s,s);ctx.strokeRect(cube.x,cy,s,s);
    ctx.fillStyle=cube.hit?'#c0a060':'#FFDD44';ctx.fillRect(cube.x+2,cy+2,s-4,4);ctx.fillRect(cube.x+2,cy+2,4,s-4);
    ctx.fillStyle=cube.hit?'#6a5028':'#7a4e00';ctx.fillRect(cube.x+s-5,cy+5,3,s-7);ctx.fillRect(cube.x+5,cy+s-5,s-7,3);
    if(!cube.hit){ctx.fillStyle='#fff';ctx.font='bold 23px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=3;ctx.fillText('?',cube.x+s/2,cy+s/2+1);ctx.shadowBlur=0;ctx.textAlign='left';ctx.textBaseline='alphabetic';}
    else{ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(cube.x+s/2,cy+s/2,5,0,Math.PI*2);ctx.fill();
      if(cube.hitAnim<22){for(let si=0;si<5;si++){const sa=(si/5)*Math.PI*2+cube.hitAnim*0.18,sd=cube.hitAnim*1.4;ctx.globalAlpha=1-cube.hitAnim/22;ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(cube.x+s/2+Math.cos(sa)*sd,cy+s/2+Math.sin(sa)*sd,4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}}
  });
}

export function drawRainEffect() {
  const ctx = S.ctx, canvas = S.canvas;
  if (!S.activePowerup || S.activePowerup.type !== 'rain_wind') return;
  const fade = Math.min(S.activePowerup.timer / 80, 1);
  ctx.save();ctx.fillStyle=`rgba(0,10,30,${0.18*fade})`;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle=`rgba(160,210,255,${0.65*fade})`;ctx.lineWidth=1.4;
  const wo=Math.sin(S.windPhase*0.018)*0.28;
  S.rainDrops.forEach(d=>{ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+wo*d.len*2,d.y+d.len);ctx.stroke();});
  ctx.strokeStyle=`rgba(180,220,255,${0.12*fade})`;ctx.lineWidth=1;
  for(let gi=0;gi<6;gi++){const gy=60+gi*90+Math.sin(S.windPhase*0.03+gi)*20,gx=(S.windPhase*2.5+gi*130)%(canvas.width+80)-40;ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+55+gi*10,gy+3);ctx.stroke();}
  ctx.restore();
}

export function drawArrows() {
  const ctx = S.ctx;
  if (!S.activePowerup || S.activePowerup.type !== 'arrows') return;
  S.arrowProjectiles.forEach(a => {
    ctx.save();ctx.translate(a.x,a.y);ctx.rotate(Math.atan2(a.vy,-a.spd)+Math.PI);
    ctx.strokeStyle='#8B4513';ctx.lineWidth=3;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-30,0);ctx.stroke();
    ctx.fillStyle='#aaa';ctx.strokeStyle='#555';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-5,-5);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#cc4400';ctx.lineWidth=2;[[-22,-5],[-22,5],[-26,-5],[-26,5]].forEach(([fx,fy])=>{ctx.beginPath();ctx.moveTo(fx+4,0);ctx.lineTo(fx,fy);ctx.stroke();});
    ctx.restore();
  });
}

export function drawRocketProjectile() {
  const ctx = S.ctx;
  if (!S.rocketProjectile || !S.rocketProjectile.active) return;
  const {x, y, trail} = S.rocketProjectile;
  trail.forEach((t, i) => {
    const p=i/trail.length; ctx.globalAlpha=p*0.65; ctx.fillStyle=p>0.55?'#FF6600':'#FF2200';
    ctx.beginPath();ctx.arc(t.x-6,t.y,1+p*8,0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;
  ctx.save();ctx.translate(x,y);
  ctx.fillStyle='#cc0000';ctx.strokeStyle='#880000';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(7,-6);ctx.lineTo(7,6);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.fillStyle='#ddd';ctx.fillRect(-10,-5,17,10);ctx.strokeRect(-10,-5,17,10);
  ctx.fillStyle='#cc0000';ctx.fillRect(-2,-5,5,10);
  ctx.fillStyle='#FF8800';ctx.beginPath();ctx.moveTo(-10,-4);ctx.lineTo(-24,0);ctx.lineTo(-10,4);ctx.closePath();ctx.fill();
  ctx.fillStyle='#FFEE00';ctx.beginPath();ctx.moveTo(-10,-2);ctx.lineTo(-18,0);ctx.lineTo(-10,2);ctx.closePath();ctx.fill();
  ctx.restore();
}

export function drawRocketBoostFlame() {
  const ctx = S.ctx;
  if (!S.activePowerup || S.activePowerup.type !== 'rocket_boost' || !S.bird.alive) return;
  const fl = 38 + Math.random() * 22;
  ctx.save();ctx.translate(S.bird.x, S.bird.y);ctx.rotate(S.bird.angle);
  ctx.fillStyle='rgba(255,100,0,0.85)';ctx.beginPath();ctx.moveTo(-22,-9);ctx.lineTo(-22-fl,0);ctx.lineTo(-22,9);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,235,0,0.92)';ctx.beginPath();ctx.moveTo(-22,-5);ctx.lineTo(-22-fl*0.6,0);ctx.lineTo(-22,5);ctx.closePath();ctx.fill();
  ctx.restore();
}

export function drawPowerupBanner() {
  const ctx = S.ctx, canvas = S.canvas;
  if (S.activePowerup) {
    const maxT={moving_pipes:480,arrows:420,rain_wind:600,rocket_launcher:900,small_bird:480,rocket_boost:200};
    const prog=S.activePowerup.timer/(maxT[S.activePowerup.type]||480);
    const barW=210,barH=10,bx=canvas.width/2-barW/2,by=canvas.height-82;
    const isObs=['moving_pipes','arrows','rain_wind'].includes(S.activePowerup.type);
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.58)';ctx.fillRect(bx-6,by-22,barW+12,barH+32);
    ctx.fillStyle='rgba(255,255,255,0.14)';ctx.fillRect(bx,by,barW,barH);
    ctx.fillStyle=isObs?`hsl(${Math.floor(prog*18)},100%,50%)`:`hsl(${120-Math.floor((1-prog)*30)},95%,45%)`;
    ctx.fillRect(bx,by,barW*prog,barH);
    const labels={moving_pipes:'⚠️ Moving Pipes',arrows:'⚠️ Arrow Storm',rain_wind:'⚠️ Storm & Wind',rocket_launcher:'🚀 Launcher [S] ×'+S.rocketLauncherAmmo,small_bird:'🐤 Tiny Bird',rocket_boost:'🚀 BOOST!'};
    ctx.fillStyle='#fff';ctx.font='bold 12px Arial';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(labels[S.activePowerup.type]||'',canvas.width/2,by-5);ctx.restore();
  }
  if (S.powerupBanner && S.powerupBanner.timer > 0) {
    S.powerupBanner.timer--;
    const t=S.powerupBanner.timer,alpha=Math.min(t/25,1)*Math.min((320-t)/18+1,1);
    if(alpha<=0) return;
    const bw=390,bh=54,bx=canvas.width/2-bw/2,by=canvas.height/2-105;
    ctx.save();ctx.globalAlpha=alpha;
    ctx.fillStyle='rgba(0,0,0,0.72)';ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.fill();
    const banner_grad=ctx.createLinearGradient(bx,by,bx,by+bh);
    banner_grad.addColorStop(0,S.powerupBanner.isAdvantage?'rgba(0,100,0,0.6)':'rgba(120,0,0,0.6)');
    banner_grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=banner_grad;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.fill();
    ctx.strokeStyle=S.powerupBanner.color;ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,12);ctx.stroke();
    ctx.fillStyle=S.powerupBanner.color;ctx.font='bold 22px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=8;ctx.fillText(S.powerupBanner.text,canvas.width/2,by+bh/2);ctx.shadowBlur=0;ctx.restore();
  }
}
