// 3D map kit for place videos (restaurant / shop / landmark guides). Copied to src/lib/map3d.tsx by
// `director.py init --caps map3d`. Data comes from `scripts/place.py fetch` (OpenStreetMap, metres around the pin,
// points are [east, north]). Everything is procedural and frame-driven: no map tiles, no API key, no useFrame.
// On screen, always show "© OpenStreetMap contributors" while the map is visible (<OsmCredit />).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { bounce } from './physics';

type V3 = [number, number, number];
type Pt = [number, number];
export type MapData = { buildings: { p: Pt[]; h: number }[]; roads: { p: Pt[]; w: number; k: string; name?: string }[]; water: { p: Pt[] }[]; parks: { p: Pt[] }[] };
export type MapStyle = { ground: string; road: string; roadMajor: string; wall: string; roof: string; water: string; park: string; accent: string; fog: string };

/** Original palettes. `day`: warm paper and terracotta; `night`: ink blue with a warm pin. */
export const MAP_STYLES: Record<'day' | 'night', MapStyle> = {
  day: { ground: '#EDE6DA', road: '#FFFDF8', roadMajor: '#FFF1D6', wall: '#D9CFC1', roof: '#F6F1E9', water: '#9CC3D5', park: '#BFD6A6', accent: '#E4572E', fog: '#EDE6DA' },
  night: { ground: '#141B2B', road: '#2C3852', roadMajor: '#45506B', wall: '#222C42', roof: '#33405C', water: '#0D2238', park: '#1B2E2A', accent: '#FFB347', fog: '#141B2B' },
};

const shapeOf = (p: Pt[]) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y)));
const inside = (pt: Pt, poly: Pt[]) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const paint = (g: THREE.BufferGeometry, wall: THREE.Color, roof: THREE.Color) => {
  const n = g.getAttribute('normal'), col = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) { const c = n.getZ(i) > 0.5 ? roof : wall; col.set([c.r, c.g, c.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};
// flat polygons / extrusions are built in the XY plane (x east, y north) and laid down with rotateX(-90°): y north → -z
const lay = (g: THREE.BufferGeometry, y = 0) => g.rotateX(-Math.PI / 2).translate(0, y, 0);

/** Buildings (one merged mesh, the one under the pin in the accent colour), roads, water and parks. */
export const CityMap: React.FC<{ map: MapData; style?: MapStyle; pin?: Pt; rise?: number; radius?: number }> = ({ map, style = MAP_STYLES.day, pin = [0, 0], rise = 1, radius = 2000 }) => {
  const geo = useMemo(() => {
    const wall = new THREE.Color(style.wall), roof = new THREE.Color(style.roof), acc = new THREE.Color(style.accent), accRoof = acc.clone().lerp(new THREE.Color('#fff'), 0.25);
    const bs: THREE.BufferGeometry[] = [], hot: THREE.BufferGeometry[] = [];
    for (const b of map.buildings) {
      try {
        const g = new THREE.ExtrudeGeometry(shapeOf(b.p), { depth: b.h, bevelEnabled: false });
        g.deleteAttribute('uv');
        if (inside(pin, b.p)) hot.push(paint(g, acc, accRoof)); else {
          // a little tone per building so blocks read as separate houses
          const k = 0.93 + ((b.p.length * 37 + Math.round(b.h * 13)) % 9) / 60;
          bs.push(paint(g, wall.clone().multiplyScalar(k), roof.clone().multiplyScalar(Math.min(1.04, k + 0.03))));
        }
      } catch { /* self-intersecting footprint: skip */ }
    }
    const ribbon = (filter: (w: number) => boolean) => {
      const parts: THREE.BufferGeometry[] = [];
      for (const r of map.roads) if (filter(r.w)) for (let i = 0; i < r.p.length - 1; i++) {
        const [x1, y1] = r.p[i], [x2, y2] = r.p[i + 1], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
        if (L < 0.01) continue;
        const nx = (-dy / L) * r.w / 2, ny = (dx / L) * r.w / 2;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute([x1 + nx, y1 + ny, 0, x1 - nx, y1 - ny, 0, x2 + nx, y2 + ny, 0, x2 - nx, y2 - ny, 0], 3));
        g.setIndex([0, 1, 2, 2, 1, 3]);
        parts.push(g);
        const c = new THREE.CircleGeometry(r.w / 2, 10).translate(x2, y2, 0); c.deleteAttribute('uv'); c.deleteAttribute('normal'); parts.push(c.toNonIndexed().index ? c : c);
      }
      const clean = parts.map((g) => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (k !== 'position') ng.deleteAttribute(k); return ng; });
      const m = clean.length ? mergeGeometries(clean) : null;
      if (m) { m.computeVertexNormals(); lay(m); }
      return m;
    };
    const flat = (polys: { p: Pt[] }[], y: number) => {
      const gs = polys.filter((w) => w.p.length >= 3).map((w) => { const g = new THREE.ShapeGeometry(shapeOf(w.p)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; });
      return gs.length ? lay(mergeGeometries(gs), y) : null;
    };
    return {
      bld: bs.length ? lay(mergeGeometries(bs.map((g) => (g.index ? g.toNonIndexed() : g)))) : null,
      hot: hot.length ? lay(mergeGeometries(hot.map((g) => (g.index ? g.toNonIndexed() : g)))) : null,
      minor: ribbon((w) => w < 8), major: ribbon((w) => w >= 8), water: flat(map.water, 0.05), park: flat(map.parks, 0.08),
    };
  }, [map, style, pin[0], pin[1]]);
  const s = Math.max(0.001, rise);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[radius, 64]} /><meshStandardMaterial color={style.ground} roughness={1} /></mesh>
      {geo.water && <mesh geometry={geo.water} receiveShadow><meshStandardMaterial color={style.water} roughness={0.35} metalness={0.1} /></mesh>}
      {geo.park && <mesh geometry={geo.park} receiveShadow><meshStandardMaterial color={style.park} roughness={1} /></mesh>}
      {geo.minor && <mesh geometry={geo.minor} position={[0, 0.12, 0]} receiveShadow><meshStandardMaterial color={style.road} roughness={1} /></mesh>}
      {geo.major && <mesh geometry={geo.major} position={[0, 0.16, 0]} receiveShadow><meshStandardMaterial color={style.roadMajor} roughness={1} /></mesh>}
      {geo.bld && <mesh geometry={geo.bld} scale={[1, s, 1]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.92} /></mesh>}
      {geo.hot && <mesh geometry={geo.hot} scale={[1, s, 1]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={0.7} emissive={style.accent} emissiveIntensity={0.12} /></mesh>}
    </group>
  );
};

/** Sun + sky fill sized for a city block (shadow camera covers `span` metres). */
export const MapLights: React.FC<{ span?: number; sun?: V3; intensity?: number; night?: boolean }> = ({ span = 500, sun = [-220, 360, 180], intensity = 2.4, night = false }) => (
  <>
    <hemisphereLight args={[night ? '#5A6E9A' : '#FFF6E8', night ? '#0B0F18' : '#B9A98F', night ? 0.6 : 1.1]} />
    <directionalLight position={sun} intensity={night ? 0.5 : intensity} color={night ? '#9DB4FF' : '#FFE9C7'} castShadow
      shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0004}
      shadow-camera-left={-span} shadow-camera-right={span} shadow-camera-top={span} shadow-camera-bottom={-span} shadow-camera-near={1} shadow-camera-far={1500} />
  </>
);

/** Teardrop pin that drops in at `at` (frames), bounces, then breathes; a ring ripples on the ground. */
export const MapPin: React.FC<{ at?: number; color?: string; size?: number; position?: Pt; height?: number }> = ({ at = 0, color = '#E4572E', size = 14, position = [0, 0], height = 0 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = (f - at) / fps;
  if (t < 0) return null;
  const b = bounce(t, size * 5, 0.32, size * 110); // gravity scaled to the pin, so it lands in ~0.3 s at any map scale
  const y = height + size * 1.6 + b.y + (t > 1.4 ? Math.sin((t - 1.4) * 2.4) * size * 0.08 : 0);
  const ring = ((t * 0.7) % 1), squash = b.y < 0.5 && t < 1.2 ? 1 - 0.18 * Math.exp(-t * 4) : 1;
  return (
    <group position={[position[0], 0, -position[1]]}>
      <group position={[0, y, 0]} scale={[1 / squash, squash, 1 / squash]}>
        <mesh castShadow position={[0, size * 0.55, 0]}><sphereGeometry args={[size * 0.62, 32, 24]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
        <mesh castShadow position={[0, -size * 0.35, 0]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[size * 0.5, size * 1.35, 32]} /><meshStandardMaterial color={color} roughness={0.35} /></mesh>
        <mesh position={[0, size * 0.55, size * 0.5]}><sphereGeometry args={[size * 0.25, 24, 16]} /><meshStandardMaterial color="#FFFFFF" roughness={0.5} /></mesh>
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height + 0.3, 0]}>
        <ringGeometry args={[size * (0.6 + ring * 3), size * (0.8 + ring * 3), 48]} />
        <meshBasicMaterial color={color} transparent opacity={(1 - ring) * 0.6} depthWrite={false} />
      </mesh>
    </group>
  );
};

/** Camera flight from a high, almost top-down view down to a low three-quarter view of the pin.
 *  p: 0→1 progress (ease it yourself or pass `ease`). Returns { position, target } for CameraRig. */
export const flyTo = (p: number, o: { pin?: Pt; from?: number; to?: number; tiltFrom?: number; tiltTo?: number; yawFrom?: number; yawTo?: number } = {}) => {
  const { pin = [0, 0], from = 900, to = 170, tiltFrom = 84, tiltTo = 38, yawFrom = -35, yawTo = 20 } = o;
  const e = Easing.inOut(Easing.cubic)(Math.min(1, Math.max(0, p)));
  const d = from * Math.pow(to / from, e); // log zoom: equal speed at every scale, like map apps
  const tilt = ((tiltFrom + (tiltTo - tiltFrom) * e) * Math.PI) / 180, yaw = ((yawFrom + (yawTo - yawFrom) * e) * Math.PI) / 180;
  const target: V3 = [pin[0], 0, -pin[1]];
  const position: V3 = [target[0] + Math.sin(yaw) * Math.cos(tilt) * d, Math.sin(tilt) * d, target[2] + Math.cos(yaw) * Math.cos(tilt) * d];
  return { position, target };
};

/** Screen position (px) of a world point for the camera from flyTo/CameraRig: for labels drawn in HTML over the map. */
export const screenOf = (world: V3, cam: { position: V3; target: V3 }, fov: number, width: number, height: number) => {
  const c = new THREE.PerspectiveCamera(fov, width / height, 0.1, 5000);
  c.position.set(...cam.position); c.lookAt(...cam.target); c.updateMatrixWorld(); c.updateProjectionMatrix();
  const v = new THREE.Vector3(...world).project(c);
  return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height, visible: v.z < 1 };
};

/** Required attribution while the OSM map is on screen. */
export const OsmCredit: React.FC<{ color?: string; size?: number; style?: React.CSSProperties }> = ({ color = 'rgba(0,0,0,0.55)', size = 22, style }) => (
  <div style={{ position: 'absolute', right: size * 1.2, bottom: size * 1.2, fontSize: size, color, fontFamily: 'sans-serif', ...style }}>© OpenStreetMap contributors</div>
);

/** Rise-in of the buildings (0 → 1) for the first frames of a map shot. */
export const riseIn = (f: number, start = 0, dur = 40) => interpolate(f, [start, start + dur], [0.02, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
