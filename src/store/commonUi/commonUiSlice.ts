import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { initialCommonUiState } from './commonUiState';

const commonUiSlice = createSlice({
  name: 'commonUI',
  initialState: initialCommonUiState,
  reducers: {
    setRoomId: (state, action: PayloadAction<string>) => {
      state.roomId = action.payload;
    },


    // resetState: () => {
    //   // This is here in order to provide an action name to trigger store reset
    //   // in root store reducer
    // },
  },
});

export const commonUiActions = commonUiSlice.actions;
export const commonUiReducer = commonUiSlice.reducer;