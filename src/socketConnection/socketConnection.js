import { io } from 'socket.io-client';

import { SERVER_URL } from '../utils/serverUrl';
import { store } from '../store/store';
import { setElements, updateElement } from '../store/whiteboardSlice';

export let socket;

export const connectWithSocketServer = () => {
  socket = io(SERVER_URL);

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
};

export const emitElementUpdate = (elementData) => {
  socket.emit('element-update', elementData);
};
export const emitClearWhiteboard = () => {
  socket.emit('whiteboard-clear');
};
