// Close, quiet shots: puddle opener, the eye, the case, text cards.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fbm, flicker } from '../lib/noise';
import { useThaiFont } from '../lib/typography';
import { Cnv, clamp, easeOut, glow, impact, lerp, prng, rain, smooth, splashes, streak } from './fx';

/* ---------- 1. OPEN: neon in a puddle, a boot comes down ---------- */
let signCanvas: HTMLCanvasElement | null = null;
const sign = (family: string) => {
  if (signCanvas) return signCanvas;
  const c = document.createElement('canvas'); c.width = 900; c.height = 260;
  const x = c.getContext('2d')!;
  x.font = `700 150px ${family}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = 'rgba(255,40,80,1)'; x.shadowBlur = 40; x.fillStyle = '#ff3b6b';
  x.fillText('โรงแรม 24 ชม.', 450, 130); x.shadowBlur = 0; x.fillStyle = '#ffd0dc'; x.fillText('โรงแรม 24 ชม.', 450, 130);
  signCanvas = c; return c;
};

export const Open: React.FC = () => {
  const family = useThaiFont('Kanit');
  const hud = useThaiFont('Chakra Petch');
  const f = useCurrentFrame();
  const step = 70; // boot lands
  const typed = 'กรุงเทพฯ  ·  02:47 น.';
  const shown = [...new (Intl as any).Segmenter('th', { granularity: 'grapheme' }).segment(typed)].map((s: any) => s.segment).slice(0, Math.max(0, Math.floor((f - 18) / 1.6))).join('');
  return (
    <AbsoluteFill style={{ background: '#020306' }}>
      <Cnv draw={(ctx, w, h) => {
        const fl = flicker(f, 3, 0.5, 9);
        const horizon = h * 0.3;
        // far bokeh city
        const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, '#05070d'); g.addColorStop(1, '#0d1220');
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
        ctx.globalCompositeOperation = 'lighter';
        const r = prng(5);
        for (let i = 0; i < 70; i++) {
          const x = r() * w + Math.sin(f / 50 + i) * 4, y = horizon * (0.25 + r() * 0.8), s = 14 + r() * 50;
          const col = ['255,170,80', '80,200,255', '255,60,120', '255,230,180'][Math.floor(r() * 4)];
          glow(ctx, x, y, s, col, 0.12 + r() * 0.2);
        }
        ctx.globalCompositeOperation = 'source-over';
        // wet asphalt with grain
        const ga = ctx.createLinearGradient(0, horizon, 0, h); ga.addColorStop(0, '#0b0e15'); ga.addColorStop(1, '#030407');
        ctx.fillStyle = ga; ctx.fillRect(0, horizon, w, h - horizon);
        const rg = prng(77);
        for (let i = 0; i < 5000; i++) { const y = horizon + Math.pow(rg(), 0.7) * (h - horizon); const x = rg() * w; const s = 0.5 + (y - horizon) / h * 2.5; ctx.fillStyle = `rgba(${rg() > 0.5 ? '150,160,180' : '0,0,0'},${0.05 + rg() * 0.12})`; ctx.fillRect(x, y, s, s * 0.6); }
        // puddle (ellipse) with the sign reflected and rippled
        ctx.save();
        ctx.beginPath(); ctx.ellipse(w * 0.5, h * 0.66, w * 0.46, h * 0.26, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(10,14,26,0.9)'; ctx.fillRect(0, 0, w, h);
        const sc = sign(family);
        const hitK = impact(f, [step], 18);
        for (let y = 0; y < 260; y += 4) {
          const wob = Math.sin(y * 0.09 + f * 0.35) * (6 + hitK * 40) + Math.sin(y * 0.031 - f * 0.2) * 5;
          ctx.globalAlpha = fl * (0.55 + 0.25 * Math.sin(y * 0.2 + f));
          ctx.drawImage(sc, 0, 260 - y - 4, 900, 4, w * 0.5 - 450 * 1.6 + wob, h * 0.48 + y * 1.6, 900 * 1.6, 6.4);
        }
        ctx.globalAlpha = 1;
        // ripples from rain + the step
        const rr = prng(11);
        for (let i = 0; i < 26; i++) {
          const per = 14 + Math.floor(rr() * 18), ph = Math.floor(rr() * per), cyc = Math.floor((f + ph) / per), k = ((f + ph) % per) / per;
          const q = prng(i * 313 + cyc * 17); const x = w * (0.1 + q() * 0.8), y = h * (0.45 + q() * 0.4), s = 0.6 + (y / h);
          for (let ring = 0; ring < 3; ring++) { const kk = k - ring * 0.12; if (kk <= 0) continue; ctx.strokeStyle = `rgba(200,210,255,${(1 - kk) * 0.35})`; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.ellipse(x, y, kk * 70 * s, kk * 16 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
        }
        if (f >= step) for (let ring = 0; ring < 6; ring++) { const kk = (f - step) / 26 - ring * 0.15; if (kk <= 0 || kk > 1.3) continue; ctx.strokeStyle = `rgba(255,150,180,${(1.3 - kk) * 0.5})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(w * 0.56, h * 0.7, kk * 700, kk * 150, 0, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
        // neon spill on the wet ground
        ctx.globalCompositeOperation = 'lighter';
        glow(ctx, w * 0.5, h * 0.6, w * 0.45, '255,40,90', 0.18 * fl);
        ctx.globalCompositeOperation = 'source-over';
        // the boot
        const by = f < step - 10 ? -600 : lerp(-600, h * 0.7 - 210, easeOut((f - step + 10) / 10, 2));
        if (f >= step - 10) {
          ctx.save(); ctx.translate(w * 0.56, by);
          { const bg = ctx.createLinearGradient(-110, 0, 300, 0); bg.addColorStop(0, '#010102'); bg.addColorStop(0.55, '#0a0a0e'); bg.addColorStop(0.75, '#1d1a22'); bg.addColorStop(1, '#050507'); ctx.fillStyle = bg; }
          ctx.beginPath(); ctx.moveTo(-90, -500); ctx.lineTo(70, -500); ctx.lineTo(80, 120); ctx.quadraticCurveTo(260, 130, 300, 190); ctx.lineTo(300, 215); ctx.lineTo(-110, 215); ctx.lineTo(-110, 120); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = `rgba(255,70,110,${0.7 * fl})`; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(80, -500); ctx.lineTo(82, 120); ctx.quadraticCurveTo(260, 130, 300, 190); ctx.stroke();
          ctx.fillStyle = 'rgba(120,200,255,0.25)'; ctx.fillRect(-110, 200, 410, 6);
          ctx.fillStyle = 'rgba(255,90,130,0.5)'; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(60, -380 + k * 80, 5, 0, Math.PI * 2); ctx.fill(); }
          ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(-100 + k * 4, 160 + k * 6); ctx.lineTo(290, 200 + k * 1.5); ctx.stroke(); }
          ctx.restore();
        }
        if (f >= step) splashes(ctx, w, h * 0.68, h * 0.74, f - step, { count: 1, seed: 3, scale: 0 });
        if (f >= step && f < step + 18) { // crown splash
          const k = (f - step) / 18, q = prng(9);
          ctx.fillStyle = `rgba(220,200,255,${1 - k})`;
          for (let i = 0; i < 90; i++) { const a = Math.PI + q() * Math.PI, v = 8 + q() * 30; const x = w * 0.56 + 100 + Math.cos(a) * v * k * 18, y = h * 0.7 + Math.sin(a) * v * k * 10 + 300 * k * k; ctx.beginPath(); ctx.arc(x, y, 1.5 + q() * 3, 0, Math.PI * 2); ctx.fill(); }
        }
        rain(ctx, w, h, f, { count: 700, speed: 60, alpha: 0.35, light: (x, y) => clamp(1 - Math.hypot(x - w * 0.5, y - h * 0.2) / 900) });
      }} />
      <div style={{ position: 'absolute', left: 150, bottom: 190, fontFamily: hud, fontWeight: 500, fontSize: 34, letterSpacing: '0.3em', color: 'rgba(230,240,255,0.85)' }}>
        {shown}<span style={{ opacity: Math.floor(f / 6) % 2 ? 1 : 0 }}>▍</span>
      </div>
    </AbsoluteFill>
  );
};

/* ---------- 3. EYE: extreme close-up, neon in the cornea ---------- */
export const Eye: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Cnv draw={(ctx, w, h) => {
        const zoom = 1 + f * 0.0014;
        ctx.translate(w / 2, h / 2); ctx.scale(zoom, zoom); ctx.translate(-w / 2 + fbm(f / 30, 2) * 6, -h / 2 + fbm(f / 33, 4) * 4);
        const cx = w * 0.5, cy = h * 0.52, ew = 760, eh = 300;
        const open = easeOut((f - 4) / 12, 3) * (f > 38 && f < 42 ? 0.15 : 1);
        const flash = impact(f, [22], 4);
        // skin, split-lit magenta / cyan
        const sk = ctx.createLinearGradient(0, 0, w, 0); sk.addColorStop(0, '#5a1b3a'); sk.addColorStop(0.45, '#2a1612'); sk.addColorStop(0.55, '#1c1512'); sk.addColorStop(1, '#0f3a4a');
        ctx.fillStyle = sk; ctx.fillRect(-200, -200, w + 400, h + 400);
        const pr = prng(3);
        for (let i = 0; i < 9000; i++) { const x = pr() * w, y = pr() * h; ctx.fillStyle = `rgba(${pr() > 0.5 ? '255,200,180' : '0,0,0'},${0.03 + pr() * 0.05})`; ctx.fillRect(x, y, 1.5, 1.5); }
        // brow shadow and crease
        { const bg = ctx.createRadialGradient(cx, cy - 330, 50, cx, cy - 330, 700); bg.addColorStop(0, 'rgba(0,0,0,0.55)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = bg; ctx.fillRect(cx - 900, cy - 1000, 1800, 1300); }
        ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx - ew * 0.62, cy - 30); ctx.quadraticCurveTo(cx, cy - eh * 1.05, cx + ew * 0.6, cy - 50); ctx.stroke();
        // eye opening
        const top = cy - eh * 0.62 * open, bot = cy + eh * 0.45 * Math.max(0.2, open);
        const lid = () => { ctx.beginPath(); ctx.moveTo(cx - ew / 2, cy); ctx.bezierCurveTo(cx - ew * 0.25, top - 40 * open, cx + ew * 0.2, top - 30 * open, cx + ew / 2, cy - 20); ctx.bezierCurveTo(cx + ew * 0.2, bot + 10, cx - ew * 0.25, bot + 20, cx - ew / 2, cy); ctx.closePath(); };
        ctx.save(); lid(); ctx.clip();
        const sc = ctx.createRadialGradient(cx, cy, 50, cx, cy, ew * 0.55); sc.addColorStop(0, '#d9d2cc'); sc.addColorStop(0.7, '#9b7f7c'); sc.addColorStop(1, '#4a2a2c');
        ctx.fillStyle = sc; ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(170,40,50,0.25)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < 26; i++) { const a = pr() * Math.PI * 2; let x = cx + Math.cos(a) * ew * 0.5, y = cy + Math.sin(a) * eh * 0.5; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (cx - x) * 0.1 + (pr() - 0.5) * 20; y += (cy - y) * 0.1 + (pr() - 0.5) * 14; ctx.lineTo(x, y); } ctx.stroke(); }
        // iris, looks left after the flash
        const gx = cx + lerp(0, -90, smooth((f - 26) / 8)), gy = cy - 10;
        const R = 175, pupil = lerp(62, 40, smooth(flash * 2)) + (f > 30 ? 6 : 0);
        const ig = ctx.createRadialGradient(gx, gy, pupil, gx, gy, R); ig.addColorStop(0, '#c98a3a'); ig.addColorStop(0.35, '#7a4b1e'); ig.addColorStop(0.8, '#3a2210'); ig.addColorStop(1, '#0d0704');
        ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(gx, gy, R, 0, Math.PI * 2); ctx.fill();
        const fr = prng(21);
        for (let i = 0; i < 520; i++) { const a = fr() * Math.PI * 2, r0 = pupil + fr() * 20, r1 = R * (0.6 + fr() * 0.38); const wv = (fr() - 0.5) * 0.08; ctx.strokeStyle = fr() > 0.5 ? `rgba(240,180,100,${0.1 + fr() * 0.25})` : `rgba(20,10,4,${0.15 + fr() * 0.3})`; ctx.lineWidth = 0.6 + fr() * 1.6; ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); ctx.quadraticCurveTo(gx + Math.cos(a + wv) * (r0 + r1) / 2, gy + Math.sin(a + wv) * (r0 + r1) / 2, gx + Math.cos(a + wv * 2) * r1, gy + Math.sin(a + wv * 2) * r1); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(gx, gy, R - 6, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#020101'; ctx.beginPath(); ctx.arc(gx, gy, pupil, 0, Math.PI * 2); ctx.fill();
        // cornea reflection: the neon sign and a window, bent over the dome
        ctx.globalCompositeOperation = 'lighter';
        const fl = flicker(f, 5, 0.3, 8);
        for (let i = 0; i < 7; i++) { const x = gx - 120 + i * 22, y = gy - 70 + Math.pow((i - 3) / 3, 2) * 18; ctx.fillStyle = `rgba(255,50,110,${0.55 * fl})`; ctx.fillRect(x, y, 16, 10); }
        ctx.fillStyle = 'rgba(120,230,255,0.75)'; ctx.beginPath(); ctx.moveTo(gx + 50, gy - 95); ctx.lineTo(gx + 95, gy - 85); ctx.lineTo(gx + 88, gy - 30); ctx.lineTo(gx + 45, gy - 40); ctx.closePath(); ctx.fill();
        glow(ctx, gx + 70, gy - 62, 70, '160,230,255', 0.5);
        glow(ctx, gx - 60, gy - 60, 120, '255,255,255', flash * 0.9);
        ctx.globalCompositeOperation = 'source-over';
        // upper-lid shadow over the eyeball, wet rim
        const sh = ctx.createLinearGradient(0, top - 40, 0, top + 120); sh.addColorStop(0, 'rgba(0,0,0,0.85)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sh; ctx.fillRect(0, top - 60, w, 200);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,190,200,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - ew / 2 + 30, cy + 8); ctx.bezierCurveTo(cx - ew * 0.25, bot + 18, cx + ew * 0.2, bot + 8, cx + ew / 2 - 20, cy - 14); ctx.stroke();
        // lashes
        const lr = prng(8);
        ctx.strokeStyle = '#050304'; ctx.lineCap = 'round';
        for (let i = 0; i < 70; i++) { const t = i / 69; const x = lerp(cx - ew / 2 + 40, cx + ew / 2 - 20, t); const y = cy - Math.sin(t * Math.PI) * (cy - top + 30 * open) - 4; const l = (40 + lr() * 50) * Math.sin(t * Math.PI * 0.9 + 0.2); const a = -Math.PI / 2 + (t - 0.5) * 1.3 + (lr() - 0.5) * 0.2; ctx.lineWidth = 3.5 + lr() * 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.6, y + Math.sin(a) * l * 0.4, x + Math.cos(a + 0.5) * l, y + Math.sin(a + 0.5) * l); ctx.stroke(); }
        // drops running on skin
        for (let i = 0; i < 9; i++) { const q = prng(40 + i); const x = q() * w, y0 = q() * h, y = (y0 + f * (2 + q() * 4)) % (h + 100) - 50, r = 6 + q() * 14; const dg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r); dg.addColorStop(0, 'rgba(255,255,255,0.8)'); dg.addColorStop(0.4, 'rgba(160,200,255,0.18)'); dg.addColorStop(1, 'rgba(0,0,0,0.35)'); ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r, 0, 0, Math.PI * 2); ctx.fill(); }
        // whole-frame lightning lift
        if (flash > 0.01) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(200,220,255,${flash * 0.35})`; ctx.fillRect(0, 0, w, h); }
      }} />
    </AbsoluteFill>
  );
};

/* ---------- 5. CASE: brushed aluminium, latch, red countdown ---------- */
const SEG: Record<string, number[]> = { '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1], '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1], '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0], '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1] };
export const sevenSeg = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, s: number, on: string, off: string) => {
  let cx = x;
  for (const ch of text) {
    if (ch === ':') { ctx.fillStyle = on; ctx.fillRect(cx + s * 0.15, y + s * 0.5, s * 0.16, s * 0.16); ctx.fillRect(cx + s * 0.15, y + s * 1.3, s * 0.16, s * 0.16); cx += s * 0.5; continue; }
    const seg = SEG[ch] ?? SEG['8'];
    const t = s * 0.16, L = s * 0.8;
    const rects: [number, number, number, number][] = [[t, 0, L, t], [L + t, t, t, L], [L + t, L + 2 * t, t, L], [t, 2 * L + 2 * t, L, t], [0, L + 2 * t, t, L], [0, t, t, L], [t, L + t, L, t]];
    rects.forEach(([rx, ry, rw, rh], i) => { ctx.fillStyle = seg[i] ? on : off; ctx.fillRect(cx + rx, y + ry, rw, rh); });
    cx += s * 1.25;
  }
};

export const Case: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Cnv draw={(ctx, w, h) => {
        const pan = -f * 2.2;
        const lit = 0.35 + impact(f, [6], 5) * 1.2 + (f >= 24 ? 0.25 : 0);
        ctx.translate(pan + 40, 0);
        // case body
        const x0 = 120, y0 = 230, cw = 1800, ch = 640;
        const mg = ctx.createLinearGradient(0, y0, 0, y0 + ch); mg.addColorStop(0, `rgba(${200 * lit},${205 * lit},${215 * lit},1)`); mg.addColorStop(0.5, `rgba(${110 * lit},${115 * lit},${125 * lit},1)`); mg.addColorStop(0.52, `rgba(${40 * lit},${42 * lit},${48 * lit},1)`); mg.addColorStop(1, `rgba(${150 * lit},${155 * lit},${165 * lit},1)`);
        ctx.fillStyle = mg; ctx.beginPath(); ctx.roundRect(x0, y0, cw, ch, 40); ctx.fill();
        const br = prng(6);
        for (let i = 0; i < 1600; i++) { const y = y0 + br() * ch; ctx.strokeStyle = `rgba(${br() > 0.5 ? '255,255,255' : '0,0,0'},${0.03 + br() * 0.05})`; ctx.lineWidth = 1; const xs = x0 + br() * cw; ctx.beginPath(); ctx.moveTo(xs, y); ctx.lineTo(xs + 80 + br() * 400, y); ctx.stroke(); }
        // seam and ribs
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x0, y0 + ch * 0.5 - 4, cw, 10);
        for (const ry of [y0 + 60, y0 + ch - 70]) { const rg = ctx.createLinearGradient(0, ry - 14, 0, ry + 14); rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0.5)'); ctx.fillStyle = rg; ctx.fillRect(x0 + 30, ry - 14, cw - 60, 28); }
        // moving specular sweep
        ctx.globalCompositeOperation = 'lighter';
        const sx = x0 + ((f * 28) % 2600) - 400; const sg = ctx.createLinearGradient(sx - 160, 0, sx + 160, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, `rgba(200,230,255,${0.18 * lit})`); sg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(x0, y0, cw, ch);
        ctx.globalCompositeOperation = 'source-over';
        // latches: snap open at 24
        const open = f >= 24 ? 1 : 0;
        for (const lx of [x0 + 380, x0 + 1300]) {
          ctx.save(); ctx.translate(lx, y0 + ch * 0.5);
          ctx.fillStyle = '#0b0c0f'; ctx.fillRect(-70, -60, 140, 120);
          ctx.rotate(open ? -0.5 : 0);
          const lg = ctx.createLinearGradient(0, -50, 0, 50); lg.addColorStop(0, '#f2f4f8'); lg.addColorStop(0.5, '#7b8088'); lg.addColorStop(1, '#d5d9e0'); ctx.fillStyle = lg; ctx.beginPath(); ctx.roundRect(-55, -48, 110, 96, 10); ctx.fill();
          ctx.restore();
        }
        // LED panel
        const px = x0 + 640, py = y0 + 170, pw = 520, ph = 190;
        ctx.fillStyle = '#050203'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
        const on = f >= 24;
        const sec = f < 36 ? '59:59' : '59:58';
        const flick = on ? (f < 28 ? (f % 2 ? 0.3 : 1) : 1) : 0;
        ctx.save(); ctx.shadowColor = 'rgba(255,30,30,1)'; ctx.shadowBlur = 30 * flick;
        sevenSeg(ctx, on ? sec : '88:88', px + 50, py + 30, 72, `rgba(255,40,40,${0.12 + 0.88 * flick})`, 'rgba(60,8,8,0.6)');
        ctx.restore();
        ctx.globalCompositeOperation = 'lighter'; if (on) glow(ctx, px + pw / 2, py + ph / 2, 520, '255,30,30', 0.25 * flick); ctx.globalCompositeOperation = 'source-over';
        // beaded water: highlights + shadows, a few run
        for (let i = 0; i < 160; i++) { const q = prng(500 + i); const x = x0 + q() * cw, yb = y0 + q() * ch; const run = q() > 0.85 ? Math.max(0, f - q() * 30) * (3 + q() * 4) : 0; const y = yb + run; const r = 3 + q() * 11; if (y > y0 + ch) continue; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * 1.1, 0, 0, Math.PI * 2); ctx.fill(); const dg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, 0.5, x, y, r); dg.addColorStop(0, `rgba(255,255,255,${0.9 * lit})`); dg.addColorStop(0.35, `rgba(200,210,230,${0.25 * lit})`); dg.addColorStop(1, 'rgba(80,90,110,0.2)'); ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2); ctx.fill(); if (run > 0) { ctx.strokeStyle = 'rgba(220,230,255,0.15)'; ctx.lineWidth = r * 0.8; ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, y); ctx.stroke(); } }
        // drops jump on the latch snap
        if (f >= 24 && f < 40) { const k = (f - 24) / 16, q = prng(31); ctx.fillStyle = `rgba(230,240,255,${1 - k})`; for (let i = 0; i < 60; i++) { const lx = q() > 0.5 ? x0 + 380 : x0 + 1300; const vx = (q() - 0.5) * 30, vy = -10 - q() * 25; ctx.beginPath(); ctx.arc(lx + vx * k * 10, y0 + ch * 0.5 + vy * k * 10 + 250 * k * k, 2 + q() * 3, 0, Math.PI * 2); ctx.fill(); } }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        rain(ctx, w, h, f, { count: 260, speed: 80, alpha: 0.25 * lit, seed: 7 });
        ctx.globalCompositeOperation = 'lighter'; if (on) streak(ctx, pan + 40 + px + pw / 2, py + ph / 2, 900, '255,60,60', 0.35 * flick, 4); ctx.globalCompositeOperation = 'source-over';
      }} />
    </AbsoluteFill>
  );
};

/* ---------- cards ---------- */
export const Card: React.FC<{ text: string; sub?: string; slam?: boolean; dur: number }> = ({ text, sub, slam, dur }) => {
  const f = useCurrentFrame();
  const family = useThaiFont('Kanit');
  const t = clamp(f / (slam ? 4 : 18));
  const out = clamp((dur - f) / (slam ? 2 : 8));
  const track = slam ? lerp(0.32, 0.12, easeOut(t)) : lerp(0.5, 0.18, easeOut(clamp(f / dur), 2));
  const scale = slam ? lerp(1.25, 1, easeOut(t, 4)) : lerp(1.06, 1, clamp(f / dur));
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <Cnv draw={(ctx, w, h) => { // dust in a faint beam
        ctx.globalCompositeOperation = 'lighter'; glow(ctx, w / 2, h / 2, 900, '60,90,140', 0.18);
        const r = prng(12);
        for (let i = 0; i < 160; i++) { const x = (r() * w + f * (0.5 + r())) % w, y = (r() * h + Math.sin(f / 20 + i) * 8), s = r() * 2.2; ctx.fillStyle = `rgba(200,220,255,${r() * 0.35})`; ctx.fillRect(x, y, s, s); }
      }} />
      <div style={{ transform: `scale(${scale})`, opacity: Math.min(slam ? 1 : easeOut(t), out), textAlign: 'center' }}>
        <div style={{ fontFamily: family, fontWeight: slam ? 800 : 300, fontSize: slam ? 120 : 92, letterSpacing: `${track}em`, color: '#EEF2F8', textShadow: '0 0 40px rgba(140,190,255,0.35)', backgroundImage: 'linear-gradient(180deg,#ffffff 0%,#cfd6e0 55%,#8a94a3 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{text}</div>
        {sub && <div style={{ fontFamily: family, fontWeight: 300, fontSize: 34, letterSpacing: '0.6em', color: 'rgba(220,230,245,0.7)', marginTop: 24 }}>{sub}</div>}
      </div>
    </AbsoluteFill>
  );
};

