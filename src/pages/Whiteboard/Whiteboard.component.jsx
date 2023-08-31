import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import rough from 'roughjs/bundled/rough.esm';
import { useDispatch, useSelector } from 'react-redux';
import { actions, cursorPositions, toolTypes } from '../../utils/constants';
import {
  drawElement as utilDrawElement,
  createElement as utilCreateElement,
  updateElement as utilUpdateElement,
  adjustmentRequired as utilAdjustmentRequired,
  adjustElementCoordinates as utilAdjustElementCoordinates,
  getElementAtPosition as utilGetElementAtPosition,
  getCursorForPosition as utilGetCursorForPosition,
  getResizedCoordinates as utilGetResizedCoordinates,
  updatePencilElementWhenMoving as utilUpdatePencilElementWhenMoving,
} from '../../utils/utilFunctions';
import { v4 as uuid } from 'uuid';
import { updateElement } from '../../store/whiteboardSlice';
import {
  connectWithSocketServer,
  emitCursorPosition,
  socket,
} from '../../socketConnection/socketConnection';
import Menu from './components/Menu.component';

//no need to maintain their states
let emitCursor = true;
let lastCursorPosition;

const Whiteboard = () => {
  const [action, setAction] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);

  const canvasRef = useRef();
  const textAreaRef = useRef();

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

    if (selectedElement && action === actions.WRITING) {
      return;
    }

    switch (toolType) {
      case toolTypes.RECTANGLE:
      case toolTypes.LINE:
      case toolTypes.PENCIL: {
        //CREATE DESIRED ELEMENT
        const element = utilCreateElement({
          x1: clientX,
          y1: clientY,
          x2: clientX,
          y2: clientY,
          toolType,
          id: uuid(),
        });
        setAction(actions.DRAWING);
        //SET ELEMENT TO LATEST ELEMENT
        setSelectedElement(element);
        //STORE IT IN THE GLOBAL STATE IF NOT PRESENT
        //OR ELSE UPDATE IT
        dispatch(updateElement(element));
        break;
      }
      case toolTypes.TEXT: {
        //CREATE DESIRED ELEMENT
        const element = utilCreateElement({
          x1: clientX,
          y1: clientY,
          x2: clientX,
          y2: clientY,
          toolType,
          id: uuid(),
        });
        setAction(actions.WRITING);
        //SET ELEMENT TO LATEST ELEMENT
        setSelectedElement(element);
        //STORE IT IN THE GLOBAL STATE IF NOT PRESENT
        //OR ELSE UPDATE IT
        dispatch(updateElement(element));
        break;
      }
      case toolTypes.SELECTION: {
        const element = utilGetElementAtPosition(clientX, clientY, elements);
        if (
          element &&
          (element.type === toolTypes.RECTANGLE ||
            element.type === toolTypes.TEXT ||
            element.type === toolTypes.LINE)
        ) {
          setAction(
            element.position === cursorPositions.INSIDE
              ? actions.MOVING
              : actions.RESIZING
          );
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;

          setSelectedElement({ ...element, offsetX, offsetY });
        }
        if (element && element.type === toolTypes.PENCIL) {
          setAction(actions.MOVING);

          const xOffsets = element.points.map((point) => clientX - point.x);
          const yOffsets = element.points.map((point) => clientY - point.y);
          //TODO ...elements
          setSelectedElement({ ...element, xOffsets, yOffsets });
        }
        break;
      }
    }
  };

  const handleMouseUp = () => {
    const selectedElementIndex = elements.findIndex(
      (el) => el.id === selectedElement?.id
    );
    if (selectedElementIndex !== -1) {
      if (action === actions.DRAWING || action === actions.RESIZING) {
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

    //EMIT CURSOR POSITION TO OTHER CLIENTS
    lastCursorPosition = { x: clientX, y: clientY };
    if (emitCursor) {
      emitCursorPosition({ x: clientX, y: clientY });
      emitCursor = false;
      setTimeout(() => {
        emitCursor = true;
        emitCursorPosition(lastCursorPosition);
      }, 50);
    }

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

    if (toolType === toolTypes.SELECTION) {
      const element = utilGetElementAtPosition(clientX, clientY, elements);
      event.target.style.cursor = element
        ? utilGetCursorForPosition(element.position)
        : 'default';
    }

    if (
      toolType === toolTypes.SELECTION &&
      action === actions.MOVING &&
      selectedElement.type === toolTypes.PENCIL
    ) {
      const newPoints = selectedElement.points.map((_, index) => ({
        x: clientX - selectedElement.xOffsets[index],
        y: clientY - selectedElement.yOffsets[index],
      }));
      const index = elements.findIndex((el) => el.id === selectedElement.id);
      if (index !== -1) {
        utilUpdatePencilElementWhenMoving({ index, newPoints }, elements);
      }
      return;
    }
    if (
      toolType === toolTypes.SELECTION &&
      action === actions.MOVING &&
      selectedElement
    ) {
      const { id, x1, y1, x2, y2, type, offsetX, offsetY, text } =
        selectedElement;
      const width = x2 - x1;
      const height = y2 - y1;

      const newX1 = clientX - offsetX;
      const newY1 = clientY - offsetY;

      const index = elements.findIndex((el) => el.id === selectedElement.id);
      if (index !== -1) {
        utilUpdateElement(
          {
            id,
            x1: newX1,
            y1: newY1,
            x2: newX1 + width,
            y2: newY1 + height,
            type,
            index,
            text,
          },
          elements
        );
      }
    }

    if (
      toolType === toolTypes.SELECTION &&
      action === actions.RESIZING &&
      selectedElement
    ) {
      const { id, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = utilGetResizedCoordinates(
        clientX,
        clientY,
        position,
        coordinates
      );

      const index = elements.findIndex((el) => el.id === selectedElement.id);
      if (index !== -1) {
        utilUpdateElement({ index, id, x1, x2, y1, y2, type }, elements);
      }
    }
  };

  const handleTextareaBlur = (event) => {
    const { id, x1, y1, type } = selectedElement;
    const index = elements.findIndex((el) => el.id === selectedElement.id);
    if (index !== -1) {
      utilUpdateElement(
        { id, x1, y1, type, text: event.target.value, index },
        elements
      );
      setAction(null);
      setSelectedElement(null);
    }
  };

  return (
    <React.Fragment>
      <Menu />
      {action === actions.WRITING ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleTextareaBlur}
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
      ) : null}
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
