// ============================================================
// draw/background.js — all background & decoration drawing
// ============================================================

import { S } from '../state.js';
import { themes } from '../config.js';

export function drawBackground() {
  const t    = themes[S.theme];
  const ctx  = S.ctx;
  const grad = ctx.createLinearGradient(0, 0, 0, S.canvas.height);
  grad.addColorStop(0, t.bg[0]);
  grad.addColorStop(1, t.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S.canvas.width, S.canvas.height);

  if (S.theme === 'nature')   drawBgNature();
  else if (S.theme === 'desert')   drawBgDesert();
  else if (S.theme === 'mountain') drawBgMountain();

  ctx.fillStyle = t.ground;
  ctx.fillRect(0, S.canvas.height - 60, S.canvas.width, 60);
  ctx.fillStyle = S.theme === 'mountain' ? '#fff' : (S.theme === 'desert' ? '#b8864e' : '#5a8a00');
  ctx.fillRect(0, S.canvas.height - 60, S.canvas.width, 8);

  drawCeilingDecorations();
  drawFloorDecorations();
}

function drawBgNature() {
  const ctx   = S.ctx;
  const frame = S.frame;
  const canvas = S.canvas;
  const sx = canvas.width - 65, sy = 58;
  const sglow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 80);
  sglow.addColorStop(0, 'rgba(255,248,120,0.6)');
  sglow.addColorStop(1, 'rgba(255,230,50,0)');
  ctx.fillStyle = sglow;
  ctx.beginPath(); ctx.arc(sx, sy, 80, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,220,60,0.45)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + frame * 0.005;
    ctx.beginPath();
    ctx.moveTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28);
    ctx.lineTo(sx + Math.cos(a) * 58, sy + Math.sin(a) * 58);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#FFD700'; ctx.beginPath(); ctx.arc(sx, sy, 24, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#FFEE70'; ctx.beginPath(); ctx.arc(sx - 7, sy - 7, 12, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = 'rgba(60,110,8,0.22)';
  ctx.beginPath(); ctx.moveTo(0, canvas.height - 60);
  ctx.bezierCurveTo(100, canvas.height - 180, 240, canvas.height - 130, 380, canvas.height - 200);
  ctx.bezierCurveTo(500, canvas.height - 250, 620, canvas.height - 150, canvas.width, canvas.height - 160);
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(70,130,10,0.32)';
  ctx.beginPath(); ctx.moveTo(0, canvas.height - 60);
  ctx.bezierCurveTo(60, canvas.height - 145, 160, canvas.height - 115, 250, canvas.height - 165);
  ctx.bezierCurveTo(340, canvas.height - 210, 420, canvas.height - 135, canvas.width, canvas.height - 115);
  ctx.lineTo(canvas.width, canvas.height - 60); ctx.closePath(); ctx.fill();

  [[145,180],[290,130],[430,165],[560,145]].forEach(([bx2,by2],i) => {
    const bounce = Math.sin(frame * 0.045 + i * 1.2) * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(bx2-13,by2-12+bounce+3,26,26);
    ctx.fillStyle = '#e09000'; ctx.strokeStyle = '#7a4a00'; ctx.lineWidth = 2;
    ctx.fillRect(bx2-13,by2-12+bounce,26,26); ctx.strokeRect(bx2-13,by2-12+bounce,26,26);
    ctx.fillStyle = '#b86800';
    ctx.fillRect(bx2-11,by2-10+bounce,22,3); ctx.fillRect(bx2-11,by2+9+bounce,22,3);
    ctx.fillRect(bx2-11,by2-10+bounce,3,22); ctx.fillRect(bx2+8,by2-10+bounce,3,22);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('?',bx2,by2+2+bounce); ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  });

  [185,208,231,492,515,538].forEach((cx2,i) => {
    const cy2 = 113 + Math.sin(frame * 0.05 + i * 0.85) * 5;
    ctx.fillStyle = 'rgba(255,220,0,0.22)'; ctx.beginPath(); ctx.arc(cx2,cy2,10,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#FFD700'; ctx.strokeStyle = '#c08800'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(cx2,cy2,5.5,8,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(cx2-1.5,cy2-2,2,4,0,0,Math.PI*2); ctx.fill();
  });

  [[55,canvas.height-108],[686,canvas.height-92]].forEach(([px,py]) => {
    ctx.fillStyle = 'rgba(45,130,0,0.36)'; ctx.strokeStyle = 'rgba(30,90,0,0.36)'; ctx.lineWidth = 2;
    ctx.fillRect(px-11,canvas.height-60,22,60);
    ctx.fillRect(px-15,py,30,16); ctx.strokeRect(px-15,py,30,16);
    ctx.fillStyle = 'rgba(80,200,0,0.2)'; ctx.fillRect(px-11,py+3,10,9);
  });

  [[360,95],[610,105]].forEach(([sx2,sy2],i) => {
    const sOff = Math.sin(frame * 0.04 + i) * 4;
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

  [[80,80,42],[210,58,50],[355,85,36],[500,62,44],[620,75,30]].forEach(([cx,cy,r]) => {
    ctx.fillStyle = 'rgba(190,210,230,0.5)';
    ctx.beginPath(); ctx.arc(cx+4,cy+6,r*0.85,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.65,cy+14,r*0.72,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx-r*0.45,cy+14,r*0.65,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx+r*0.62,cy+8,r*0.72,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx-r*0.47,cy+10,r*0.65,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(cx-4,cy-6,r*0.38,0,Math.PI*2); ctx.fill();
  });

  ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1.5;
  [[148,118],[163,110],[290,92],[306,98],[450,130],[464,124]].forEach(([bx2,by2]) => {
    ctx.beginPath();
    ctx.moveTo(bx2-9,by2); ctx.quadraticCurveTo(bx2-4,by2-6,bx2,by2);
    ctx.quadraticCurveTo(bx2+4,by2-6,bx2+9,by2); ctx.stroke();
  });

  const rainbowColors = ['rgba(255,0,0,0.07)','rgba(255,140,0,0.07)','rgba(255,255,0,0.06)','rgba(0,200,0,0.06)','rgba(0,100,255,0.06)','rgba(130,0,200,0.05)'];
  rainbowColors.forEach((c, ri) => {
    ctx.strokeStyle = c; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(80, canvas.height - 60, 200 + ri * 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  });
}

function drawBgDesert() {
  const ctx = S.ctx, frame = S.frame, canvas = S.canvas;
  const sx = canvas.width - 72, sy = 72;
  const pulse = 0.92 + Math.sin(frame * 0.02) * 0.08;
  const sglow = ctx.createRadialGradient(sx,sy,12,sx,sy,95*pulse);
  sglow.addColorStop(0,'rgba(255,200,60,0.65)'); sglow.addColorStop(0.5,'rgba(255,120,20,0.3)'); sglow.addColorStop(1,'rgba(255,60,0,0)');
  ctx.fillStyle = sglow; ctx.beginPath(); ctx.arc(sx,sy,95,0,Math.PI*2); ctx.fill();
  ctx.save(); ctx.strokeStyle='rgba(255,165,0,0.55)'; ctx.lineWidth=3; ctx.lineCap='round';
  for(let i=0;i<10;i++){const a=(i/10)*Math.PI*2+frame*0.004; ctx.beginPath(); ctx.moveTo(sx+Math.cos(a)*36,sy+Math.sin(a)*36); ctx.lineTo(sx+Math.cos(a)*68,sy+Math.sin(a)*68); ctx.stroke();}
  ctx.restore();
  ctx.fillStyle='#FF6B00'; ctx.beginPath(); ctx.arc(sx,sy,30,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#FFAA00'; ctx.beginPath(); ctx.arc(sx-7,sy-7,15,0,Math.PI*2); ctx.fill();

  const pyX=80,pyBase=canvas.height-60;
  ctx.fillStyle='rgba(185,130,70,0.55)'; ctx.beginPath(); ctx.moveTo(pyX,pyBase); ctx.lineTo(pyX+70,pyBase); ctx.lineTo(pyX+35,pyBase-100); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(140,90,40,0.55)'; ctx.beginPath(); ctx.moveTo(pyX+35,pyBase-100); ctx.lineTo(pyX+70,pyBase); ctx.lineTo(pyX+35,pyBase); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(220,180,100,0.4)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(pyX+35,pyBase-100); ctx.lineTo(pyX,pyBase); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(pyX+35,pyBase-100); ctx.lineTo(pyX+70,pyBase); ctx.stroke();

  ctx.fillStyle='rgba(155,90,45,0.4)'; ctx.beginPath(); ctx.moveTo(160,canvas.height-60);
  ctx.lineTo(160,canvas.height-200); ctx.lineTo(215,canvas.height-210); ctx.lineTo(250,canvas.height-165); ctx.lineTo(320,canvas.height-205);
  ctx.lineTo(380,canvas.height-150); ctx.lineTo(445,canvas.height-185); ctx.lineTo(500,canvas.height-140); ctx.lineTo(580,canvas.height-195);
  ctx.lineTo(640,canvas.height-145); ctx.lineTo(canvas.width,canvas.height-155); ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();
  ctx.fillStyle='rgba(190,115,55,0.45)'; ctx.beginPath(); ctx.moveTo(200,canvas.height-60);
  ctx.lineTo(200,canvas.height-145); ctx.lineTo(260,canvas.height-175); ctx.lineTo(310,canvas.height-135); ctx.lineTo(370,canvas.height-168);
  ctx.lineTo(425,canvas.height-128); ctx.lineTo(490,canvas.height-162); ctx.lineTo(545,canvas.height-125); ctx.lineTo(canvas.width,canvas.height-140);
  ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();

  ctx.fillStyle='rgba(220,175,90,0.42)'; ctx.beginPath(); ctx.moveTo(0,canvas.height-60);
  ctx.quadraticCurveTo(80,canvas.height-115,170,canvas.height-60); ctx.quadraticCurveTo(255,canvas.height-100,350,canvas.height-60);
  ctx.quadraticCurveTo(435,canvas.height-92,530,canvas.height-60); ctx.quadraticCurveTo(620,canvas.height-85,canvas.width,canvas.height-60);
  ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();

  ctx.save(); ctx.strokeStyle='rgba(255,170,0,0.1)'; ctx.lineWidth=1.2;
  for(let i=0;i<6;i++){const hy=canvas.height-95+i*8; ctx.beginPath(); ctx.moveTo(0,hy);
    for(let hx2=0;hx2<=canvas.width;hx2+=18) ctx.lineTo(hx2+9,hy+Math.sin((hx2+frame*0.7)*0.1)*3);
    ctx.stroke();} ctx.restore();

  {const eagleX=((frame*0.55+100)%(canvas.width+180))-90,eagleY=78+Math.sin(frame*0.013)*30;
  const wb=Math.sin(frame*0.07)*0.35; ctx.save(); ctx.translate(eagleX,eagleY);
  ctx.fillStyle='#2e1a08'; ctx.beginPath(); ctx.moveTo(-2,-3); ctx.quadraticCurveTo(-22,-24+wb*20,-50,-20+wb*15); ctx.quadraticCurveTo(-34,-8+wb*6,-2,3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#1a0e04'; ctx.lineWidth=1.2; ctx.lineCap='round';
  for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(-38-ft*10,-20+wb*15+ft*2); ctx.lineTo(-41-ft*10,-28+wb*15+ft*5); ctx.stroke();}
  ctx.fillStyle='#2e1a08'; ctx.beginPath(); ctx.moveTo(2,-3); ctx.quadraticCurveTo(22,-24+wb*20,50,-20+wb*15); ctx.quadraticCurveTo(34,-8+wb*6,2,3); ctx.closePath(); ctx.fill();
  for(let fi=0;fi<5;fi++){const ft=fi/4; ctx.beginPath(); ctx.moveTo(38+ft*10,-20+wb*15+ft*2); ctx.lineTo(41+ft*10,-28+wb*15+ft*5); ctx.stroke();}
  ctx.fillStyle='#3a2010'; ctx.beginPath(); ctx.ellipse(0,0,14,6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#f0f0f0'; ctx.beginPath(); ctx.arc(13,-2,7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e8b000'; ctx.strokeStyle='#c08000'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(19,-2); ctx.lineTo(27,1); ctx.lineTo(19,3); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(16,-4,2,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(16.8,-4.5,0.7,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e0e0e0'; ctx.beginPath(); ctx.moveTo(-12,-1); ctx.lineTo(-26,-5); ctx.lineTo(-24,6); ctx.lineTo(-12,2); ctx.closePath(); ctx.fill();
  ctx.restore();}

  {const wx=128,wy=canvas.height-190;
  ctx.fillStyle='rgba(228,192,138,0.48)'; ctx.strokeStyle='rgba(110,70,25,0.48)'; ctx.lineWidth=2;
  ctx.fillRect(wx,wy,64,80); ctx.strokeRect(wx,wy,64,80);
  ctx.fillStyle='rgba(150,75,0,0.48)'; ctx.font='bold 8px Arial'; ctx.textAlign='center';
  ctx.fillText('WANTED',wx+32,wy+13);
  ctx.fillStyle='rgba(70,35,0,0.4)'; ctx.beginPath(); ctx.arc(wx+32,wy+38,18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(150,75,0,0.45)'; ctx.font='7px Arial';
  ctx.fillText('DEAD OR ALIVE',wx+32,wy+66); ctx.fillText('$1000 REWARD',wx+32,wy+76); ctx.textAlign='left';}
}

function drawBgMountain() {
  const ctx = S.ctx, frame = S.frame, canvas = S.canvas;
  ctx.save();
  const auroraColors=['rgba(0,220,160,0.12)','rgba(80,200,255,0.10)','rgba(180,100,255,0.09)','rgba(0,255,180,0.08)'];
  auroraColors.forEach((c,ai) => {
    ctx.fillStyle=c; ctx.beginPath(); ctx.moveTo(0,0);
    const waveOff=frame*0.004+ai*0.8;
    for(let ax=0;ax<=canvas.width;ax+=10){const ay=30+ai*18+Math.sin(ax*0.015+waveOff)*22+Math.sin(ax*0.03+waveOff*1.3)*12;
      ax===0?ctx.moveTo(ax,ay):ctx.lineTo(ax,ay);}
    ctx.lineTo(canvas.width,0); ctx.closePath(); ctx.fill();
  });
  ctx.restore();

  ctx.fillStyle='rgba(140,170,210,0.35)'; ctx.beginPath(); ctx.moveTo(0,canvas.height-60);
  const farPeaks=[[0,0.38],[40,0.18],[95,0.34],[150,0.14],[210,0.38],[270,0.10],[330,0.32],[395,0.15],[455,0.40],[510,0.12],[565,0.35],[620,0.18],[680,0.38],[720,0.28]];
  farPeaks.forEach(([mx,mh]) => ctx.lineTo(mx,(canvas.height-60)*(1-mh)));
  ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();

  ctx.fillStyle='rgba(100,140,190,0.50)'; ctx.beginPath(); ctx.moveTo(0,canvas.height-60);
  const midPeaks=[[0,0.30],[55,0.10],[115,0.26],[175,0.07],[235,0.30],[295,0.08],[355,0.24],[415,0.10],[475,0.28],[535,0.09],[590,0.22],[645,0.12],[695,0.27],[720,0.20]];
  midPeaks.forEach(([mx,mh]) => ctx.lineTo(mx,(canvas.height-60)*(1-mh)));
  ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();

  [[55,0.10],[175,0.07],[295,0.08],[415,0.10],[535,0.09],[645,0.12]].forEach(([mx,mh]) => {
    const peakY=(canvas.height-60)*(1-mh);
    ctx.fillStyle='rgba(240,250,255,0.85)'; ctx.beginPath(); ctx.moveTo(mx,peakY); ctx.lineTo(mx-22,peakY+28); ctx.lineTo(mx+22,peakY+28); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(180,210,240,0.5)'; ctx.beginPath(); ctx.moveTo(mx,peakY); ctx.lineTo(mx+22,peakY+28); ctx.lineTo(mx+10,peakY+28); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.moveTo(mx,peakY); ctx.lineTo(mx-10,peakY+16); ctx.lineTo(mx+2,peakY+16); ctx.closePath(); ctx.fill();
  });

  ctx.fillStyle='rgba(60,95,140,0.45)'; ctx.beginPath(); ctx.moveTo(0,canvas.height-60);
  [[0,0.18],[80,0.05],[160,0.14],[240,0.03],[310,0.12],[385,0.06],[460,0.15],[535,0.04],[610,0.13],[685,0.07],[720,0.15]].forEach(([mx,mh]) => {
    ctx.lineTo(mx,(canvas.height-60)*(1-mh));});
  ctx.lineTo(canvas.width,canvas.height-60); ctx.closePath(); ctx.fill();

  [20,68,108,280,328,378,540,600,658,704].forEach((px,i) => {
    const ph=36+(i%3)*10, pw2=20+(i%2)*10, pineY=canvas.height-62;
    ctx.fillStyle=`rgba(20,55,30,${0.55+(i%2)*0.1})`;
    ctx.beginPath(); ctx.moveTo(px,pineY-ph); ctx.lineTo(px-pw2,pineY-ph*0.45); ctx.lineTo(px+pw2,pineY-ph*0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px,pineY-ph*0.52); ctx.lineTo(px-pw2*1.4,pineY-ph*0.12); ctx.lineTo(px+pw2*1.4,pineY-ph*0.12); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(px,pineY-ph*0.22); ctx.lineTo(px-pw2*1.65,pineY+2); ctx.lineTo(px+pw2*1.65,pineY+2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(220,240,255,0.5)'; ctx.beginPath(); ctx.moveTo(px,pineY-ph); ctx.lineTo(px-pw2*0.22,pineY-ph*0.62); ctx.lineTo(px+pw2*0.22,pineY-ph*0.62); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(50,30,10,0.5)'; ctx.fillRect(px-3,pineY-ph*0.2,6,ph*0.2+2);
  });

  [[55,65,36],[190,48,44],[350,68,32],[500,55,38],[650,62,28]].forEach(([cx,cy,r]) => {
    ctx.fillStyle='rgba(195,215,240,0.5)'; ctx.beginPath(); ctx.arc(cx+4,cy+7,r*0.82,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+r*0.58,cy+13,r*0.7,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(240,248,255,0.88)'; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx+r*0.58,cy+8,r*0.7,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(cx-r*0.48,cy+10,r*0.65,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(cx-4,cy-7,r*0.35,0,Math.PI*2); ctx.fill();
  });

  ctx.fillStyle='rgba(255,255,255,0.7)';
  for(let i=0;i<22;i++){const sfx=(i*33+frame*0.5)%canvas.width,sfy=(i*55+frame*1.2)%(canvas.height-90),sfr=1.2+(i%3)*0.8; ctx.beginPath(); ctx.arc(sfx,sfy,sfr,0,Math.PI*2); ctx.fill();}
  ctx.fillStyle='rgba(255,255,255,0.45)';
  for(let i=0;i<8;i++){const sfx=(i*88+frame*0.2)%canvas.width,sfy=(i*73+frame*0.45)%(canvas.height-90); ctx.beginPath(); ctx.arc(sfx,sfy,3,0,Math.PI*2); ctx.fill();}
}

export function drawCeilingDecorations() {
  const ctx = S.ctx, canvas = S.canvas;
  if (S.theme === 'nature') {
    ctx.strokeStyle='#2d7a00'; ctx.lineWidth=2;
    [20,60,105,155,205,255,305,355,400,445,490,535,580,625,670,710].forEach(vx => {
      const vlen=18+Math.sin(vx*0.12)*8;
      ctx.beginPath(); ctx.moveTo(vx,0); ctx.quadraticCurveTo(vx+6,vlen*0.5,vx+9,vlen); ctx.stroke();
      ctx.fillStyle='#3da800'; ctx.beginPath(); ctx.ellipse(vx+9,vlen,7,4,0.4,0,Math.PI*2); ctx.fill();
    });
  } else if (S.theme === 'desert') {
    [18,60,105,155,200,250,300,348,395,440,485,530,575,620,665,710].forEach(rx => {
      const rh=10+Math.sin(rx*0.17)*7;
      ctx.fillStyle='#a07850'; ctx.beginPath(); ctx.moveTo(rx-12,0); ctx.lineTo(rx,rh); ctx.lineTo(rx+12,0); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#8a6540'; ctx.beginPath(); ctx.moveTo(rx-6,0); ctx.lineTo(rx,rh-3); ctx.lineTo(rx+6,0); ctx.closePath(); ctx.fill();
    });
  } else if (S.theme === 'mountain') {
    ctx.strokeStyle='rgba(100,180,255,0.5)'; ctx.lineWidth=1;
    [12,42,78,118,158,200,244,290,334,378,420,460,500,540,580,620,660,700].forEach(ix => {
      const ih=14+Math.sin(ix*0.22)*9;
      ctx.fillStyle='rgba(210,235,255,0.8)'; ctx.beginPath(); ctx.moveTo(ix-8,0); ctx.lineTo(ix,ih); ctx.lineTo(ix+8,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    });
    ctx.fillStyle='rgba(230,245,255,0.55)';
    [28,60,98,138,180,222,267,312,356,399,440,480,520,560,600,640,680,715].forEach(ix => {
      const ih=6+Math.sin(ix*0.3)*3; ctx.beginPath(); ctx.moveTo(ix-4,0); ctx.lineTo(ix,ih); ctx.lineTo(ix+4,0); ctx.closePath(); ctx.fill();
    });
  }
}

export function drawFloorDecorations() {
  const ctx = S.ctx, canvas = S.canvas, frame = S.frame;
  const gy = canvas.height - 60;
  if (S.theme === 'nature') {
    ctx.strokeStyle='#3d7000'; ctx.lineWidth=1.5;
    [12,50,90,130,170,210,255,298,340,382,422,460,500,540,580,620,660,700].forEach(tx => {
      [-2,-1,0,1,2].forEach(i => { const h=8+Math.abs(i)*3; ctx.beginPath(); ctx.moveTo(tx+i*4,gy-8); ctx.lineTo(tx+i*5,gy-8-h); ctx.stroke(); });
    });
    [30,100,185,270,358,445,520,595,665,710].forEach(fx => {
      for(let a=0;a<5;a++){const pa=(a/5)*Math.PI*2; ctx.fillStyle=a%2===0?'#fff':'#FFD6E7'; ctx.beginPath(); ctx.arc(fx+Math.cos(pa)*5,gy-4+Math.sin(pa)*5,3.5,0,Math.PI*2); ctx.fill();}
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.arc(fx,gy-4,3,0,Math.PI*2); ctx.fill();
    });
    [55,175,310,455,590,695].forEach((mx,i) => {
      ctx.fillStyle='#f0eedd'; ctx.strokeStyle='#ccc'; ctx.lineWidth=1;
      ctx.fillRect(mx-5,gy-16,10,12); ctx.strokeRect(mx-5,gy-16,10,12);
      ctx.fillStyle='#ddd'; ctx.beginPath(); ctx.arc(mx-2,gy-12,2,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(mx+2,gy-9,1.5,0,Math.PI*2); ctx.fill();
      const capCol=i%2===0?'#e82010':'#e87010'; ctx.fillStyle=capCol;
      ctx.beginPath(); ctx.arc(mx,gy-20,12,Math.PI,0); ctx.fill(); ctx.beginPath(); ctx.ellipse(mx,gy-16,12,4,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#900'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(mx,gy-20,12,Math.PI,0); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(mx-5,gy-23,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(mx+5,gy-23,3,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(mx,gy-27,2.5,0,Math.PI*2); ctx.fill();
    });
  } else if (S.theme === 'desert') {
    [[18,14,9],[78,11,8],[155,13,10],[248,15,10],[338,12,8],[428,14,9],[510,13,9],[588,14,10],[658,12,8],[708,13,9]].forEach(([rx,rw,rh]) => {
      ctx.fillStyle='#a07850'; ctx.beginPath(); ctx.ellipse(rx,gy-rh*0.4,rw,rh,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#c09868'; ctx.beginPath(); ctx.ellipse(rx-3,gy-rh*0.5,rw*0.5,rh*0.5,-0.3,0,Math.PI*2); ctx.fill();
    });
    ctx.strokeStyle='rgba(140,90,40,0.45)'; ctx.lineWidth=1;
    [[35,60],[130,175],[225,275],[318,370],[400,440],[480,530],[560,610],[630,680]].forEach(([x1,x2]) => {
      const mid=(x1+x2)/2; ctx.beginPath(); ctx.moveTo(x1,gy+18); ctx.lineTo(mid,gy+28); ctx.lineTo(x2,gy+18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mid,gy+28); ctx.lineTo(mid-10,gy+38); ctx.stroke();
    });
    [0,1,2,3,4].forEach(i => {
      const speed2=0.7+i*0.18, roll=((frame*speed2+i*148)%(canvas.width+80))-40, twSize=14+(i%3)*5;
      ctx.save(); ctx.translate(roll,gy-twSize*0.65); ctx.rotate(frame*0.025*speed2);
      ctx.strokeStyle='#7a5510'; ctx.lineWidth=1.8;
      for(let t=0;t<6;t++){const a=(t/6)*Math.PI; ctx.beginPath(); ctx.ellipse(0,0,twSize,twSize*0.38,a,0,Math.PI*2); ctx.stroke();}
      ctx.strokeStyle='rgba(90,55,10,0.3)'; ctx.lineWidth=1; ctx.beginPath(); ctx.arc(0,0,twSize,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#6a4808';
      for(let ti=0;ti<8;ti++){const ta=(ti/8)*Math.PI*2; ctx.beginPath(); ctx.arc(Math.cos(ta)*twSize*0.72,Math.sin(ta)*twSize*0.72,2,0,Math.PI*2); ctx.fill();}
      ctx.restore();
      ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.beginPath(); ctx.ellipse(roll,gy,twSize*0.9,4,0,0,Math.PI*2); ctx.fill();
    });
  } else if (S.theme === 'mountain') {
    ctx.fillStyle='rgba(255,255,255,0.55)';
    [22,80,148,218,290,360,430,500,568,635,700].forEach(sx => { ctx.beginPath(); ctx.ellipse(sx,gy,28,13,0,Math.PI,Math.PI*2); ctx.fill(); });
    ctx.fillStyle='rgba(20,75,20,0.75)';
    [8,52,116,195,265,338,415,468,530,592,650,708].forEach(tx => {
      ctx.beginPath(); ctx.moveTo(tx,gy-28); ctx.lineTo(tx-15,gy-8); ctx.lineTo(tx+15,gy-8); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tx,gy-16); ctx.lineTo(tx-19,gy+1); ctx.lineTo(tx+19,gy+1); ctx.closePath(); ctx.fill();
    });
    [[40,18],[118,22],[200,16],[288,20],[375,18],[460,22],[545,16],[625,20],[700,18]].forEach(([px,ph],i) => {
      const pw=ph+4, py=gy-ph;
      ctx.fillStyle='rgba(0,0,0,0.15)'; ctx.fillRect(px-pw/2+3,py+3,pw,ph);
      const boxColors=['#e82020','#2060e8','#20a820','#e89020','#a020e8'];
      ctx.fillStyle=boxColors[i%boxColors.length]; ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=1.2;
      ctx.fillRect(px-pw/2,py,pw,ph); ctx.strokeRect(px-pw/2,py,pw,ph);
      ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(px-pw/2,py,pw,ph*0.28);
      ctx.fillStyle='#FFD700'; ctx.strokeStyle='#aa8800'; ctx.lineWidth=0.8;
      ctx.fillRect(px-2,py,4,ph); ctx.strokeRect(px-2,py,4,ph);
      ctx.fillRect(px-pw/2,py+ph*0.28-2,pw,4); ctx.strokeRect(px-pw/2,py+ph*0.28-2,pw,4);
      ctx.fillStyle='#FFD700'; ctx.beginPath(); ctx.ellipse(px-4,py-2,4,3,-0.5,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(px+4,py-2,4,3,0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFEE44'; ctx.beginPath(); ctx.arc(px,py,3,0,Math.PI*2); ctx.fill();
    });
  }
}
