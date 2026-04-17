import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DebugConsoleState {
  checkedDevices: string[];
  deviceLevels: Record<string, string>;
  searchText: string;
}

const initialState: DebugConsoleState = {
  checkedDevices: [],
  deviceLevels: {},
  searchText: '',
};

const debugConsoleSlice = createSlice({
  name: 'debugConsole',
  initialState,
  reducers: {
    checkDevice: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (!state.checkedDevices.includes(id)) {
        state.checkedDevices.push(id);
        state.deviceLevels[id] = 'Information';
      }
    },
    uncheckDevice: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.checkedDevices = state.checkedDevices.filter((d) => d !== id);
      delete state.deviceLevels[id];
    },
    setDeviceLevel: (
      state,
      action: PayloadAction<{ deviceId: string; level: string }>
    ) => {
      const { deviceId, level } = action.payload;
      state.deviceLevels[deviceId] = level;
    },
    setSearchText: (state, action: PayloadAction<string>) => {
      state.searchText = action.payload;
    },
    clearAllFilters: () => initialState,
  },
});

export const debugConsoleActions = debugConsoleSlice.actions;
export const debugConsoleReducer = debugConsoleSlice.reducer;
