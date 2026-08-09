import LottieView from 'lottie-react-native';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

const BUBBLE_EXPLOSION = require('../../../assets/lottie/bubble-explosion-from-center.json');

export interface XpBurstHandle {
  play: () => void;
}

interface XpBurstProps {
  size?: number;
}

/**
 * Mirrors the web's `GamificationHUD` XP-burst pattern: a ref-driven,
 * non-autoplaying one-shot clip fired imperatively on XP gain rather than
 * mounted/unmounted per event.
 */
export const XpBurst = forwardRef<XpBurstHandle, XpBurstProps>(function XpBurst(
  { size = 96 },
  ref,
) {
  const lottieRef = useRef<LottieView>(null);

  useImperativeHandle(ref, () => ({
    play: () => {
      lottieRef.current?.play();
    },
  }));

  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <LottieView
        ref={lottieRef}
        source={BUBBLE_EXPLOSION}
        loop={false}
        autoPlay={false}
        style={{ width: size, height: size }}
      />
    </View>
  );
});
