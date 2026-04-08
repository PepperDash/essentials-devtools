import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';


export const selectRoomId = createSelector(
  (state: RootState) => state.commonUI,
  (commonUI) => commonUI.roomId
);