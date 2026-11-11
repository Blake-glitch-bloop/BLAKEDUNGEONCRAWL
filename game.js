(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const floors = [
    ['The Forgotten Halls', 'THE MOSS GUARDIAN', '#93aa70', '#243a2c'],
    ['Mosswood Depths', 'THE ROOT WARDEN', '#89b8a1', '#213d35'],
    ['Ember Hollow', 'THE EMBER KNIGHT', '#d4996e', '#3b3029'],
    ['Crystal Keep', 'THE CRYSTAL SENTINEL', '#a7a4d2', '#2c3044'],
    ['The Last Lantern', 'THE HOLLOW KING', '#d6bb72', '#39372b']
  ];
  const words = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
  let W = 1000, H = 650, state = 'menu', floor = 0, hp = 5, best = 0;
  let player, enemies = [], particles = [], drops = [], slashes = [], exitOpen = false;
  let clock = 0, attackTime = 0, attackHeld = false, last = 0, toastTime = 0;
  let soundOn = false, audioContext, movePointer = null, attackPointer = null;
  const keys = new Set(), stick = {x: 0, y: 0};
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { best = Math.min(5, Math.max(0, Number(localStorage.getItem('pocket-dungeon-best')) || 0)); } catch (_) { /* Private browsing may disable storage. */ }
  function showBest() { $('best-run').textContent = best ? (best === 5 ? 'All 5 floors explored' : `Floor ${String(best).padStart(2, '0')} reached`) : 'A fresh beginning'; }
  showBest();
  function record() { best = Math.max(best, floor + 1); showBest(); try { localStorage.setItem('pocket-dungeon-best', String(best)); } catch (_) {} }
  function random(seed) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function resetInput() { keys.clear(); stick.x = stick.y = 0; attackHeld = false; movePointer = attackPointer = null; $('joystick-knob').style.transform = ''; $('attack-button').classList.remove('active'); }
  function resize() {
    const box = $('viewport').getBoundingClientRect(), oldW = W, oldH = H;
    W = box.width < 600 ? 560 : 1000; H = Math.round(W * box.height / box.width);
    canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
    if (player) { player.x *= W / oldW; player.y *= H / oldH; }
    for (const e of enemies) { e.x *= W / oldW; e.y *= H / oldH; }
    for (const d of drops) { d.x *= W / oldW; d.y *= H / oldH; }
  }
  new ResizeObserver(resize).observe($('viewport'));
  function setupFloor() {
    resetInput(); exitOpen = false; particles = []; drops = []; slashes = [];
    player = {x: W * .5, y: H * .68, r: 16, dir: -Math.PI / 2, inv: 1.5, walk: 0};
    enemies = Array.from({length: 2 + floor}, (_, i) => ({x: W * (.23 + (i % 3) * .26), y: H * (.28 + Math.floor(i / 3) * .14), r: 18, hp: 2 + Math.floor(floor / 2), max: 2 + Math.floor(floor / 2), boss: false, speed: 34 + floor * 4, flash: 0, phase: 'chase', timer: 0}));
    enemies.push({x: W * .7, y: H * .36, r: 33, hp: 10 + floor * 3, max: 10 + floor * 3, boss: true, speed: 29 + floor * 3, flash: 0, phase: 'sleep', timer: 1.5, dx: 0, dy: 0});
    $('floor-number').textContent = String(floor + 1).padStart(2, '0');
    $('floor-label').textContent = `FLOOR ${words[floor]}`;
    $('floor-name').textContent = floors[floor][0]; $('boss-name').textContent = floors[floor][1];
    $('boss-hud').hidden = false; $('boss-health').style.width = '100%';
    $('scene-status').textContent = 'CLEAR THE HALLS';
    $('game-hint').textContent = 'Clear the slimes. Wake the guardian.';
    document.querySelectorAll('.floor-step').forEach((el, i) => { el.classList.toggle('current', i === floor); el.classList.toggle('complete', i < floor); el.querySelector('.step-icon').textContent = i < floor ? '✓' : `0${i + 1}`; });
    health(); record();
  }
  function health() { $('health').textContent = Array.from({length:5}, (_,i) => i < hp ? '♥' : '♡').join(' '); $('health').setAttribute('aria-label', `${hp} of 5 health`); }
  function toast(text) { $('toast').textContent = text; $('toast').classList.add('visible'); toastTime = 3.5; }
  function showMessage(label, title, text, button) { $('start-content').hidden = true; $('message-content').hidden = false; $('message-label').textContent = label; $('message-title').textContent = title; $('message-text').textContent = text; $('resume-button').textContent = button; $('overlay').hidden = false; $('viewport').classList.remove('playing'); resetInput(); }
  function play() { state = 'playing'; $('overlay').hidden = true; $('viewport').classList.add('playing'); $('pause-button').disabled = false; $('pause-button').textContent = 'Ⅱ'; $('pause-button').setAttribute('aria-label', 'Pause game'); }
  function start() { floor = 0; hp = 5; setupFloor(); play(); tone(440, .1, 'triangle', .035); toast('Move with the joystick. Hold the sword to attack.'); }
  function pause() { if (state !== 'playing' && state !== 'paused') return; if (state === 'paused') { play(); return; } state = 'paused'; showMessage('TAKE A BREATHER', 'Adventure paused.', 'Your dungeon will be right here.', 'Keep adventuring →'); $('pause-button').textContent = '▷'; $('pause-button').setAttribute('aria-label', 'Resume game'); }
  $('start-button').addEventListener('click', start);
  $('resume-button').addEventListener('click', () => { if (state === 'paused') play(); else if (state === 'between') { floor++; hp = Math.min(5, hp + 2); setupFloor(); play(); toast('Two hearts restored. A new guardian awaits.'); } else start(); });
  $('pause-button').addEventListener('click', pause);
  $('help-button').addEventListener('click', () => { if (state === 'playing') pause(); $('help-dialog').showModal(); });
  $('close-help').addEventListener('click', () => $('help-dialog').close()); $('got-it').addEventListener('click', () => $('help-dialog').close());
  $('help-dialog').addEventListener('click', e => { if (e.target === $('help-dialog')) { const b = e.target.getBoundingClientRect(); if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) e.target.close(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pause(); });
  window.addEventListener('blur', () => { resetInput(); if (state === 'playing') pause(); });
  window.addEventListener('keydown', e => {
    if (!$('help-dialog').open && state === 'playing') {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    }
    if ($('help-dialog').open) return;
    if (e.code === 'Escape' || e.code === 'KeyP') { if (!e.repeat) pause(); return; }
    if (state !== 'playing') return;
    if (e.code === 'Space') e.preventDefault();
    keys.add(e.code);
  });
  window.addEventListener('keyup', e => keys.delete(e.code));
  const joystick = $('joystick');
  function moveStick(e) { const r = joystick.getBoundingClientRect(); let x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2; const max = r.width * .32, len = Math.hypot(x,y); if (len > max) { x *= max / len; y *= max / len; } stick.x = x / max; stick.y = y / max; $('joystick-knob').style.transform = `translate(${x}px,${y}px)`; }
  joystick.addEventListener('pointerdown', e => { if (state !== 'playing' || movePointer !== null) return; e.preventDefault(); movePointer = e.pointerId; joystick.setPointerCapture(e.pointerId); moveStick(e); });
  joystick.addEventListener('pointermove', e => { if (e.pointerId === movePointer) moveStick(e); });
  function endStick(e) { if (e.pointerId !== movePointer) return; movePointer = null; stick.x = stick.y = 0; $('joystick-knob').style.transform = ''; }
  joystick.addEventListener('pointerup', endStick); joystick.addEventListener('pointercancel', endStick); joystick.addEventListener('lostpointercapture', endStick);
  $('attack-button').addEventListener('pointerdown', e => { if (state !== 'playing') return; e.preventDefault(); attackPointer = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); attackHeld = true; e.currentTarget.classList.add('active'); });
  function endAttack(e) { if (e.pointerId !== attackPointer) return; attackHeld = false; attackPointer = null; $('attack-button').classList.remove('active'); }
  ['pointerup','pointercancel','lostpointercapture'].forEach(t => $('attack-button').addEventListener(t, endAttack));
  $('attack-button').addEventListener('click', e => { if (e.detail === 0 && state === 'playing') attack(); });
  $('sound-button').addEventListener('click', () => { soundOn = !soundOn; $('sound-button').setAttribute('aria-pressed', String(soundOn)); $('sound-button').setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on'); $('sound-label').textContent = soundOn ? 'Sound on' : 'Sound off'; if (soundOn) tone(660,.12,'sine',.03); });
  function tone(freq, duration = .08, type = 'square', volume = .025) { if (!soundOn) return; try { audioContext ||= new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); const osc = audioContext.createOscillator(), gain = audioContext.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq,audioContext.currentTime); osc.frequency.exponentialRampToValueAtTime(freq*.55,audioContext.currentTime+duration); gain.gain.setValueAtTime(volume,audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration); osc.connect(gain); gain.connect(audioContext.destination); osc.start(); osc.stop(audioContext.currentTime+duration); } catch (_) {} }
  function burst(x,y,color,n=12) { if (reducedMotion) n = 3; for (let i=0;i<n;i++) { const a=Math.random()*Math.PI*2,s=25+Math.random()*85; particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.3+Math.random()*.5,max:.8,color}); } }
  function attack() {
    if (attackTime > 0 || state !== 'playing') return;
    attackTime = .34; tone(210,.08,'triangle',.05);
    let nearest = null, dist = 140;
    for (const e of enemies) { const d=Math.hypot(e.x-player.x,e.y-player.y); if(e.hp>0 && e.phase!=='sleep' && d<dist){dist=d;nearest=e;} }
    if (nearest) player.dir=Math.atan2(nearest.y-player.y,nearest.x-player.x);
    slashes.push({x:player.x,y:player.y,a:player.dir,life:.2});
    for (const e of enemies) {
      if (e.hp<=0 || e.phase==='sleep') continue;
      const dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
      if (d < 90+e.r && Math.cos(a-player.dir)>-.15) {
        e.hp-=2; e.flash=.15; burst(e.x,e.y,floors[floor][2],7);
        if(!e.boss){e.x+=dx/(d||1)*17;e.y+=dy/(d||1)*17;}
        if(e.hp<=0){burst(e.x,e.y,e.boss?'#e9cf83':'#a8c17e',e.boss?30:13);tone(e.boss?420:330,.15,'triangle',.04);if(!e.boss && Math.random()<.4)drops.push({x:e.x,y:e.y});}
      }
    }
    const boss=enemies.find(e=>e.boss); $('boss-health').style.width=`${Math.max(0,boss.hp/boss.max)*100}%`;
    if(boss.hp<=0 && !exitOpen){exitOpen=true;$('scene-status').textContent='THE WAY IS OPEN';$('game-hint').textContent='Walk into the glowing stairs at the top.';toast('Guardian defeated! Find the glowing stairs.');}
  }
  function update(dt) {
    clock+=dt;
    if (toastTime>0) { toastTime-=dt; if(toastTime<=0)$('toast').classList.remove('visible'); }
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;} particles=particles.filter(p=>p.life>0);
    slashes.forEach(s=>s.life-=dt);slashes=slashes.filter(s=>s.life>0);
    if(state!=='playing')return;
    attackTime-=dt;player.inv-=dt;
    let x=stick.x+(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),y=stick.y+(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
    const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}
    if(len>.12){const speed=W<700?172:205;player.x+=x*speed*dt;player.y+=y*speed*dt;player.dir=Math.atan2(y,x);player.walk+=dt*12;}else player.walk=0;
    player.x=Math.max(66,Math.min(W-66,player.x));player.y=Math.max(85,Math.min(H-75,player.y));
    if(attackHeld||keys.has('Space'))attack();
    const boss=enemies.find(e=>e.boss);
    if(boss.phase==='sleep' && enemies.filter(e=>!e.boss&&e.hp>0).length===0){boss.phase='chase';boss.timer=1.7;toast('The guardian has awakened. Dodge its charge!');$('scene-status').textContent='DEFEAT THE GUARDIAN';$('game-hint').textContent='Red glow means a charge. Dodge, then strike.';}
    for(const e of enemies){
      if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);
      if(e.phase==='sleep')continue;
      const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;
      if(e.boss){e.timer-=dt;if(e.phase==='chase' && e.timer<0){e.phase='windup';e.timer=.95;e.dx=dx/d;e.dy=dy/d;}else if(e.phase==='windup'&&e.timer<0){e.phase='charge';e.timer=.52;tone(100,.15,'sawtooth',.025);}else if(e.phase==='charge'&&e.timer<0){e.phase='rest';e.timer=1.05;}else if(e.phase==='rest'&&e.timer<0){e.phase='chase';e.timer=2.1;}}
      if(e.phase==='chase'){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt;}else if(e.phase==='charge'){e.x+=e.dx*330*dt;e.y+=e.dy*330*dt;}
      e.x=Math.max(67,Math.min(W-67,e.x));e.y=Math.max(95,Math.min(H-75,e.y));
      if(d<e.r+player.r && player.inv<=0){hp--;health();player.inv=1.3;burst(player.x,player.y,'#da9e7c',8);tone(95,.18,'sawtooth',.035);player.x-=dx/d*25;player.y-=dy/d*25;if(hp<=0){state='dead';$('pause-button').disabled=true;showMessage('EVERY HERO STARTS SOMEWHERE','A brave little run.',`You reached floor ${floor+1}. Take a breath, then try again.`,'Try a new adventure →');return;}}
    }
    drops=drops.filter(d=>{if(Math.hypot(d.x-player.x,d.y-player.y)<30){hp=Math.min(5,hp+1);health();tone(600,.1,'sine',.025);return false;}return true;});
    if(exitOpen&&Math.hypot(player.x-W/2,player.y-100)<42){$('pause-button').disabled=true;if(floor===4){state='won';showMessage('FIVE FLOORS. ONE LITTLE HERO.','Light at the end.', 'You conquered the dungeon. The world can wait a little longer.', 'One more adventure →');tone(880,.4,'triangle',.04);}else{state='between';showMessage('GUARDIAN DEFEATED', 'A little deeper?',`${floors[floor+1][0]} awaits. Take two hearts for the journey.`,'Descend to the next floor ↓');}}
  }
  // Original pixel sprites are drawn locally: no image downloads or asset loading.
  const hero = [
    '.....aaaaa......','....abbbbba.....','...abbbbb b.....','...abbbbbba.....','....cccccc......','....cddcdd......','.....cccc.......','...eeffffee.....','..eeffffffee....','..e.ffffff.e....','..c.ffggff.c....','....gggggg......','....ffggff......','....hh..hh......','...hhh..hhh.....'
  ];
  const heroColors={a:'#a8b8b1',b:'#d0d5bd',c:'#cfac82',d:'#323b30',e:'#b6b19b',f:'#708a7a',g:'#8c7147',h:'#444c43'};
  function sprite(rows,colors,x,y,s){const width=Math.max(...rows.map(r=>r.length));rows.forEach((row,j)=>[...row].forEach((c,i)=>{if(colors[c]){ctx.fillStyle=colors[c];ctx.fillRect(Math.round(x-width*s/2+i*s),Math.round(y-rows.length*s+j*s),s,s);}}));}
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.floor(x),Math.floor(y),Math.ceil(w),Math.ceil(h));}
  function shadow(x,y,r){ctx.fillStyle='#07120c66';ctx.beginPath();ctx.ellipse(x,y,r,r*.36,0,0,Math.PI*2);ctx.fill();}
  function torch(x,y,t){rect(x-5,y,10,23,'#252c20');rect(x-7,y-2,14,7,'#6e6140');const flicker=reducedMotion?0:Math.sin(t*9+x)*2;const glow=ctx.createRadialGradient(x,y-12,2,x,y-12,92);glow.addColorStop(0,'#e6ac3a43');glow.addColorStop(1,'#e6ac3a00');ctx.fillStyle=glow;ctx.fillRect(x-92,y-104,184,184);rect(x-6,y-22+flicker,12,22-flicker,'#b87d3f');rect(x-3,y-27-flicker,7,23+flicker,'#e5b95e');rect(x-2,y-16,4,11,'#ffe09b');}
  function pillar(x,y){shadow(x+17,y+49,37);rect(x-2,y+25,43,22,'#182b22');rect(x,y-42,37,82,'#344438');rect(x+5,y-40,7,78,'#42503f');rect(x+28,y-40,9,78,'#27372e');rect(x-5,y-49,47,13,'#48523e');rect(x-5,y+35,47,13,'#394b37');rect(x-3,y+46,43,5,'#172b21');rect(x+8,y-15,14,3,'#28392d');for(let i=0;i<5;i++)rect(x+random(x+i)*32,y-43+random(i+x)*70,4,6,'#496044');}
  function drawRoom(){
    ctx.fillStyle=floors[floor][3];ctx.fillRect(0,0,W,H);
    const tile=42;
    for(let y=0;y<H;y+=tile)for(let x=0;x<W;x+=tile){const r=random(x+y*97+floor*37);rect(x+1,y+1,tile-2,tile-2,r>.73?'#344536':r>.38?'#2c3e31':'#293b2f');rect(x+2,y+2,tile-4,2,'#53604425');if(r>.7){rect(x+10,y+17,10,2,'#1b2f24');rect(x+18,y+18,2,7,'#1b2f24');}if(r<.14){rect(x+17,y+13,3,2,'#526345');rect(x+20,y+23,4,2,'#203728');}}
    // Broad masonry border, with staggered blocks and recessed mortar.
    for(let row=0;row<3;row++)for(let x=-50;x<W+60;x+=82){const off=row%2?41:0;rect(x+off+1,row*22,79,20,row===2?'#364738':'#26392d');rect(x+off+3,row*22+1,75,3,'#52604440');}
    rect(0,64,W,7,'#172a20');rect(0,H-48,W,48,'#15291f');rect(0,H-48,W,5,'#40533a');rect(0,65,38,H-110,'#1d3226');rect(W-38,65,38,H-110,'#1b3025');rect(35,65,5,H-110,'#52644555');rect(W-41,65,5,H-110,'#52644555');
    // Stairwell and arch at the far wall.
    const gateX=W/2;rect(gateX-44,15,88,78,'#16281e');rect(gateX-51,28,10,67,'#4a5640');rect(gateX+41,28,10,67,'#4a5640');rect(gateX-34,7,68,10,'#4a5640');rect(gateX-43,17,86,10,'#46553d');
    if(exitOpen){const g=ctx.createRadialGradient(gateX,89,0,gateX,89,95);g.addColorStop(0,'#e3d28b66');g.addColorStop(1,'#c8d58400');ctx.fillStyle=g;ctx.fillRect(gateX-95,0,190,184);for(let i=0;i<5;i++)rect(gateX-32-i*2,36+i*12,64+i*4,6,'#b3b27a');rect(gateX-5,95,10,5,'#e5d998');}else{for(let i=-2;i<=2;i++)rect(gateX+i*13-3,31,6,57,'#5b6548');rect(gateX-35,57,70,6,'#6a6d49');}
    torch(W*.19,57,clock);torch(W*.81,57,clock+1);torch(27,H*.52,clock+2);torch(W-27,H*.52,clock+3);
    pillar(66,135);pillar(W-105,135);pillar(66,H-128);pillar(W-105,H-128);
    // Moss, loose stones, lantern-lit plants and small wall relics.
    for(let i=0;i<36;i++){const x=i%2?W-45-random(i+11)*30:38+random(i+2)*30,y=90+random(i+5)*(H-160);rect(x,y,4+random(i)*7,3,'#55714366');rect(x+3,y-5,3,8,'#5b774955');}
    for(let i=0;i<19;i++){const x=60+random(i+39)*(W-120),y=95+random(i+66)*(H-180);if(Math.abs(x-W/2)<60&&y<160)continue;rect(x,y,3+random(i)*5,3,'#68705450');}
    if(state==='menu'){for(let i=0;i<4;i++){const x=W*(i%2?.84:.16),y=H*(i<2?.36:.69);drawSlime({x,y,hp:2,max:2,flash:0},true);}drawHero({x:W*.5,y:H*.79,walk:0,inv:0,dir:-1.5});}
  }
  function drawHero(p){if(p.inv>0&&Math.floor(clock*12)%2===0&&state==='playing')ctx.globalAlpha=.5;shadow(p.x,p.y+4,19);sprite(hero,heroColors,p.x,p.y+Math.sin(p.walk)*2,3);const dx=Math.cos(p.dir),dy=Math.sin(p.dir);rect(p.x+dx*22-2,p.y-19+dy*12,5,22,'#a4b4a9');rect(p.x+dx*22-5,p.y+dy*12,11,4,'#c2a46c');rect(p.x-25,p.y-23,11,21,'#506c65');rect(p.x-23,p.y-21,6,15,'#9aaf98');ctx.globalAlpha=1;}
  function drawSlime(e,decor=false){const b=reducedMotion?0:Math.sin(clock*4+e.x)*2;shadow(e.x,e.y+3,23);const color=e.flash?'#f5e4b6':floors[floor][2];rect(e.x-23,e.y-21+b,46,20-b,'#344c32');rect(e.x-19,e.y-29+b,38,25,color);rect(e.x-12,e.y-34+b,24,7,color);rect(e.x-13,e.y-26+b,9,5,'#d9e2a077');rect(e.x-12,e.y-15+b,5,6,'#213327');rect(e.x+8,e.y-15+b,5,6,'#213327');if(!decor&&e.hp<e.max){rect(e.x-19,e.y-45,38,3,'#17281b');rect(e.x-19,e.y-45,38*e.hp/e.max,3,'#c1c68e');}}
  function drawBoss(e){
    shadow(e.x,e.y+8,44);const sleeping=e.phase==='sleep',warn=e.phase==='windup';
    if(warn){ctx.strokeStyle='#d8846266';ctx.lineWidth=48;ctx.beginPath();ctx.moveTo(e.x,e.y);ctx.lineTo(e.x+e.dx*180,e.y+e.dy*180);ctx.stroke();ctx.strokeStyle='#e9a47c';ctx.lineWidth=2;ctx.beginPath();ctx.arc(e.x,e.y,53+Math.sin(clock*20)*3,0,Math.PI*2);ctx.stroke();}
    const c=e.flash?'#f5e4b6':warn?'#b47758':sleeping?'#53694c':floors[floor][2];
    rect(e.x-35,e.y-48,70,47,'#283c2c');rect(e.x-28,e.y-66,56,63,c);rect(e.x-36,e.y-51,16,38,c);rect(e.x+20,e.y-51,16,38,c);rect(e.x-18,e.y-80,36,26,c);rect(e.x-27,e.y-83,8,20,'#a7a381');rect(e.x+19,e.y-83,8,20,'#a7a381');rect(e.x-19,e.y-6,14,13,'#3a4a36');rect(e.x+5,e.y-6,14,13,'#3a4a36');rect(e.x-22,e.y-48,44,3,'#344b34');rect(e.x-4,e.y-41,8,15,'#d1b778');rect(e.x-12,e.y-66,7,sleeping?2:6,sleeping?'#304330':'#f8db91');rect(e.x+6,e.y-66,7,sleeping?2:6,sleeping?'#304330':'#f8db91');
    if(sleeping){ctx.fillStyle='#acb893';ctx.font='11px monospace';ctx.textAlign='center';ctx.fillText('DORMANT',e.x,e.y-100);}
  }
  function draw(){
    ctx.clearRect(0,0,W,H);drawRoom();
    // Dust motes drift in the light, with a static fallback for reduced motion.
    for(let i=0;i<24;i++){const x=random(i+90)*W,y=(random(i+42)*H+(reducedMotion?0:clock*(3+random(i)*6)))%H;ctx.globalAlpha=.12+random(i+50)*.22;rect(x,y,2,2,'#d9c88d');}ctx.globalAlpha=1;
    if(state!=='menu'&&player){
      for(const d of drops){shadow(d.x,d.y+6,10);ctx.fillStyle='#e0a487';ctx.font='24px Georgia';ctx.textAlign='center';ctx.fillText('♥',d.x,d.y+Math.sin(clock*3)*3);}
      const actors=[...enemies.filter(e=>e.hp>0),{...player,isPlayer:true}].sort((a,b)=>a.y-b.y);for(const a of actors){if(a.isPlayer)drawHero(a);else if(a.boss)drawBoss(a);else drawSlime(a);}
      for(const s of slashes){ctx.save();ctx.translate(s.x,s.y-15);ctx.rotate(s.a);ctx.globalAlpha=s.life/.2;ctx.strokeStyle='#f5dfaa';ctx.lineWidth=7;ctx.beginPath();ctx.arc(0,0,65,-1.1,1.1);ctx.stroke();ctx.strokeStyle='#ece9c478';ctx.lineWidth=14;ctx.beginPath();ctx.arc(0,0,58,-1.1,1.1);ctx.stroke();ctx.restore();}
    }
    for(const p of particles){ctx.globalAlpha=Math.min(1,p.life*2);rect(p.x,p.y,4,4,p.color);}ctx.globalAlpha=1;
    // Subtle edge shadow keeps the room atmospheric without hiding play.
    const gradient=ctx.createRadialGradient(W/2,H*.46,W*.15,W/2,H*.5,Math.max(W,H)*.7);gradient.addColorStop(0,'#08180e00');gradient.addColorStop(1,'#08180e9c');ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  }
  function loop(time){const dt=Math.min(.04,(time-last)/1000||0);last=time;update(dt);draw();requestAnimationFrame(loop);}
  resize();requestAnimationFrame(loop);
})();
