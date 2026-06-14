export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
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

export function clearAuthCookies(response: any): void {
  response.clearCookie('access_token', { path: '/' });
  response.clearCookie('refresh_token', { path: '/api/auth' });
  response.clearCookie('csrf_token', { path: '/' });
}
