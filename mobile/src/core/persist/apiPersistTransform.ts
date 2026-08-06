import { createTransform } from 'redux-persist';

/**
 * RTK Query's reducer state also holds `subscriptions`/`provided`/`mutations`
 * — in-memory bookkeeping that's meaningless across a cold start and would
 * bloat what gets written to disk. Only `queries` (the actual cached
 * responses) and `config` are worth persisting; the rest resets to empty on
 * rehydrate.
 */
export const apiPersistTransform = createTransform(
  (inboundState: any) => ({
    queries: inboundState.queries,
    config: inboundState.config,
  }),
  (outboundState: any) => ({
    ...outboundState,
    mutations: {},
    provided: {},
    subscriptions: {},
  }),
  { whitelist: ['api'] },
);
