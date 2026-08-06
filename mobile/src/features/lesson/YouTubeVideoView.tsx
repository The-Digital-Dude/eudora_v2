import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useTheme } from '@/ui/theme/ThemeProvider';

interface YouTubeVideoViewProps {
  videoId: string;
  onTimeUpdate: (seconds: number) => void;
  onEnded: () => void;
}

/**
 * Embeds the YouTube IFrame Player API rather than a bare `<iframe>`, so
 * playback position and completion are still observable — the same
 * `onTimeUpdate`/`onEnded` contract `VideoItemView` uses for direct files
 * with `expo-video`, so the parent doesn't need to know which player is
 * actually mounted underneath.
 */
export function YouTubeVideoView({
  videoId,
  onTimeUpdate,
  onEnded,
}: YouTubeVideoViewProps) {
  const t = useTheme();
  const endedRef = useRef(false);

  const html = useMemo(
    () => `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin:0; padding:0; background:#000; height:100%; }
  #player { position:absolute; top:0; left:0; width:100%; height:100%; }
</style>
</head>
<body>
<div id="player"></div>
<script src="https://www.youtube.com/iframe_api"></script>
<script>
  var ytPlayer;
  var pollTimer;

  function post(data) {
    window.ReactNativeWebView.postMessage(JSON.stringify(data));
  }

  function onYouTubeIframeAPIReady() {
    ytPlayer = new YT.Player('player', {
      videoId: '${videoId}',
      playerVars: { playsinline: 1 },
      events: {
        onStateChange: function (event) {
          if (event.data === YT.PlayerState.ENDED) {
            post({ type: 'ended' });
          }
          if (event.data === YT.PlayerState.PLAYING) {
            if (pollTimer) clearInterval(pollTimer);
            pollTimer = setInterval(function () {
              try {
                post({ type: 'time', seconds: Math.floor(ytPlayer.getCurrentTime()) });
              } catch (e) {}
            }, 5000);
          } else if (pollTimer) {
            clearInterval(pollTimer);
          }
        },
      },
    });
  }
</script>
</body>
</html>`,
    [videoId],
  );

  return (
    <View
      style={{
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: '#000',
        borderRadius: t.radius.lg,
        overflow: 'hidden',
      }}
    >
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={{ backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'time') {
              onTimeUpdate(data.seconds);
            } else if (data.type === 'ended' && !endedRef.current) {
              endedRef.current = true;
              onEnded();
            }
          } catch {
            // Malformed bridge message — nothing to recover, drop it.
          }
        }}
      />
    </View>
  );
}
