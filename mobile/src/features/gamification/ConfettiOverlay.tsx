import LottieView from 'lottie-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

const CONFETTI = require('../../../assets/lottie/confetti-effect-from-bottom-multiple-source-left-right.json');

/** Mirrors the web `LessonCompleteModal`'s full-bleed confetti background. */
export function ConfettiOverlay() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LottieView
        source={CONFETTI}
        autoPlay
        loop={false}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
