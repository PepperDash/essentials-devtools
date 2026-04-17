import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

const selectDebugConsole = (state: RootState) => state.debugConsole;

export const selectCheckedDevices = createSelector(
  selectDebugConsole,
  (s) => s.checkedDevices
);

export const selectDeviceLevels = createSelector(
  selectDebugConsole,
  (s) => s.deviceLevels
);

export const selectSearchText = createSelector(
  selectDebugConsole,
  (s) => s.searchText
);
