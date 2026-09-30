import {
  AnyAction,
  Reducer,
  combineReducers,
  configureStore,
} from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { oneSliceToRuleThemAll } from './apiSlice';
import { authReducer } from './auth/authSlice';
import { commonUiReducer } from './commonUi/commonUiSlice';
import { debugConsoleReducer } from './debugConsole/debugConsoleSlice';
import { routingFeedbackMiddleware } from './routingFeedbackMiddleware';
import routingFeedbackReducer from './routingFeedbackSlice';
import { websocketMiddleware } from './websocketMiddleware';
import websocketReducer from './websocketSlice';

const allReducers = combineReducers({
  [oneSliceToRuleThemAll.apiSlice.reducerPath]:
    oneSliceToRuleThemAll.apiSlice.reducer,
  auth: authReducer,
  commonUi: commonUiReducer,
  debugConsole: debugConsoleReducer,
  websocket: websocketReducer,
  routingFeedback: routingFeedbackReducer,
});

const rootReducer: Reducer = (state: RootState, action: AnyAction) => {
  if (action.type === 'commonUi/resetState') {
    state = {} as RootState;
  }
  return allReducers(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(oneSliceToRuleThemAll.apiSlice.middleware)
      .concat(websocketMiddleware)
      .concat(routingFeedbackMiddleware),
});

// Tracks window focus and connectivity for RTK Query, which is what lets polling queries use
// skipPollingIfUnfocused. No query sets refetchOnFocus/refetchOnReconnect, so this changes nothing else.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
