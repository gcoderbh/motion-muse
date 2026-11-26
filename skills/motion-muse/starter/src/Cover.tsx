// Thumbnail / cover still: a frame from the finished video + a Thai title inside the platform safe zone.
// Made by `director.py cover`; render by hand: npx remotion still src/index.ts Cover out/cover.jpg --props='{...}'
import React from 'react';
import { AbsoluteFill, CalculateMetadataFunction, Img, staticFile } from 'remotion';
import { useFormat } from './lib/layout';
import { useThaiFont } from './lib/typography';

export type CoverProps = { image: string; title?: string; sub?: string; font?: string; color?: string; accent?: string; place?: 'top' | 'center' | 'bottom'; card?: string; width: number; height: number };

export const coverMetadata: CalculateMetadataFunction<CoverProps> = ({ props }) => ({ width: props.width, height: props.height });

export const Cover: React.FC<CoverProps> = ({ image, title, sub, font = 'Prompt', color = '#FFFFFF', accent = '#FFD54A', place = 'top', card = 'rgba(18,12,8,0.72)' }) => {
  const family = useThaiFont(font);
  const { safe, u } = useFormat();
  const lines = (title ?? '').split('\n');
  const size = u(lines.some((l) => [...new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(l)].length > 9) ? 104 : 132);
  const top = place === 'top' ? safe.y + u(20) : place === 'center' ? safe.y + safe.h / 2 - size * lines.length * 0.8 : safe.y + safe.h - size * lines.length * 1.4 - u(140);
  const shade = place === 'bottom' ? 'to top' : 'to bottom';
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <Img src={staticFile(image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      {title && <AbsoluteFill style={{ background: `linear-gradient(${shade}, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)` }} />}
      {title && (
        // the card hides any text already in the frame and keeps the title readable on busy shots
        <div style={{ position: 'absolute', left: safe.x, top, width: safe.w, fontFamily: family, textAlign: 'center', padding: `${u(28)}px ${u(24)}px`, boxSizing: 'border-box', borderRadius: u(36), background: card, backdropFilter: `blur(${u(22)}px)` }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: size, fontWeight: 800, lineHeight: 1.35, color: i === lines.length - 1 && lines.length > 1 ? accent : color, textShadow: '0 6px 30px rgba(0,0,0,0.45)' }}>{l}</div>
          ))}
          {sub && <div style={{ marginTop: u(18), fontSize: u(46), fontWeight: 500, lineHeight: 1.4, color, opacity: 0.92 }}>{sub}</div>}
        </div>
      )}
    </AbsoluteFill>
  );
};
