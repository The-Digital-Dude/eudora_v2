import { useVideoPlayer, VideoView } from 'expo-video';
import React, { useEffect, useMemo, useRef } from 'react';
import { View } from 'react-native';

import type { ModuleItem } from '@/core/contracts';
import { extractYouTubeId } from '@/core/widgets/youtube';
import { useUpdateModuleItemProgressMutation } from '@/features/catalog/catalogApi';
import { LockedItemNotice } from '@/features/lesson/LockedItemNotice';
import { useTheme } from '@/ui/theme/ThemeProvider';
import { YouTubeVideoView } from './YouTubeVideoView';

interface VideoItemViewProps {
  item: ModuleItem;
  courseId: string;
}

/**
 * Dispatches to whichever player the URL actually needs. `expo-video` wraps
 * AVPlayer/ExoPlayer, which play direct media files — not YouTube watch-page
 * URLs, on any platform — so a YouTube URL routes to an embedded IFrame
 * Player instead. Both paths report through the same
 * `onTimeUpdate`/`onEnded` shape, matching the web VideoLectureView's
 * progress contract: position saves throttled to once per 5s, completion
 * marked once via a ref guard.
 */
export function VideoItemView({ item, courseId }: VideoItemViewProps) {
  const youTubeId = useMemo(
    () => (item.videoUrl ? extractYouTubeId(item.videoUrl) : null),
    [item.videoUrl],
  );

  const [updateProgress] = useUpdateModuleItemProgressMutation();
  const lastSavedPosition = useRef(0);
  const hasMarkedComplete = useRef(false);

  const handleTimeUpdate = (seconds: number) => {
    if (Math.abs(seconds - lastSavedPosition.current) >= 5) {
      lastSavedPosition.current = seconds;
      void updateProgress({ id: item.id, lastPositionSeconds: seconds });
    }
  };

  const handleEnded = () => {
    if (!hasMarkedComplete.current) {
      hasMarkedComplete.current = true;
      void updateProgress({ id: item.id, completed: true });
    }
  };

  // `videoUrl` is nulled server-side (same reasoning as ReadingItemView)
  // whenever `isContentLocked` — checked first so a locked item shows the
  // unlock prompt rather than a silently blank player.
  if (item.isContentLocked) {
    return <LockedItemNotice courseId={courseId} what="video" />;
  }

  if (!item.videoUrl) {
    return null;
  }

  if (youTubeId) {
    return (
      <YouTubeVideoView
        videoId={youTubeId}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      />
    );
  }

  return (
    <DirectFileVideoView
      videoUrl={item.videoUrl}
      onTimeUpdate={handleTimeUpdate}
      onEnded={handleEnded}
    />
  );
}

function DirectFileVideoView({
  videoUrl,
  onTimeUpdate,
  onEnded,
}: {
  videoUrl: string;
  onTimeUpdate: (seconds: number) => void;
  onEnded: () => void;
}) {
  const t = useTheme();

  const player = useVideoPlayer(videoUrl, (p) => {
    // Disabled (0) by default — no `timeUpdate` events would fire otherwise.
    p.timeUpdateEventInterval = 1;
    p.play();
  });

  useEffect(() => {
    const positionSub = player.addListener('timeUpdate', (e: { currentTime: number }) => {
      onTimeUpdate(Math.floor(e.currentTime));
    });
    const endSub = player.addListener('playToEnd', onEnded);

    return () => {
      positionSub.remove();
      endSub.remove();
    };
  }, [player, onTimeUpdate, onEnded]);

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
      <VideoView
        style={{ width: '100%', height: '100%' }}
        player={player}
        allowsPictureInPicture
        nativeControls
      />
    </View>
  );
}
