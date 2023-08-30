import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import { useDispatch, useSelector } from 'react-redux';
import { actions, toolTypes } from '../../utils/constants';
import {
  drawElement as utilDrawElement,
  createElement as utilCreateElement,
  updateElement as utilUpdateElement,
  adjustmentRequired as utilAdjustmentRequired,
  adjustElementCoordinates as utilAdjustElementCoordinates,
} from '../../utils/utilFunctions';
import { v4 as uuid } from 'uuid';
import { updateElement } from '../../store/whiteboardSlice';
import {
  connectWithSocketServer,
  socket,
} from '../../socketConnection/socketConnection';
import Menu from './components/Menu.component';

//KEEPING THIS OUTSIDE OF MY COMPONENT AND NOT STORING IT AS STATE
//BECAUSE I DON'T WANT MY COMPONENT TO RE RENDER WHEN IT'S VALUE CHANGES
// let selectedElement;
// const setSelectedElement = (el) => {
//   selectedElement = el;
// };

const Whiteboard = () => {
  const [action, setAction] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

  const canvasRef = useRef();
  // const textAreaRef = useRef();

  const toolType = useSelector((state) => state.whiteboard.tool);
  const elements = useSelector((state) => state.whiteboard.elements);
  const dispatch = useDispatch();

  //SIDE EFFECT
  useEffect(() => {
    connectWithSocketServer();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      utilDrawElement({ roughCanvas, context: ctx, element });
    });
  }, [elements]);

  ////////////////////////EVENT HANDLERS////////////////
  const handleMouseDown = (e) => {
    //GET MOUSE TOUCHDOWN POSITION
    const { clientX, clientY } = e;

    // if (!selectedElement && action === actions.WRITING) {
    //   return;
    // }

    //CREATE DESIRED ELEMENT
    const element = utilCreateElement({
      x1: clientX,
      y1: clientY,
      x2: clientX,
      y2: clientY,
      toolType,
      id: uuid(),
    });

    switch (toolType) {
      case toolTypes.RECTANGLE:
      case toolTypes.LINE:
      case toolTypes.PENCIL: {
        setAction(actions.DRAWING);
        break;
      }
      case toolTypes.TEXT: {
        setAction(actions.WRITING);
        break;
      }
    }

    //SET ELEMENT TO LATEST ELEMENT
    setSelectedElement(element);

    //STORE IT IN THE GLOBAL STATE IF NOT PRESENT
    //OR ELSE UPDATE IT
    dispatch(updateElement(element));
  };

  const handleMouseUp = () => {
    const selectedElementIndex = elements.findIndex(
      (el) => el.id === selectedElement?.id
    );
    if (selectedElementIndex !== -1) {
      if (action === actions.DRAWING) {
        //If type is RECTANGLE OR LINE AND USER IS DRAWING FROM BOTTOM TO TOP
        //SWAP THE COORDINATES
        if (utilAdjustmentRequired(elements[selectedElementIndex].type)) {
          const { x1, y1, x2, y2 } = utilAdjustElementCoordinates(
            elements[selectedElementIndex]
          );
          utilUpdateElement(
            {
              index: selectedElementIndex,
              id: selectedElement.id,
              x1,
              x2,
              y1,
              y2,
              type: elements[selectedElementIndex].type,
            },
            elements
          );
        }
      }
    }
    //NO MOUSE MOVE SO RESET ELEMENT
    setAction(null);
    setSelectedElement(null);
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = event;
    if (action === actions.DRAWING) {
      const index = elements.findIndex((el) => el.id === selectedElement.id);
      if (index !== -1) {
        utilUpdateElement(
          {
            index,
            id: elements[index].id,
            x1: elements[index].x1,
            x2: clientX,
            y1: elements[index].y1,
            y2: clientY,
            type: elements[index].type,
          },
          elements
        );
      }
    }
  };

  // const handleTextAreaBlur = (event) => {
  //   const { id, x1, y1, type } = selectedElement;
  //   const index = elements.findIndex((el) => el.id === selectedElement.id);
  //   if (index !== -1) {
  //     utilUpdateElement(
  //       { id, x1, y1, type, text: event.target.value },
  //       elements
  //     );
  //   }
  //   setAction(null);
  //   setSelectedElement(null);
  // };

  return (
    <React.Fragment>
      <Menu />
      {/*{action === actions.WRITING ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleTextAreaBlur}
          style={{
            position: 'absolute',
            top: selectedElement.y1 - 3,
            left: selectedElement.x1,
            font: '24px sans-serif',
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,
            resize: 'auto',
            overflow: 'hidden',
            whiteSpace: 'pre',
            background: 'transparent',
          }}
        ></textarea>
        ) : null}*/}
      <canvas
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        id='canvas'
      />
    </React.Fragment>
  );
};

export default Whiteboard;
