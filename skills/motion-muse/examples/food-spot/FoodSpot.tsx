// Place guide (restaurant / shop / landmark): a 3D OpenStreetMap city rises, the camera flies down to the pin,
// then open-licence photos and one clip from Wikimedia Commons, each with its credit on screen, then an info card
// with every credit. Data: `place.py fetch "<name>" --out public/<dir>` → public/<dir>/place.json.
// Calm edit: one soft transition (map → photos), hard cuts on the beat after that, slow Ken Burns, no whips.
import React from 'react';
import { AbsoluteFill, Audio, CalculateMetadataFunction, Img, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Grain, Timeline } from '../transitions';
import { CameraRig, Stage3D } from '../lib/three';
import { CityMap, MapData, MapLights, MapPin, MAP_STYLES, OsmCredit, flyTo, riseIn, screenOf } from '../lib/map3d';
import { useFormat } from '../lib/layout';
import { useThaiFontReady } from '../lib/typography';
import { prog } from '../lib/pose';

type Credit = { file: string; title: string; author: string; license: string; licenseUrl: string; source: string; site?: string }; // site: where it came from (default Commons)
const from = (c: Credit) => `${c.author} · ${c.license} · ${c.site ?? 'Wikimedia Commons'}`;
export type Place = { name: string; address: string; osm: string; map: MapData; photos: Credit[]; videos: Credit[] };
export type FoodSpotProps = {
  dir: string;                 // folder in public/ written by place.py, e.g. "place/jayfai"
  hook: string;                // first line on screen
  tagline?: string;            // under the name on the pin card
  photos?: { i: number; text: string }[]; // which photos (index in place.json) and the line shown on each
  video?: { i: number; text: string; note?: string } | null;
  cta?: string;
  music?: string;              // file in public/, e.g. "audio/place-bgm.mp3"
  musicCredit?: string;        // shown on the end card
  place?: Place;               // filled by calculateMetadata
};
const FPS = 30, MAP = 200, PHOTO = 66, CLIP = 150, OUTRO = 120;
const INK = '#2A1F18', PAPER = '#FFF9F0', ACC = MAP_STYLES.day.accent;

// the photos and clip that exist in place.json (bad indexes are dropped, so length and content always agree)
const pick = (p: FoodSpotProps, place: Place) => {
  const ph = (p.photos ?? place.photos.slice(0, 4).map((_, i) => ({ i, text: '' }))).filter((x) => place.photos[x.i]);
  const want = p.video === undefined ? { i: 0, text: '' } : p.video;
  const v = want && place.videos[want.i] ? want : null;
  return { ph, v, total: MAP + ph.length * PHOTO + (v ? CLIP : 0) + OUTRO };
};

export const foodSpotMetadata: CalculateMetadataFunction<FoodSpotProps> = async ({ props }) => {
  // no place.json yet (fresh init): show the setup hint instead of failing every composition in the project
  const place: Place | undefined = await fetch(staticFile(`${props.dir}/place.json`)).then((r) => (r.ok ? r.json() : undefined)).catch(() => undefined);
  if (!place) return { props: { ...props, place: undefined }, durationInFrames: 90, fps: FPS };
  return { props: { ...props, place }, durationInFrames: pick(props, place).total, fps: FPS };
};

const useType = () => { const { family } = useThaiFontReady('Prompt'); const { u } = useFormat(); return { family, u }; };

const CreditTag: React.FC<{ c: Credit; kind: 'ภาพ' | 'วิดีโอ' }> = ({ c, kind }) => {
  const { family, u } = useType(); const { safe } = useFormat();
  return (
    <div style={{ position: 'absolute', left: safe.x, top: safe.y + safe.h - u(70), maxWidth: safe.w, fontFamily: family, fontSize: u(24), lineHeight: 1.35,
      color: '#fff', background: 'rgba(20,14,10,0.55)', padding: `${u(8)}px ${u(16)}px`, borderRadius: u(10) }}>
      {kind}: {from(c)}
    </div>
  );
};

const Line: React.FC<{ text: string; delay?: number; size?: number; top?: number }> = ({ text, delay = 6, size = 72, top }) => {
  const f = useCurrentFrame(); const { family, u } = useType(); const { safe } = useFormat();
  const p = prog(f, delay, delay + 14);
  return (
    <div style={{ position: 'absolute', left: safe.x, width: safe.w, top: top ?? safe.y + u(40), textAlign: 'center', fontFamily: family, fontWeight: 700,
      fontSize: u(size), lineHeight: 1.3, color: '#fff', textShadow: `0 ${u(4)}px ${u(24)}px rgba(0,0,0,0.55)`, opacity: p, transform: `translateY(${u(24) * (1 - p)}px)` }}>{text}</div>
  );
};

const MapShot: React.FC<{ p: FoodSpotProps & { place: Place } }> = ({ p }) => {
  const f = useCurrentFrame(); const { width, height } = useVideoConfig(); const { family, u } = useType(); const { safe } = useFormat();
  const fov = 38, cam = flyTo(prog(f, 0, 165), { from: 1100, to: 260, tiltTo: 42 });
  const pinTop = screenOf([0, 60, 0], cam, fov, width, height);
  const card = prog(f, 150, 166);
  return (
    <AbsoluteFill style={{ background: MAP_STYLES.day.fog }}>
      <Stage3D background={MAP_STYLES.day.fog} fog={[MAP_STYLES.day.fog, 600, 1900]} fov={fov} far={4000} tone="agx" exposure={1.05}>
        <MapLights span={520} />
        <CityMap map={p.place.map} rise={riseIn(f, 0, 70)} />
        <MapPin at={118} size={16} color={ACC} />
        <CameraRig position={cam.position} target={cam.target} />
      </Stage3D>
      <div style={{ position: 'absolute', left: safe.x, width: safe.w, top: safe.y + u(30), textAlign: 'center', fontFamily: family, fontWeight: 700, fontSize: u(70), lineHeight: 1.3, color: INK, opacity: prog(f, 8, 22) * (1 - prog(f, 140, 152)) }}>{p.hook}</div>
      <div style={{ position: 'absolute', left: pinTop.x, top: pinTop.y - u(30), transform: `translate(-50%, -100%) scale(${0.85 + 0.15 * card})`, transformOrigin: '50% 100%', opacity: card,
        background: PAPER, borderRadius: u(28), padding: `${u(22)}px ${u(34)}px`, boxShadow: `0 ${u(10)}px ${u(40)}px rgba(60,30,10,0.25)`, fontFamily: family, textAlign: 'center', whiteSpace: 'nowrap' }}>
        <div style={{ fontSize: u(60), fontWeight: 700, color: INK, lineHeight: 1.3 }}>{p.place.name}</div>
        {p.tagline && <div style={{ fontSize: u(32), color: ACC, lineHeight: 1.35 }}>{p.tagline}</div>}
      </div>
      <OsmCredit size={u(22)} style={{ right: safe.x, bottom: height - safe.y - safe.h + u(10) }} />
    </AbsoluteFill>
  );
};

const Photo: React.FC<{ c: Credit; text: string; dir: string; k: number }> = ({ c, text, dir, k }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, PHOTO + 20], [1.04, 1.12]), x = interpolate(f, [0, PHOTO + 20], [k % 2 ? -1.5 : 1.5, k % 2 ? 1.5 : -1.5]);
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Img src={staticFile(`${dir}/${c.file}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${s}) translateX(${x}%)` }} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.4))' }} />
      <Line text={text} />
      <CreditTag c={c} kind="ภาพ" />
    </AbsoluteFill>
  );
};

const Clip: React.FC<{ c: Credit; text: string; note?: string; dir: string }> = ({ c, text, note, dir }) => {
  const { u } = useType(); const { safe } = useFormat();
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <OffthreadVideo src={staticFile(`${dir}/${c.file}`)} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0) 30%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.4))' }} />
      <Line text={text} />
      {note && <Line text={note} size={30} delay={14} top={safe.y + u(150)} />}
      <CreditTag c={c} kind="วิดีโอ" />
    </AbsoluteFill>
  );
};

const Outro: React.FC<{ p: FoodSpotProps & { place: Place }; used: Credit[] }> = ({ p, used }) => {
  const f = useCurrentFrame(); const { family, u } = useType(); const { safe } = useFormat();
  return (
    <AbsoluteFill style={{ background: PAPER, fontFamily: family, color: INK }}>
      <div style={{ position: 'absolute', left: safe.x, width: safe.w, top: safe.y + safe.h * 0.16, textAlign: 'center', opacity: prog(f, 0, 14) }}>
        <div style={{ width: u(90), height: u(90), margin: '0 auto', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', background: ACC }} />
        <div style={{ fontSize: u(84), fontWeight: 700, lineHeight: 1.3, marginTop: u(30) }}>{p.place.name}</div>
        <div style={{ fontSize: u(36), lineHeight: 1.4, opacity: 0.75, padding: `0 ${u(30)}px` }}>{p.place.address}</div>
        {p.cta && <div style={{ display: 'inline-block', marginTop: u(36), padding: `${u(16)}px ${u(46)}px`, borderRadius: u(60), background: INK, color: PAPER, fontSize: u(40), opacity: prog(f, 10, 24) }}>{p.cta}</div>}
      </div>
      <div style={{ position: 'absolute', left: safe.x, width: safe.w, top: safe.y + safe.h * 0.6, fontSize: u(24), lineHeight: 1.45, opacity: 0.7 * prog(f, 18, 32), textAlign: 'center' }}>
        <div style={{ fontWeight: 700, marginBottom: u(8) }}>เครดิต</div>
        <div>แผนที่ {p.place.osm}</div>
        {used.map((c) => <div key={c.file}>{from(c)}</div>)}
        {p.musicCredit && <div>เพลง {p.musicCredit}</div>}
      </div>
    </AbsoluteFill>
  );
};

export const FoodSpot: React.FC<FoodSpotProps> = (props) => {
  if (!props.place) return (
    <AbsoluteFill style={{ background: PAPER, color: INK, justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif', fontSize: 40, textAlign: 'center', padding: 80 }}>
      No public/{props.dir}/place.json yet: run scripts/place.py fetch "&lt;place&gt;" --out public/{props.dir}
    </AbsoluteFill>
  );
  const p = props as FoodSpotProps & { place: Place };
  const { ph, v, total } = pick(p, p.place);
  const used = [...ph.map((x) => p.place.photos[x.i]), ...(v ? [p.place.videos[v.i]] : [])];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Timeline sfx={false} backdrop={PAPER} scenes={[
        { dur: MAP, el: <MapShot p={p} />, out: { kind: 'focus' } },
        ...ph.map((x, k) => ({ dur: PHOTO, el: <Photo c={p.place.photos[x.i]} text={x.text} dir={p.dir} k={k} /> })),
        ...(v ? [{ dur: CLIP, el: <Clip c={p.place.videos[v.i]} text={v.text} note={v.note} dir={p.dir} /> }] : []),
        { dur: OUTRO, el: <Outro p={p} used={used} /> },
      ]} />
      <Grain opacity={0.03} />
      {p.music && <Audio src={staticFile(p.music)} volume={(fr) => 0.9 * interpolate(fr, [0, 20, total - 40, total], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />}
    </AbsoluteFill>
  );
};

export const DEMO_FOOD_SPOT: FoodSpotProps = {
  dir: 'place/jayfai',
  hook: 'ร้านดังย่านพระนคร',
  tagline: 'ถนนมหาไชย · เตาถ่านไฟแรง',
  photos: [{ i: 0, text: 'ผัดบนเตาถ่าน ไฟแรงตลอด' }, { i: 1, text: 'จานเด่นมาเป็นชิ้นโต' }, { i: 2, text: 'ทำเองทุกจาน' }, { i: 4, text: 'ต้องรอคิว แต่คุ้ม' }],
  video: { i: 0, text: 'บรรยากาศสตรีทฟู้ด', note: 'ภาพประกอบ ไม่ใช่ร้านนี้' },
  cta: 'ปักหมุดไว้ไปกิน',
  music: 'audio/place-bgm.mp3',
  musicCredit: 'Walking in the Park · Diego Nava · Mixkit',
};
