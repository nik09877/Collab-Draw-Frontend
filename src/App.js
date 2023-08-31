import React from 'react';
import Whiteboard from './pages/Whiteboard/Whiteboard.component';
import CursorOverLay from './pages/Whiteboard/components/CursorOverLay.component';

//COMPONENT
function App() {
  return (
    <React.Fragment>
      <Whiteboard />
      <CursorOverLay />
    </React.Fragment>
  );
}

export default App;
