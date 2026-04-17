import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  availableApps: string[];
}

const initialState: AuthState = {
  isAuthenticated: false,
  availableApps: [],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<string[]>) => {
      state.isAuthenticated = true;
      state.availableApps = action.payload;
    },
    logout: () => initialState,
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
