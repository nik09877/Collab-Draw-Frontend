import { io } from 'socket.io-client';

import { store } from '../store/store';
import { setElements, updateElement } from '../store/whiteboardSlice';
import {
  removeCursorPosition,
  updateCursorPosition,
} from '../store/cursorSlice';

export let socket;

export const connectWithSocketServer = () => {
  socket = io(process.env.REACT_APP_SERVER_URL);

  socket.on('connect', () => {
    console.log('connected to socket.io server');
  });

  //listen to when server sends initial whiteboard state
  socket.on('whiteboard-state', (elements) => {
    store.dispatch(setElements(elements));
  });

  ////listen to when server sends updated whiteboard state
  socket.on('element-update', (elementData) => {
    //TODO IF SOMETHING GOES WRONG UNCOMMENT THE BELOW LINE AND COMMENT THE NEXT TO BELOW LINE
    store.dispatch(updateElement(elementData));
    // store.dispatch(setElements(elementData));
  });

  socket.on('whiteboard-clear', () => {
    store.dispatch(setElements([]));
  });

  socket.on('cursor-position', (cursorData) => {
    store.dispatch(updateCursorPosition(cursorData));
  });
  socket.on('user-disconnected', (disconnectedUserId) => {
    store.dispatch(removeCursorPosition(disconnectedUserId));
  });
};

export const emitElementUpdate = (elementData) => {
  socket.emit('element-update', elementData);
};
export const emitClearWhiteboard = () => {
  socket.emit('whiteboard-clear');
};
export const emitCursorPosition = (cursorData) => {
  socket.emit('cursor-position', cursorData);
};
