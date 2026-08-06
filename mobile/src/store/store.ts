import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { useDispatch, useSelector } from 'react-redux';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';

import { api } from '@/core/api/api';
import { apiPersistTransform } from '@/core/persist/apiPersistTransform';
import { mmkvStorage } from '@/core/persist/mmkvStorage';

// Light caching only (not offline-first): persists the RTK Query cache so
// the last-fetched data can render instantly on cold start, while
// `refetchOnMountOrArgChange`/`refetchOnReconnect` on the api slice (see
// core/api/api.ts) guarantee it's always treated as a placeholder that
// revalidates, never a stale source of truth. Auth tokens are never part of
// this — those stay in tokenStore/SecureStore, untouched.
const persistedApiReducer = persistReducer(
  {
    key: 'api',
    storage: mmkvStorage,
    transforms: [apiPersistTransform],
  },
  api.reducer,
);

export const store = configureStore({
  reducer: {
    [api.reducerPath]: persistedApiReducer,
  },
  middleware: (getDefault) =>
    getDefault({
      // redux-persist's own actions carry non-serializable internals; RTK's
      // default serializableCheck would otherwise warn on every one of them.
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(api.middleware),
});

export const persistor = persistStore(store);

// Enables refetchOnReconnect / refetchOnFocus behaviour.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
