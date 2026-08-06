import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  /**
   * `meta.version` on every response is a hardcoded 'v1' literal — there's no
   * real API versioning scheme, so once the mobile app is installed on
   * devices there's no way to force a breaking change through. This is the
   * cheap mitigation instead: a client checks its own build against this and
   * blocks itself if it's too old. Env-driven rather than DB-backed since
   * there's no admin UI for it yet — bumping it is a config change, not a
   * deploy.
   */
  getMinVersion() {
    return {
      minVersion: process.env.MOBILE_MIN_VERSION ?? '1.0.0',
      latestVersion: process.env.MOBILE_LATEST_VERSION ?? '1.0.0',
    };
  }
}
