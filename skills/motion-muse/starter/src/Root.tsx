import { Composition } from 'remotion';
import { Reel, TOTAL } from './Reel';
import { DEMO_TOTAL, TransitionsDemo } from './TransitionsDemo';
import { FootageReel, footageMetadata } from './footage';

export const Root: React.FC = () => (
  <>
    <Composition id="MotionReel" component={Reel} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="TransitionsDemo" component={TransitionsDemo} durationInFrames={DEMO_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="FootageReel" component={FootageReel} defaultProps={{ edit: null }} calculateMetadata={footageMetadata} durationInFrames={60} fps={30} width={1080} height={1920} />
  </>
);
