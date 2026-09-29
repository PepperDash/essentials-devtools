import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LoginCredentials {
  username: string;
  password: string;
}

interface AuthState {
  isAuthenticated: boolean;
  availableApps: string[];
  /**
   * Kept in memory only (never persisted) so features that need the processor login,
   * like the SSH console, don't prompt again. Cleared on logout and page reload.
   */
  credentials: LoginCredentials | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  availableApps: [],
  credentials: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (
      state,
      action: PayloadAction<{ availableApps: string[]; credentials: LoginCredentials }>
    ) => {
      state.isAuthenticated = true;
      state.availableApps = action.payload.availableApps;
      state.credentials = action.payload.credentials;
    },
    logout: () => initialState,
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
