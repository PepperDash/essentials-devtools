import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

const selectAuth = (state: RootState) => state.auth;

export const selectIsAuthenticated = createSelector(
  selectAuth,
  (auth) => auth.isAuthenticated
);

export const selectAvailableApps = createSelector(
  selectAuth,
  (auth) => auth.availableApps
);
