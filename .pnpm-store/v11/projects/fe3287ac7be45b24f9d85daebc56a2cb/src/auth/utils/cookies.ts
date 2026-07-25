export function parseCookieHeader(
  cookieHeader: string | undefined,
): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(';').flatMap((cookie) => {
      const [name, ...valueParts] = cookie.trim().split('=');
      const value = valueParts.join('=');

      return name && value ? [[name, decodeURIComponent(value)]] : [];
    }),
  );
}

export function setAuthCookies(
  response: any,
  tokens: {
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
    accessTokenExpiresInSeconds: number;
    refreshTokenExpiresInSeconds: number;
  },
): void {
  const secure = process.env.NODE_ENV === 'production';

  response.cookie('access_token', tokens.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: tokens.accessTokenExpiresInSeconds * 1000,
    path: '/',
  });

  response.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: tokens.refreshTokenExpiresInSeconds * 1000,
    path: '/api/auth', // Since global prefix is '/api'
  });

  response.cookie('csrf_token', tokens.csrfToken, {
    httpOnly: false,
    sameSite: 'lax',
    secure,
    maxAge: tokens.refreshTokenExpiresInSeconds * 1000,
    path: '/',
  });
}

export const APPLE_STATE_COOKIE = 'apple_oauth_state';

/**
 * Apple replies to the authorization request with a cross-site form_post, so
 * this cookie must survive that navigation — hence SameSite=None, which in turn
 * forces Secure. Local HTTP development therefore falls back to Lax; Apple only
 * ever redirects to an HTTPS redirect_uri in practice.
 */
export function setAppleStateCookie(response: any, nonce: string): void {
  const secure = process.env.NODE_ENV === 'production';

  response.cookie(APPLE_STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  });
}

export function clearAppleStateCookie(response: any): void {
  response.clearCookie(APPLE_STATE_COOKIE, { path: '/api/auth' });
}

export function clearAuthCookies(response: any): void {
  response.clearCookie('access_token', { path: '/' });
  response.clearCookie('refresh_token', { path: '/api/auth' });
  response.clearCookie('csrf_token', { path: '/' });
}
