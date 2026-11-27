// Big 2D shots: rooftop run + leap, street explosion, silence, title.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { flicker, fbm } from '../lib/noise';
import { useThaiFont } from '../lib/typography';
import { Cnv, clamp, easeOut, glow, impact, lerp, prng, rain, smooth, splashes, streak, tower } from './fx';
import { divePose, drawFigure, joints, leapPose, runPose } from './figure';

/* ---------- 6. ROOF: run, leap the gap in slow motion, lightning at the apex ---------- */
const remap = (f: number, a: number, b: number, slow: number) => (f < a ? f : f < b ? a + (f - a) * slow : a + (b - a) * slow + (f - b));
let skyCache: HTMLCanvasElement | null = null;
const skyline = (w: number, h: number) => {
  if (skyCache) return skyCache;
  const c = document.createElement('canvas'); c.width = w * 2; c.height = h; const x = c.getContext('2d')!; const r = prng(42);
  const layers: [number, string, number, [number, number], number][] = [[0.6, '#141b2c', 260, [2, 3], 0.6], [0.66, '#0d1322', 380, [3, 4], 0.85], [0.72, '#080c16', 520, [4, 6], 1]];
  layers.forEach(([base, col, maxH, win, light], li) => {
    let px = -20;
    while (px < c.width) { const bw = 40 + r() * (70 + li * 50), bh = 80 + Math.pow(r(), 1.8) * maxH; tower(x, px, h * base, bw, bh, r, { body: col, win, lit: 0.22, light }); px += bw + r() * 14; }
    // haze between layers (city glow)
    const g = x.createLinearGradient(0, h * base - 200, 0, h * base); g.addColorStop(0, 'rgba(60,50,70,0)'); g.addColorStop(1, `rgba(110,80,90,${0.28 - li * 0.07})`); x.fillStyle = g; x.fillRect(0, h * base - 200, c.width, 200);
  });
  skyCache = c; return c;
};

export const Roof: React.FC = () => {
  const family = useThaiFont('Kanit');
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#03050a' }}>
      <Cnv draw={(ctx, w, h) => {
        const t = remap(f, 34, 66, 0.28); // slow motion over the leap
        const speed = 24; // px per t
        const hx = 300 + t * speed;
        const gapA = 300 + 44 * speed, gapB = gapA + 380;
        const leapT = clamp((t - 42) / ((gapB + 80 - gapA) / speed));
        const inLeap = t >= 42 && leapT < 1;
        const camX = hx - w * 0.38;
        const bolt = impact(f, [50], 3) + impact(f, [53], 4) * 0.6;
        const L = 1 + bolt * 2.2;
        const ground = h * 0.72;
        // sky with clouds lit by the bolt
        const sg = ctx.createLinearGradient(0, 0, 0, h); sg.addColorStop(0, `rgb(${8 + 70 * bolt},${12 + 80 * bolt},${28 + 110 * bolt})`); sg.addColorStop(1, '#0a0f1c'); ctx.fillStyle = sg; ctx.fillRect(0, 0, w, h);
        const cr = prng(2);
        for (let i = 0; i < 40; i++) { const x = ((cr() * w * 2 - camX * 0.05 + f * 0.6) % (w * 1.4)) - 100, y = cr() * h * 0.35; ctx.fillStyle = `rgba(${40 + 160 * bolt},${50 + 170 * bolt},${80 + 175 * bolt},${0.08 + cr() * 0.1})`; ctx.beginPath(); ctx.ellipse(x, y, 200 + cr() * 300, 40 + cr() * 60, 0, 0, Math.PI * 2); ctx.fill(); }
        if (bolt > 0.3) { // forked bolt
          const q = prng(Math.floor(f / 2) + 5); let x = w * 0.72, y = 0; ctx.strokeStyle = `rgba(230,240,255,${bolt})`; ctx.lineWidth = 4; ctx.shadowColor = '#bcd8ff'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.moveTo(x, y);
          while (y < h * 0.55) { x += (q() - 0.5) * 80; y += 20 + q() * 40; ctx.lineTo(x, y); if (q() > 0.85) { ctx.moveTo(x, y); ctx.lineTo(x + (q() - 0.5) * 200, y + 80); ctx.moveTo(x, y); } } ctx.stroke(); ctx.shadowBlur = 0;
        }
        // far skyline (parallax 0.15)
        const sk = skyline(w, h); const ox = -((camX * 0.15) % w);
        ctx.globalAlpha = 0.9; ctx.drawImage(sk, ox, -40); ctx.drawImage(sk, ox + sk.width, -40); ctx.globalAlpha = 1;
        // giant billboard tower (parallax 0.4)
        const bx = 1250 - camX * 0.4, fl = flicker(f, 7, 0.35, 10);
        ctx.fillStyle = '#05070c'; ctx.fillRect(bx - 40, 120, 760, h);
        ctx.fillStyle = `rgba(255,30,110,${0.12 + 0.2 * fl})`; ctx.fillRect(bx, 170, 680, 330);
        ctx.save(); ctx.shadowColor = '#ff2a7a'; ctx.shadowBlur = 50 * fl; ctx.font = `800 150px ${family}`; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,${120 + 100 * fl},${180 + 60 * fl},${0.4 + 0.6 * fl})`; ctx.fillText('ไม่มีวันหลับ', bx + 340, 380); ctx.restore();
        ctx.strokeStyle = `rgba(80,220,255,${0.6 * fl})`; ctx.lineWidth = 6; ctx.strokeRect(bx + 10, 180, 660, 310);
        ctx.globalCompositeOperation = 'lighter'; glow(ctx, bx + 340, 335, 700, '255,40,120', 0.22 * fl); ctx.globalCompositeOperation = 'source-over';
        // pursuers' flashlights from behind
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 2; i++) { const sx = -80 + i * 140, sy = ground - 160 - i * 40, a = -0.25 + Math.sin(f / 9 + i * 2) * 0.22; const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a) * 1400, sy + Math.sin(a) * 1400); g.addColorStop(0, 'rgba(255,250,220,0.35)'); g.addColorStop(1, 'rgba(255,250,220,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a - 0.09) * 1500, sy + Math.sin(a - 0.09) * 1500); ctx.lineTo(sx + Math.cos(a + 0.09) * 1500, sy + Math.sin(a + 0.09) * 1500); ctx.closePath(); ctx.fill(); glow(ctx, sx, sy, 90, '255,250,220', 0.6); streak(ctx, sx, sy, 500, '160,190,255', 0.5, 3); }
        ctx.globalCompositeOperation = 'source-over';
        // rooftops (parallax 1) with the gap
        const toScreen = (x: number) => x - camX;
        const roof = (x0: number, x1: number, seed: number) => {
          const a = toScreen(x0), b = toScreen(x1); if (b < -50 || a > w + 50) return;
          ctx.fillStyle = `rgb(${8 + 30 * bolt},${10 + 34 * bolt},${16 + 45 * bolt})`; ctx.fillRect(a, ground, b - a, h - ground);
          ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.fillRect(a, ground - 2, b - a, 3);
          const q = prng(seed);
          for (let x = x0 + 60; x < x1 - 100; x += 160 + q() * 260) { const s = toScreen(x), kind = q(); ctx.fillStyle = `rgb(${5 + 25 * bolt},${6 + 28 * bolt},${10 + 36 * bolt})`; if (kind < 0.4) { ctx.fillRect(s, ground - 70, 110, 70); ctx.strokeStyle = 'rgba(90,110,140,0.4)'; ctx.beginPath(); ctx.arc(s + 55, ground - 35, 24, 0, Math.PI * 2); ctx.stroke(); } else if (kind < 0.7) { ctx.fillRect(s, ground - 210, 90, 140); ctx.fillRect(s + 8, ground - 70, 6, 70); ctx.fillRect(s + 76, ground - 70, 6, 70); } else { ctx.fillRect(s, ground - 260, 5, 260); ctx.fillRect(s - 30, ground - 220, 65, 4); if (Math.floor(f / 10) % 2) { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(s - 2, ground - 266, 9, 9); } } }
          // puddles mirror the billboard
          ctx.globalCompositeOperation = 'lighter'; for (let x = x0 + 100; x < x1 - 200; x += 340) { const s = toScreen(x); ctx.fillStyle = `rgba(255,40,120,${0.08 * fl})`; ctx.beginPath(); ctx.ellipse(s, ground + 30, 120, 10, 0, 0, Math.PI * 2); ctx.fill(); } ctx.globalCompositeOperation = 'source-over';
        };
        roof(camX - 400, gapA, 3);
        roof(gapB, gapB + 4000, 9);
        // the drop between buildings, street far below
        const ga = toScreen(gapA), gb = toScreen(gapB);
        if (gb > 0 && ga < w) { ctx.fillStyle = '#010204'; ctx.fillRect(ga, ground, gb - ga, h); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const q = prng(70 + i); const y = h - 30 + q() * 30, x = ga + ((q() * (gb - ga) + f * (q() > 0.5 ? 6 : -6)) % (gb - ga)); glow(ctx, x, y, 14, q() > 0.5 ? '255,230,180' : '255,40,40', 0.8); } ctx.globalCompositeOperation = 'source-over'; }
        // the courier
        let hy = ground - 1.8 * 90, pose = runPose((t / 17) * Math.PI * 2);
        if (inLeap) { hy -= Math.sin(leapT * Math.PI) * 190; pose = leapPose(leapT); }
        else hy -= Math.abs(Math.sin((t / 17) * Math.PI * 2)) * 10;
        const jn = joints(pose, toScreen(hx), hy, 90, 1);
        drawFigure(ctx, jn, f, { rim: `rgba(${140 + 115 * bolt},${200 + 55 * bolt},255,0.95)`, light: [-1, -0.5], rimW: 3 + bolt * 3 });
        // feet splashes when running
        if (!inLeap) splashes(ctx, w, ground + 2, ground + 18, f, { count: 18, seed: 21, scale: 1.1 });
        // foreground pipes rushing past (parallax 1.6), blurred
        ctx.filter = 'blur(10px)'; ctx.fillStyle = '#000';
        for (let i = 0; i < 4; i++) { const x = ((i * 900 - camX * 1.6) % (w + 900) + w + 900) % (w + 900) - 300; ctx.fillRect(x, 0, 60, h); ctx.fillRect(x - 200, h - 120, 400, 40); }
        ctx.filter = 'none';
        rain(ctx, w, h, f, { count: 1100, speed: 75, alpha: 0.45 + bolt * 0.4, angle: 0.25 });
        if (bolt > 0) { ctx.fillStyle = `rgba(210,225,255,${bolt * 0.35})`; ctx.fillRect(0, 0, w, h); }
      }} />
    </AbsoluteFill>
  );
};

/* ---------- 11. BLAST: the car behind her goes up, she dives at camera ---------- */
export const Blast: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Cnv draw={(ctx, w, h) => {
        const hit = 6;
        const t = f < hit + 6 ? f : hit + 6 + (f - hit - 6) * 0.38; // slow motion right after the blast
        const a = Math.max(0, t - hit); // age of the blast
        const k = f >= hit ? Math.exp(-a / 10) : 0;
        const ex = w * 0.62, ey = h * 0.62;
        // street: sky, buildings lit by the fire
        ctx.fillStyle = `rgb(${10 + 120 * k},${10 + 50 * k},${16 + 10 * k})`; ctx.fillRect(0, 0, w, h);
        const br = prng(4);
        for (let x = -60; x < w + 100;) { const bw = 70 + br() * 120, bh = 180 + br() * 260; tower(ctx, x, ey - 120, bw, bh, br, { body: '#0a0c14', win: [3, 4], lit: 0.25, light: 0.8 }); x += bw + br() * 10; }
        for (let x = -40; x < w + 100;) { const bw = 140 + br() * 220, bh = 260 + br() * 380, fire = 1 - Math.min(1, Math.abs(x + bw / 2 - ex) / w); tower(ctx, x, ey, bw, bh, br, { body: `rgb(${14 + 90 * k * fire},${11 + 34 * k * fire},${16 + 6 * k})`, side: `rgba(0,0,0,${0.55 - 0.25 * k * fire})`, win: [7, 10], lit: 0.22, light: 1 - 0.4 * k }); x += bw + 6; }
        { ctx.globalCompositeOperation = 'lighter'; const fl = ctx.createRadialGradient(ex, ey - 100, 50, ex, ey - 100, 1100); fl.addColorStop(0, `rgba(255,140,60,${0.35 * k})`); fl.addColorStop(1, 'rgba(255,140,60,0)'); ctx.fillStyle = fl; ctx.fillRect(0, 0, w, ey); ctx.globalCompositeOperation = 'source-over'; }
        ctx.fillStyle = '#07070a'; ctx.fillRect(0, ey, w, h - ey);
        // wet street reflects fire
        ctx.globalCompositeOperation = 'lighter'; const rg = ctx.createLinearGradient(0, ey, 0, h); rg.addColorStop(0, `rgba(255,120,40,${0.55 * k + 0.05})`); rg.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = rg; ctx.fillRect(ex - 700, ey, 1400, h - ey); ctx.globalCompositeOperation = 'source-over';
        // the car (before / as a burning frame after)
        ctx.fillStyle = '#050506'; ctx.beginPath(); ctx.moveTo(ex - 260, ey); ctx.lineTo(ex - 230, ey - 90); ctx.lineTo(ex - 120, ey - 150); ctx.lineTo(ex + 120, ey - 150); ctx.lineTo(ex + 220, ey - 90); ctx.lineTo(ex + 260, ey); ctx.closePath(); ctx.fill();
        if (f >= hit) {
          // smoke (behind fire)
          const sm = prng(8);
          for (let i = 0; i < 90; i++) { const b = sm() * 8, age = a - b; if (age <= 0) continue; const ang = -Math.PI / 2 + (sm() - 0.5) * 2.4, v = 6 + sm() * 14; const d = v * (1 - Math.exp(-age / 9)) * 9; const x = ex + Math.cos(ang) * d + fbm(age / 20 + i, 3) * 40, y = ey - 80 + Math.sin(ang) * d - age * 3.5; const r = 60 + age * 6 + sm() * 60; ctx.fillStyle = `rgba(${18 + 40 * k},${14 + 16 * k},${14},${clamp(0.75 - age / 120)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
          // fireball
          ctx.globalCompositeOperation = 'lighter';
          const fr = prng(9);
          for (let i = 0; i < 260; i++) { const b = fr() * 5, age = a - b; if (age <= 0) continue; const ang = -Math.PI / 2 + (fr() - 0.5) * 3.2, v = 10 + fr() * 30; const d = v * (1 - Math.exp(-age / 6)) * 7; const x = ex + Math.cos(ang) * d * 1.3, y = ey - 90 + Math.sin(ang) * d * 0.8 - age * 2; const life = clamp(1 - age / (28 + fr() * 30)); if (life <= 0) continue; const r = (40 + fr() * 70) * (0.6 + (1 - life) * 1.2); const heat = life * life; const col = heat > 0.6 ? '255,240,200' : heat > 0.3 ? '255,170,60' : '220,70,20'; glow(ctx, x, y, r, col, 0.22 * life + 0.1 * heat); }
          glow(ctx, ex, ey - 100, 900, '255,150,60', 0.6 * k);
          streak(ctx, ex, ey - 100, 1400, '255,170,90', 0.7 * k, 8);
          // shockwave ring
          const R = a * 70; if (a < 16) { ctx.strokeStyle = `rgba(255,230,200,${(1 - a / 16) * 0.6})`; ctx.lineWidth = 12 * (1 - a / 16) + 2; ctx.beginPath(); ctx.ellipse(ex, ey - 60, R, R * 0.55, 0, 0, Math.PI * 2); ctx.stroke(); }
          // sparks
          const sp = prng(13);
          for (let i = 0; i < 320; i++) { const ang = -Math.PI / 2 + (sp() - 0.5) * 3.4, v = 18 + sp() * 50, life = 20 + sp() * 40; if (a > life) continue; const x = ex + Math.cos(ang) * v * a * 0.9, y = ey - 90 + Math.sin(ang) * v * a * 0.9 + 0.9 * a * a; const vx = Math.cos(ang) * v, vy = Math.sin(ang) * v + 1.8 * a; const l = 0.5; ctx.strokeStyle = `rgba(255,${200 + sp() * 55},${120 + sp() * 80},${1 - a / life})`; ctx.lineWidth = 1.5 + sp() * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * l, y - vy * l); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over';
          // debris chunks
          const db = prng(17);
          ctx.fillStyle = '#060506';
          for (let i = 0; i < 40; i++) { const ang = -Math.PI / 2 + (db() - 0.5) * 2.8, v = 16 + db() * 36; const x = ex + Math.cos(ang) * v * a, y = ey - 90 + Math.sin(ang) * v * a + 1.2 * a * a; const s = 8 + db() * 26; ctx.save(); ctx.translate(x, y); ctx.rotate(a * (db() - 0.5) * 0.6); ctx.beginPath(); ctx.moveTo(-s, -s * 0.4); ctx.lineTo(s * 0.7, -s); ctx.lineTo(s, s * 0.5); ctx.lineTo(-s * 0.3, s); ctx.closePath(); ctx.fill(); ctx.restore(); }
        }
        // she dives toward camera-left, backlit
        const dt = clamp((t - 2) / 34);
        const s = lerp(150, 260, easeOut(dt, 2));
        const jn = joints(divePose(dt), lerp(w * 0.66, w * 0.2, easeOut(dt, 1.6)), lerp(h * 0.55, h * 0.5, dt) - Math.sin(dt * Math.PI) * 120, s, -1);
        drawFigure(ctx, jn, f, { rim: `rgba(255,${150 + 60 * k},80,1)`, light: [1, -0.3], rimW: 4 + 6 * k });
        // embers
        ctx.globalCompositeOperation = 'lighter'; const em = prng(55); for (let i = 0; i < 120; i++) { const x = (em() * w + Math.sin(f / 10 + i) * 30), y = (em() * h - a * (2 + em() * 4) + h * 2) % h; ctx.fillStyle = `rgba(255,${120 + em() * 100},40,${0.5 * em() * (f >= hit ? 1 : 0)})`; ctx.fillRect(x, y, 2 + em() * 3, 2 + em() * 3); } ctx.globalCompositeOperation = 'source-over';
        rain(ctx, w, h, f, { count: 500, speed: 50, alpha: 0.3, seed: 19, color: '255,200,160' });
      }} />
    </AbsoluteFill>
  );
};

/* ---------- 14. SILENCE ---------- */
export const Silence: React.FC = () => {
  const family = useThaiFont('Kanit');
  const f = useCurrentFrame();
  const beat = impact(f, [8, 20], 6);
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: family, fontWeight: 200, fontSize: 64, letterSpacing: '0.4em', color: '#e9edf3', opacity: smooth((f - 6) / 14) * (1 - smooth((f - 40) / 6)), transform: `scale(${1 + beat * 0.01})` }}>ถ้าพลาดขบวนนี้...</div>
    </AbsoluteFill>
  );
};

/* ---------- 15. TITLE ---------- */
export const Title: React.FC = () => {
  const family = useThaiFont('Kanit');
  const tech = useThaiFont('Chakra Petch');
  const f = useCurrentFrame();
  const end = f >= 96;
  const k = impact(f, [0], 10);
  const sweep = clamp((f - 40) / 26);
  if (end) {
    const e = f - 96;
    return (
      <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: family, fontWeight: 800, fontSize: 96, letterSpacing: '0.25em', color: '#f3f5f8', opacity: smooth(e / 8) }}>เร็วๆ นี้</div>
        <div style={{ fontFamily: tech, fontWeight: 500, fontSize: 30, letterSpacing: '0.8em', color: '#ff3b4f', marginTop: 20, opacity: smooth((e - 6) / 8) }}>ในโรงภาพยนตร์</div>
        <div style={{ position: 'absolute', bottom: 175, width: 1300, textAlign: 'center', fontFamily: tech, fontWeight: 300, fontSize: 17, lineHeight: 1.5, letterSpacing: '0.08em', color: 'rgba(200,205,215,0.55)', opacity: smooth((e - 12) / 10), transform: 'scaleY(1.25)' }}>
          ภาพยนตร์โดย สตูดิโอโค้ดล้วน · กำกับโดย คนเขียนโค้ด · นำแสดงโดย ดาว (ทุกเฟรมวาดด้วยโค้ด) · ภาพ ฝน ไฟ และเสียงทั้งหมดสร้างจากสูตรคณิตศาสตร์ · ไม่มีภาพจาก AI ไม่มีฟุตเทจ ไม่มีไฟล์เสียงสำเร็จรูป
        </div>
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Cnv draw={(ctx, w, h) => {
        // red-lit smoke under the title
        const sm = prng(3);
        for (let i = 0; i < 70; i++) { const x = sm() * w + f * (0.6 + sm()) - 100, y = h * 0.62 + sm() * 260 - f * 0.4, r = 120 + sm() * 220; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${90 + 120 * k},${18 + 30 * k},${22},${0.12 + 0.1 * sm()})`); g.addColorStop(1, 'rgba(40,5,8,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, w / 2, h / 2, 1100, '255,60,60', 0.25 * k + 0.05);
        streak(ctx, w / 2, h / 2, 1600, '255,120,120', 0.8 * k + 0.08, 6);
        // sparks burst from the slam
        const sp = prng(7);
        for (let i = 0; i < 380; i++) { const ang = sp() * Math.PI * 2, v = 10 + sp() * 40, life = 20 + sp() * 50; if (f > life) continue; const x = w / 2 + (sp() - 0.5) * 900 + Math.cos(ang) * v * f * 0.8, y = h / 2 + Math.sin(ang) * v * f * 0.5 + 0.6 * f * f; ctx.strokeStyle = `rgba(255,${190 + sp() * 60},${120 + sp() * 80},${1 - f / life})`; ctx.lineWidth = 1 + sp() * 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * v * 0.6, y - Math.sin(ang) * v * 0.4 - f * 0.6); ctx.stroke(); }
        // dust floating
        const d = prng(19); for (let i = 0; i < 200; i++) { const x = (d() * w + f * d() * 1.5) % w, y = (d() * h - f * 0.3 * d() + h) % h; ctx.fillStyle = `rgba(255,200,190,${d() * 0.4})`; ctx.fillRect(x, y, d() * 2.5, d() * 2.5); }
        ctx.globalCompositeOperation = 'source-over';
      }} />
      <div style={{ transform: `scale(${lerp(1.35, 1, easeOut(clamp(f / 5), 4)) * (1 + f * 0.0008)})`, textAlign: 'center' }}>
        <div style={{ position: 'relative', fontFamily: family, fontWeight: 900, fontSize: 230, letterSpacing: '0.04em', lineHeight: 1.25 }}>
          <span style={{ backgroundImage: `linear-gradient(180deg, #ffffff 0%, #d7dce3 30%, #59606b 52%, #1b1e24 56%, #8d96a3 80%, #e8ecf1 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: `drop-shadow(0 0 ${18 + 40 * k}px rgba(255,50,60,${0.55 + 0.4 * k}))` }}>ขบวนสุดท้าย</span>
          <span style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(105deg, transparent ${lerp(-30, 110, sweep) - 8}%, rgba(255,255,255,0.95) ${lerp(-30, 110, sweep)}%, transparent ${lerp(-30, 110, sweep) + 8}%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ขบวนสุดท้าย</span>
        </div>
        <div style={{ fontFamily: tech, fontWeight: 700, fontSize: 46, letterSpacing: `${lerp(1.6, 0.9, easeOut(clamp((f - 52) / 40), 2))}em`, color: '#ff3b4f', opacity: smooth((f - 52) / 10), marginTop: 6, textShadow: '0 0 24px rgba(255,40,60,0.8)' }}>LAST TRAIN</div>
      </div>
    </AbsoluteFill>
  );
};
