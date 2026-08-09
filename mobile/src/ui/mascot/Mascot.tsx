import LottieView from 'lottie-react-native';
import React from 'react';
import { View } from 'react-native';

/**
 * Mirrors `client/src/features/clio/ClioMascot.tsx`'s `state` contract
 * exactly (see CLIO_MASCOT_SPEC.md) — the same semantic vocabulary, ported
 * to lottie-react-native instead of dotlottie-react. `.lottie` sources are
 * pre-extracted to plain `.json` at build time (see mobile/assets/lottie) —
 * lottie-react-native's `source` prop is JSON-first, unlike the web's
 * dotLottie-native player.
 */
export type MascotState =
  | 'idle'
  | 'thinking'
  | 'celebrate'
  | 'encourage'
  | 'wrong'
  | 'greeting'
  | 'confused'
  | 'hint'
  | 'milestone';

export type MascotVariant = 'standing' | 'chair';

const ASSETS = {
  'standing:idle': require('../../../assets/lottie/mascot-clio-standing-idle.json'),
  'standing:greeting': require('../../../assets/lottie/mascot-clio-waving-hello.json'),
  'standing:thinking': require('../../../assets/lottie/mascot-clio-walking-small-steps.json'),
  'standing:encourage': require('../../../assets/lottie/mascot-clio-waving-hello.json'),
  'standing:confused': require('../../../assets/lottie/mascot-clio-noding-wrong-answer-standing.json'),
  'standing:celebrate': require('../../../assets/lottie/mascot-clio-cheering-right-answer-standing.json'),
  'standing:wrong': require('../../../assets/lottie/mascot-clio-noding-wrong-answer-standing.json'),
  'standing:milestone': require('../../../assets/lottie/mascot-clio-cheering-with-winner-cup-standing.json'),
  'chair:thinking': require('../../../assets/lottie/mascot-clio-waiting-for-answer-on-chair.json'),
  'chair:hint': require('../../../assets/lottie/mascot-on-chair-talking.json'),
  'chair:celebrate': require('../../../assets/lottie/mascot-clio-cheering-right-answer-on-chair.json'),
  'chair:wrong': require('../../../assets/lottie/mascot-clio-noding-wrong-answer-on-chair.json'),
} as const;

type AssetKey = keyof typeof ASSETS;

/** Trigger states play once and hold their last frame instead of looping. */
const ONE_SHOT = new Set<MascotState>(['celebrate', 'wrong', 'milestone']);

function resolveKey(state: MascotState, variant: MascotVariant): AssetKey {
  const chairKey = `chair:${state}` as AssetKey;
  if (variant === 'chair' && ASSETS[chairKey]) return chairKey;
  const standingKey = `standing:${state}` as AssetKey;
  if (ASSETS[standingKey]) return standingKey;
  return 'standing:idle';
}

interface MascotProps {
  state: MascotState;
  variant?: MascotVariant;
  size?: number;
}

export function Mascot({ state, variant = 'standing', size = 120 }: MascotProps) {
  const key = resolveKey(state, variant);

  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      {/* Remounting on key change restarts playback instead of blending
          between clips, matching ClioMascot's `key={animation.src}`. */}
      <LottieView
        key={key}
        source={ASSETS[key]}
        autoPlay
        loop={!ONE_SHOT.has(state)}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
