// Reference → character example: RefSheet (turnaround, expressions, blink, gaze) and RefMatch (one pose framed like the
// reference, for scripts/charref.py compare). Pass char="bob" for the second sample, or add the spec you author.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { RefCharacter, RC_TURN, type RCSpec, type RCPose } from '../lib/refchar';
import nin from './nin.json';
import bob from './bob.json';
export const SPECS = { nin, bob } as unknown as Record<'nin' | 'bob', RCSpec>;
type Who = keyof typeof SPECS;

export const RefMatch: React.FC<{ pose: RCPose; x: number; y: number; scale: number; bg?: string; char?: Who }> = ({ pose, x, y, scale, bg = '#ffffff', char = 'nin' }) => (
  <AbsoluteFill style={{ background: bg }}><svg width={1000} height={1000} viewBox="0 0 1000 1000"><RefCharacter spec={SPECS[char]} pose={pose} x={x} y={y} scale={scale} /></svg></AbsoluteFill>
);
export const RefSheet: React.FC<{ char?: Who }> = ({ char = 'nin' }) => {
  const SPEC = SPECS[char];
  return (
  <AbsoluteFill style={{ background: '#E9E6EA' }}>
    <svg width={2000} height={1000} viewBox="0 0 2000 1000">
      {RC_TURN.map((yaw, i) => <RefCharacter key={i} uid={`t${i}`} spec={SPEC} pose={{ yaw }} x={i * 400 + 20} y={0} scale={0.36} />)}
      {(['neutral', 'smile', 'open'] as const).map((expr, i) => <RefCharacter key={expr} uid={`e${i}`} spec={SPEC} pose={{ expr, yaw: -0.2 }} x={i * 400 + 20} y={500} scale={0.36} />)}
      <RefCharacter uid="b1" spec={SPEC} pose={{ blink: 1, yaw: 0.2 }} x={1220} y={500} scale={0.36} />
      <RefCharacter uid="g1" spec={SPEC} pose={{ gaze: [-1, 0], pitch: -0.15, roll: 6 }} x={1620} y={500} scale={0.36} />
    </svg>
  </AbsoluteFill>
  );
};
