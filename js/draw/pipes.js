// ============================================================
// draw/pipes.js — all pipe variant drawing
// ============================================================

import { PIPE_GAP } from '../config.js';
import { S } from '../state.js';

// ---- helpers ----
function drawSnowflake(sfx, sfy, sfsize) {
  const ctx = S.ctx;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(sfx, sfy);
    ctx.lineTo(sfx + Math.cos(a) * sfsize, sfy + Math.sin(a) * sfsize);
    ctx.stroke();
  }
}

function drawCactusFlower(fx, fy) {
  const ctx = S.ctx;
  ctx.fillStyle = '#ff6b9d';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.beginPath(); ctx.ellipse(fx + Math.cos(a) * 5, fy + Math.sin(a) * 5, 4, 2.5, a, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(fx, fy, 3.5, 0, Math.PI * 2); ctx.fill();
}

// ---- Dispatcher ----
export function drawPipe(pipe) {
  const ctx = S.ctx;
  const pw  = 60;

  // Pipe 30 = finish line — banner only, no obstacle body
  if (pipe.pipeIndex === 30) {
    const fx         = pipe.x + pw / 2;
    const finishTop  = 0;
    const finishH    = S.canvas.height - 60;
    const squareSize = 20, cols = 2, bannerW = cols * squareSize;
    const rows = Math.ceil(finishH / squareSize);
    ctx.save();
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#000000';
        ctx.fillRect(fx - bannerW / 2 + col * squareSize, finishTop + row * squareSize, squareSize, squareSize);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(fx - bannerW / 2, finishTop, bannerW, finishH);
    const gapMid = S.canvas.height / 2;
    const pulse  = 0.8 + Math.abs(Math.sin(S.frame * 0.08)) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
    ctx.font = 'bold 15px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeText('🏁 FINISH', fx, gapMid); ctx.fillText('🏁 FINISH', fx, gapMid);
    ctx.restore();
    return;
  }

  const v = pipe.variant || 'normal';
  const bH = S.canvas.height - pipe.topH - PIPE_GAP - 60;
  if      (v === 'cactus')         { drawCactus(pipe.x, pipe.topH, pw, true); drawCactus(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }
  else if (v === 'icicle')         { drawIcicle(pipe.x, pipe.topH, pw, true); drawIcicle(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }
  else if (v === 'minecraft_tree') { drawMinecraftTree(pipe.x, pipe.topH, pw, true); drawMinecraftTree(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }
  else if (v === 'spruce_tree')    { drawSpruceTree(pipe.x, pipe.topH, pw, true); drawSpruceTree(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }
  else if (v === 'palm_bundle')    { drawPalmBundle(pipe.x, pipe.topH, pw, true); drawPalmBundle(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }
  else                             { drawNormalPipe(pipe.x, pipe.topH, pw, true); drawNormalPipe(pipe.x, pipe.topH + PIPE_GAP, pw, false, bH); }

  // Checkpoint flags
  if (pipe.pipeIndex === 10 || pipe.pipeIndex === 20) {
    const label  = pipe.pipeIndex === 10 ? '10' : '20';
    const flagX  = pipe.x + pw / 2;
    const fw = 36, fh = 22;
    ctx.save();
    ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(flagX, pipe.topH + 8); ctx.lineTo(flagX, pipe.topH + PIPE_GAP - 8); ctx.stroke();
    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.moveTo(flagX, pipe.topH + 8); ctx.lineTo(flagX + fw, pipe.topH + 8 + fh / 2); ctx.lineTo(flagX, pipe.topH + 8 + fh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a7a42'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, flagX + fw * 0.38, pipe.topH + 8 + fh / 2);
    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.moveTo(flagX, pipe.topH + PIPE_GAP - 8); ctx.lineTo(flagX + fw, pipe.topH + PIPE_GAP - 8 - fh / 2); ctx.lineTo(flagX, pipe.topH + PIPE_GAP - 8 - fh); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a7a42'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillText(label, flagX + fw * 0.38, pipe.topH + PIPE_GAP - 8 - fh / 2);
    ctx.restore();
  }
}

function drawNormalPipe(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  ctx.fillStyle = '#75b300'; ctx.strokeStyle = '#5a8a00'; ctx.lineWidth = 3;
  ctx.fillRect(x + 5, startY, w - 10, actualH); ctx.strokeRect(x + 5, startY, w - 10, actualH);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 9, startY, 7, actualH);
  ctx.fillStyle = '#4a7000';
  for (let ry = startY + 18; ry < startY + actualH - 8; ry += 28) {
    ctx.beginPath(); ctx.arc(x + 11, ry, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 11, ry, 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#2d7a00'; ctx.lineWidth = 1.5;
  for (let vy = startY + 12; vy < startY + actualH - 8; vy += 22) {
    ctx.beginPath(); ctx.moveTo(x + 5, vy); ctx.quadraticCurveTo(x + w / 2, vy + 11, x + w - 5, vy + 3); ctx.stroke();
    ctx.fillStyle = '#4db800'; ctx.beginPath(); ctx.ellipse(x + w / 2 + 2, vy + 13, 5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  }
  const capY = isTop ? y - 20 : y;
  ctx.fillStyle = '#75b300'; ctx.strokeStyle = '#5a8a00'; ctx.lineWidth = 3;
  ctx.fillRect(x, capY, w, 20); ctx.strokeRect(x, capY, w, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x + 4, capY + 4, w - 8, 7);
}

function drawCactus(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  ctx.fillStyle = '#2d8a00'; ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 2;
  ctx.fillRect(x + 10, startY, w - 20, actualH); ctx.strokeRect(x + 10, startY, w - 20, actualH);
  ctx.strokeStyle = '#1a6000'; ctx.lineWidth = 1.5;
  for (let ry = startY + 10; ry < startY + actualH - 4; ry += 11) { ctx.beginPath(); ctx.moveTo(x + 10, ry); ctx.lineTo(x + w - 10, ry); ctx.stroke(); }
  ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 1;
  for (let ty = startY + 8; ty < startY + actualH - 5; ty += 12) {
    ctx.beginPath(); ctx.moveTo(x+10,ty); ctx.lineTo(x+3,ty-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+10,ty+6); ctx.lineTo(x+3,ty+11); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-10,ty); ctx.lineTo(x+w-3,ty-5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+w-10,ty+6); ctx.lineTo(x+w-3,ty+11); ctx.stroke();
  }
  ctx.fillStyle = '#2d8a00'; ctx.strokeStyle = '#1a5200'; ctx.lineWidth = 2;
  if (isTop) {
    ctx.fillRect(x,y-50,18,30); ctx.strokeRect(x,y-50,18,30);
    ctx.fillRect(x+w-18,y-70,18,30); ctx.strokeRect(x+w-18,y-70,18,30);
    ctx.strokeStyle='#1a6000'; ctx.lineWidth=1.5;
    for(let ry=y-48;ry<y-22;ry+=8){ctx.beginPath();ctx.moveTo(x,ry);ctx.lineTo(x+18,ry);ctx.stroke();}
    drawCactusFlower(x+9,y-52); drawCactusFlower(x+w-9,y-72); drawCactusFlower(x+w/2,y-2);
  } else {
    ctx.fillRect(x,y+20,18,30); ctx.strokeRect(x,y+20,18,30);
    ctx.fillRect(x+w-18,y+40,18,30); ctx.strokeRect(x+w-18,y+40,18,30);
    ctx.strokeStyle='#1a6000'; ctx.lineWidth=1.5;
    for(let ry=y+22;ry<y+48;ry+=8){ctx.beginPath();ctx.moveTo(x,ry);ctx.lineTo(x+18,ry);ctx.stroke();}
    drawCactusFlower(x+9,y+52); drawCactusFlower(x+w-9,y+72); drawCactusFlower(x+w/2,y+2);
  }
}

function drawIcicle(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  const iceGrad = ctx.createLinearGradient(x, 0, x + w, 0);
  iceGrad.addColorStop(0,'#5a9fcf'); iceGrad.addColorStop(0.18,'#d8f0ff');
  iceGrad.addColorStop(0.45,'#eafaff'); iceGrad.addColorStop(0.75,'#b0d8f0'); iceGrad.addColorStop(1,'#4a88ba');
  ctx.fillStyle = iceGrad; ctx.strokeStyle = '#4a88ba'; ctx.lineWidth = 2;
  ctx.fillRect(x+5,startY,w-10,actualH); ctx.strokeRect(x+5,startY,w-10,actualH);
  ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillRect(x+10,startY,7,actualH);
  ctx.fillStyle='rgba(200,240,255,0.2)'; ctx.fillRect(x+w-20,startY,6,actualH);
  ctx.strokeStyle='rgba(120,200,240,0.55)'; ctx.lineWidth=1;
  [[x+18,18,10,16],[x+38,12,-8,18],[x+50,20,7,14],[x+24,16,-5,20],[x+44,10,9,12]].forEach(([cx2,cy2off,dx2,dy2]) => {
    for(let ry=startY+cy2off;ry<startY+actualH-10;ry+=44){ctx.beginPath();ctx.moveTo(cx2,ry);ctx.lineTo(cx2+dx2,ry+dy2);ctx.lineTo(cx2+dx2*0.4,ry+dy2*1.6);ctx.stroke();}
  });
  ctx.strokeStyle='rgba(210,240,255,0.4)'; ctx.lineWidth=1;
  for(let ly=startY+10;ly<startY+actualH-5;ly+=18){ctx.beginPath();ctx.moveTo(x+5,ly);ctx.lineTo(x+w-5,ly);ctx.stroke();}
  ctx.strokeStyle='rgba(180,225,255,0.75)'; ctx.lineWidth=1.5;
  for(let isy=startY+30;isy<startY+actualH-20;isy+=48) drawSnowflake(x+w/2,isy,9);
  const spikes=5, sw=( w-10)/spikes;
  for(let i=0;i<spikes;i++){
    const sx2=x+5+i*sw, spikeLen=18+[12,22,30,18,26][i];
    const spikeGrad=ctx.createLinearGradient(sx2,0,sx2+sw,0);
    spikeGrad.addColorStop(0,'#8ac8e8'); spikeGrad.addColorStop(0.3,'#e8f8ff'); spikeGrad.addColorStop(1,'#6aacd0');
    ctx.fillStyle=spikeGrad; ctx.strokeStyle='#4a88ba'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(sx2,y); ctx.lineTo(sx2+sw/2, isTop?y+spikeLen:y-spikeLen); ctx.lineTo(sx2+sw,y); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.moveTo(sx2+sw*0.22,y); ctx.lineTo(sx2+sw*0.32,isTop?y+spikeLen*0.55:y-spikeLen*0.55); ctx.lineTo(sx2+sw*0.42,y); ctx.closePath(); ctx.fill();
    const tipY=isTop?y+spikeLen:y-spikeLen;
    ctx.fillStyle='rgba(180,230,255,0.8)'; ctx.beginPath(); ctx.arc(sx2+sw/2,tipY+(isTop?4:-4),2.5,0,Math.PI*2); ctx.fill();
  }
  const capGrad=ctx.createLinearGradient(x,0,x+w,0);
  capGrad.addColorStop(0,'#6aacd0'); capGrad.addColorStop(0.3,'#d8f0ff'); capGrad.addColorStop(1,'#5a9fcf');
  ctx.fillStyle=capGrad; ctx.strokeStyle='#4a88ba'; ctx.lineWidth=2;
  const capY=isTop?y-22:y; ctx.fillRect(x,capY,w,22); ctx.strokeRect(x,capY,w,22);
  if(isTop){ctx.fillStyle='rgba(235,250,255,0.85)'; for(let sx3=x;sx3<x+w-4;sx3+=10){ctx.beginPath();ctx.arc(sx3+5,capY+4,5,Math.PI,0);ctx.fill();}}
  ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(x+4,capY+3,w-8,8);
}

function drawMinecraftTree(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  const cx      = x + w / 2;
  const trunkW  = 22, trunkX = x + (w - trunkW) / 2;
  const tGrad   = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0,'#4a2c08'); tGrad.addColorStop(0.3,'#7a4e1c'); tGrad.addColorStop(0.65,'#6a4218'); tGrad.addColorStop(1,'#321808');
  ctx.fillStyle = tGrad; ctx.fillRect(trunkX, startY, trunkW, actualH);
  ctx.strokeStyle='#2e1a04'; ctx.lineWidth=1;
  for(let by2=startY+8;by2<startY+actualH;by2+=12){ctx.beginPath();ctx.moveTo(trunkX+3,by2);ctx.quadraticCurveTo(cx,by2+5,trunkX+trunkW-3,by2+1);ctx.stroke();}
  ctx.strokeStyle='#2e1a04'; ctx.lineWidth=2; ctx.strokeRect(trunkX,startY,trunkW,actualH);
  const R=w*0.94+4, canopyY=isTop?y-R*0.20:y+R*0.20;
  ctx.fillStyle='rgba(15,60,5,0.30)'; ctx.beginPath(); ctx.arc(cx+5,canopyY+7,R,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1e6a0a'; ctx.beginPath(); ctx.arc(cx,canopyY,R,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#1a5e08'; ctx.beginPath(); ctx.arc(cx-R*0.58,canopyY+R*0.20,R*0.78,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+R*0.58,canopyY+R*0.20,R*0.78,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#308a14'; ctx.beginPath(); ctx.arc(cx-R*0.30,canopyY-R*0.08,R*0.66,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+R*0.30,canopyY-R*0.08,R*0.66,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#48b81e'; ctx.beginPath(); ctx.arc(cx,canopyY-R*0.36,R*0.46,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx-R*0.24,canopyY-R*0.46,R*0.32,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+R*0.22,canopyY-R*0.44,R*0.30,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(110,230,40,0.20)'; ctx.beginPath(); ctx.arc(cx-R*0.10,canopyY-R*0.26,R*0.18,0,Math.PI*2); ctx.fill();
}

function drawSpruceTree(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  const cx      = x + w / 2;
  const trunkW  = 16, trunkX = x + (w - trunkW) / 2;
  const tGrad   = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0,'#2e1e08'); tGrad.addColorStop(0.4,'#4e3218'); tGrad.addColorStop(1,'#201008');
  ctx.fillStyle=tGrad; ctx.fillRect(trunkX,startY,trunkW,actualH); ctx.strokeStyle='#180c04'; ctx.lineWidth=2; ctx.strokeRect(trunkX,startY,trunkW,actualH);
  const numBoughs=5, maxBW=w*2.1;
  for(let bi=0;bi<numBoughs;bi++){
    const progress=bi/(numBoughs-1), bw=maxBW*(0.22+progress*0.78), bh=18+progress*10;
    let tipY,baseY;
    if(isTop){tipY=y-bi*18;baseY=tipY-bh;}else{tipY=y+bi*18;baseY=tipY+bh;}
    ctx.fillStyle=`rgb(22,${Math.floor(68+progress*24)},22)`;
    ctx.beginPath();ctx.moveTo(cx,tipY);ctx.lineTo(cx-bw/2,baseY);ctx.lineTo(cx+bw/2,baseY);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(218,240,255,0.82)';
    ctx.beginPath();ctx.moveTo(cx,tipY);ctx.lineTo(cx-bw*0.42,isTop?baseY+bh*0.28:baseY-bh*0.28);ctx.lineTo(cx+bw*0.42,isTop?baseY+bh*0.28:baseY-bh*0.28);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#102810';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx,tipY);ctx.lineTo(cx-bw/2,baseY);ctx.lineTo(cx+bw/2,baseY);ctx.closePath();ctx.stroke();
    const lightColors=['#ff2020','#20dd20','#2080ff','#FFD700','#ff80ff','#20ffee'];
    const numLights=Math.floor(bw/18);
    for(let li=0;li<numLights;li++){
      const lt=(li+0.5)/numLights, lx=cx-bw/2+bw*lt, ly=isTop?baseY+bh*0.08:baseY-bh*0.08;
      const lColor=lightColors[(bi*numLights+li)%lightColors.length];
      ctx.strokeStyle='rgba(30,30,30,0.6)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(lx,isTop?tipY+(baseY-tipY)*0.5:tipY-(tipY-baseY)*0.5);ctx.lineTo(lx,ly);ctx.stroke();
      ctx.fillStyle=lColor.replace(')','a').replace('rgb','rgba').slice(0,-1)+',0.3)'.replace('a)','a,0.3)');
      ctx.beginPath();ctx.arc(lx,ly,6,0,Math.PI*2);
      // simplified: just draw the bulb
      ctx.fillStyle=lColor;ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=0.8;ctx.beginPath();ctx.arc(lx,ly,3.5,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.6)';ctx.beginPath();ctx.arc(lx-1,ly-1,1.2,0,Math.PI*2);ctx.fill();
    }
  }
}

function drawPalmBundle(x, y, w, isTop, h) {
  const ctx = S.ctx;
  const actualH = isTop ? y : h;
  const startY  = isTop ? 0 : y;
  const cx      = x + w / 2;
  const trunkW  = w - 2, trunkX = x + 1;
  const tGrad   = ctx.createLinearGradient(trunkX, 0, trunkX + trunkW, 0);
  tGrad.addColorStop(0,'#7a4e1e'); tGrad.addColorStop(0.22,'#c08840'); tGrad.addColorStop(0.52,'#b07830'); tGrad.addColorStop(0.80,'#9a6428'); tGrad.addColorStop(1,'#5e3410');
  ctx.fillStyle=tGrad;
  ctx.beginPath();ctx.moveTo(trunkX,startY);ctx.bezierCurveTo(trunkX-8,startY+actualH*0.35,trunkX-8,startY+actualH*0.65,trunkX,startY+actualH);ctx.lineTo(trunkX+trunkW,startY+actualH);ctx.bezierCurveTo(trunkX+trunkW+8,startY+actualH*0.65,trunkX+trunkW+8,startY+actualH*0.35,trunkX+trunkW,startY);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#6a3e18';ctx.lineWidth=1.2;
  for(let by2=startY+10;by2<startY+actualH-6;by2+=15){ctx.beginPath();ctx.moveTo(trunkX+6,by2);ctx.quadraticCurveTo(cx,by2+5,trunkX+trunkW-6,by2+2);ctx.stroke();}
  ctx.strokeStyle='#4e2c0e';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(trunkX,startY);ctx.bezierCurveTo(trunkX-8,startY+actualH*0.35,trunkX-8,startY+actualH*0.65,trunkX,startY+actualH);ctx.moveTo(trunkX+trunkW,startY);ctx.bezierCurveTo(trunkX+trunkW+8,startY+actualH*0.35,trunkX+trunkW+8,startY+actualH*0.65,trunkX+trunkW,startY+actualH);ctx.stroke();
  const rootY=y;
  const branchAngles=isTop?[-0.85,-0.38,0.0,0.38,0.85]:[Math.PI+0.85,Math.PI+0.38,Math.PI,Math.PI-0.38,Math.PI-0.85];
  branchAngles.forEach((ba,bi) => {
    const bLen=24+(bi%3)*8;
    ctx.strokeStyle='#7a4e20';ctx.lineWidth=5-bi*0.6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx,rootY);
    const bex=cx+Math.cos(ba)*bLen,bey=rootY+Math.sin(ba)*bLen;
    ctx.quadraticCurveTo(cx+Math.cos(ba)*bLen*0.5,rootY+Math.sin(ba)*bLen*0.5+(isTop?-6:6),bex,bey);ctx.stroke();
    const leafR=16+(bi%3)*5;
    ctx.fillStyle=bi%2===0?'#267008':'#32880e';ctx.beginPath();ctx.arc(bex,bey,leafR,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(50,140,15,0.45)';ctx.beginPath();ctx.arc(bex-5,bey-5,leafR*0.60,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(80,180,20,0.28)';ctx.beginPath();ctx.arc(bex-3,bey-8,leafR*0.35,0,Math.PI*2);ctx.fill();
  });
}
