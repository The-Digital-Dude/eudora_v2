import Constants from 'expo-constants';
import { useEffect, useState } from 'react';

import { API_BASE_URL } from '@/core/api/baseQuery';
import { isVersionBelow } from '@/core/version/compareVersions';

interface MinVersionGateState {
  /** True once the check has resolved (either way) — nothing should render until then. */
  checked: boolean;
  blocked: boolean;
  latestVersion: string | null;
}

/**
 * Checks the installed build's version against `GET /client/min-version`
 * before anything else renders — the cheap mitigation for `meta.version`
 * being a hardcoded 'v1' literal with no real API versioning (see plan
 * §3). A network failure fails *open*: a hard-blocked launch screen over a
 * transient hiccup would be worse than letting one old build through.
 */
export function useMinVersionGate(): MinVersionGateState {
  const [state, setState] = useState<MinVersionGateState>({
    checked: false,
    blocked: false,
    latestVersion: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/client/min-version`);
        const envelope = await response.json();
        const minVersion: string | undefined = envelope?.data?.minVersion;
        const latestVersion: string | undefined = envelope?.data?.latestVersion;
        const currentVersion = Constants.expoConfig?.version ?? '0.0.0';

        if (!cancelled) {
          setState({
            checked: true,
            blocked: Boolean(minVersion) && isVersionBelow(currentVersion, minVersion!),
            latestVersion: latestVersion ?? null,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ checked: true, blocked: false, latestVersion: null });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
