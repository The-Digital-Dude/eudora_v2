import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

/**
 * No sound-feedback system exists on the web client to port — these are
 * short procedurally-generated chimes (see mobile/assets/sounds), net-new
 * for this app.
 */
const SOURCES = {
  correct: require('../../../assets/sounds/correct.wav'),
  incorrect: require('../../../assets/sounds/incorrect.wav'),
  levelUp: require('../../../assets/sounds/level-up.wav'),
} as const;

export type SoundEffect = keyof typeof SOURCES;

const players = new Map<SoundEffect, AudioPlayer>();

function getPlayer(effect: SoundEffect): AudioPlayer {
  let player = players.get(effect);
  if (!player) {
    player = createAudioPlayer(SOURCES[effect]);
    players.set(effect, player);
  }
  return player;
}

/** Fire-and-forget; safe to call repeatedly in quick succession. */
export function playSoundEffect(effect: SoundEffect) {
  const player = getPlayer(effect);
  void player.seekTo(0).then(() => player.play());
}
