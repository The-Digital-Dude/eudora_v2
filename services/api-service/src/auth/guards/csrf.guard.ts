import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { parseCookieHeader } from '../utils/cookies';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      return true;
    }

    const cookies = parseCookieHeader(request.headers.cookie);

    // CSRF is a defence against *ambient* credentials: the browser attaching
    // cookies to a cross-site request the user never intended. A bearer token
    // is not ambient — it has to be set deliberately, and a cross-origin page
    // cannot set an Authorization header without a preflight that our CORS
    // allowlist rejects. So a bearer-authenticated caller (native mobile/TV,
    // which has no cookie jar to draw a csrf_token from) has nothing to forge
    // against and is exempt.
    //
    // The cookie is checked first, mirroring the extractor order in
    // jwt.strategy.ts: if an access_token cookie is present the request is
    // treated as a browser session and still has to pass CSRF, so this cannot
    // be used to downgrade a genuine cookie session by bolting on a header.
    const authenticatedByCookie = Boolean(cookies['access_token']);
    const bearerHeader = request.headers['authorization'];
    const authenticatedByBearer =
      !authenticatedByCookie &&
      typeof bearerHeader === 'string' &&
      bearerHeader.toLowerCase().startsWith('bearer ');

    if (authenticatedByBearer) {
      return true;
    }

    const csrfCookie = cookies['csrf_token'];
    const csrfHeader = request.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}
