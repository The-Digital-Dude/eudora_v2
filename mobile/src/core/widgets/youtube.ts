/**
 * `expo-video` wraps AVPlayer/ExoPlayer, which play direct media files (mp4,
 * HLS, ...) — not YouTube watch-page URLs, on any platform. The web app's
 * player (`react-player`) accepts YouTube URLs directly because it silently
 * swaps in an iframe-embedded YouTube player for that case; this is the same
 * idea, ported. Seeded/authored content today uses YouTube URLs (see the
 * catalog seed data), so this isn't a hypothetical.
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');

    if (host === 'youtu.be') {
      return parsed.pathname.slice(1) || null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname === '/watch') {
        return parsed.searchParams.get('v');
      }
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/embed/')[1] || null;
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/shorts/')[1] || null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
