import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit';
import whiteboardReducer from './whiteboardSlice';

//STORE (GLOBAL STATE)
export const store = configureStore({
  reducer: {
    whiteboard: whiteboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        //we shouldn't store the classes
        //returned by generateRectangle()
        //but we are storing it because it still works
        ignoreActions: ['whiteboard/setElements'],
        ignoredPaths: ['whiteboard.elements'],
      },
    }),
});
