// Shows the platform UI zones while you work in Remotion Studio (or with --props='{"guides":true}'); never in renders.
import React from 'react';
import { AbsoluteFill, getInputProps, getRemotionEnvironment } from 'remotion';
import { useFormat } from './layout';

export const SafeGuides: React.FC<{ force?: boolean }> = ({ force }) => {
  const { safe } = useFormat();
  const on = force ?? (getRemotionEnvironment().isStudio || (getInputProps() as { guides?: boolean }).guides === true);
  if (!on) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,0,60,0.18)', clipPath: `polygon(0 0,100% 0,100% 100%,0 100%,0 0,${safe.x}px ${safe.y}px,${safe.x}px ${safe.y + safe.h}px,${safe.x + safe.w}px ${safe.y + safe.h}px,${safe.x + safe.w}px ${safe.y}px,${safe.x}px ${safe.y}px)` }} />
      <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: safe.h, outline: '3px dashed rgba(255,0,60,0.8)' }} />
    </AbsoluteFill>
  );
};
