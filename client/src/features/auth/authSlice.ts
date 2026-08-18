import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  // The double-submit CSRF value for the current session — cross-origin, the
  // client can't read the csrf_token cookie itself, so this is populated from
  // the response body on login/refresh/session-restore instead.
  csrfToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action) => {
      state.user = action.payload.user;
      state.csrfToken = action.payload.csrfToken;
      state.isAuthenticated = true;
    },

    logout: (state) => {
      state.user = null;
      state.csrfToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;
