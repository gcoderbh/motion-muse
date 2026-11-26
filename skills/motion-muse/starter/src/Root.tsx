import { Composition } from 'remotion';
import { Reel, TOTAL } from './Reel';
import { DEMO_TOTAL, TransitionsDemo } from './TransitionsDemo';
import { FootageReel, footageMetadata } from './footage';
import { Cover, coverMetadata } from './Cover';
import { AppPromo, DataReel, DEMO_APP, DEMO_CARD, DEMO_DATA, DEMO_LYRIC, DEMO_RACE, LyricReel, PromoCard, appPromoMetadata, dataReelMetadata, lyricReelMetadata } from './Basics';

export const Root: React.FC = () => (
  <>
    <Composition id="MotionReel" component={Reel} durationInFrames={TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="TransitionsDemo" component={TransitionsDemo} durationInFrames={DEMO_TOTAL} fps={30} width={1080} height={1920} />
    <Composition id="FootageReel" component={FootageReel} defaultProps={{ edit: null }} calculateMetadata={footageMetadata} durationInFrames={60} fps={30} width={1080} height={1920} />
    <Composition id="Cover" component={Cover} defaultProps={{ image: 'cover/frame.jpg', width: 1080, height: 1920 }} calculateMetadata={coverMetadata} durationInFrames={1} fps={30} width={1080} height={1920} />
    <Composition id="DataReel" component={DataReel} defaultProps={DEMO_DATA} calculateMetadata={dataReelMetadata} durationInFrames={240} fps={30} width={1080} height={1920} />
    <Composition id="BarRace" component={DataReel} defaultProps={DEMO_RACE} calculateMetadata={dataReelMetadata} durationInFrames={240} fps={30} width={1080} height={1920} />
    <Composition id="LyricReel" component={LyricReel} defaultProps={DEMO_LYRIC} calculateMetadata={lyricReelMetadata} durationInFrames={300} fps={30} width={1080} height={1920} />
    <Composition id="AppPromo" component={AppPromo} defaultProps={DEMO_APP} calculateMetadata={appPromoMetadata} durationInFrames={300} fps={30} width={1080} height={1920} />
    <Composition id="PromoCard" component={PromoCard} defaultProps={DEMO_CARD} durationInFrames={120} fps={30} width={1080} height={1920} />
  </>
);
