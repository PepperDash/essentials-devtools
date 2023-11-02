import { AnyAction, Reducer, combineReducers, configureStore } from '@reduxjs/toolkit';
import { oneSliceToRuleThemAll } from './apiSlice';

const allReducers = combineReducers({
    [oneSliceToRuleThemAll.apiSlice.reducerPath]:
    oneSliceToRuleThemAll.apiSlice.reducer,
})

const rootReducer: Reducer = (state: RootState, action: AnyAction) => {
    if (action.type === 'commonUI/resetState') {
      state = {} as RootState;
    }
    return allReducers(state, action);
  };

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        .concat(oneSliceToRuleThemAll.apiSlice.middleware)
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
