import rough from 'roughjs/bundled/rough.esm';
import { cursorPositions, toolTypes } from './constants';
import { store } from '../store/store';
import { setElements } from '../store/whiteboardSlice';
import { emitElementUpdate } from '../socketConnection/socketConnection';
import { getStroke } from 'perfect-freehand';

const generator = rough.generator();
const generateRectangle = ({ x1, y1, x2, y2 }) => {
  return generator.rectangle(x1, y1, x2 - x1, y2 - y1);
};
const generateLine = ({ x1, y1, x2, y2 }) => {
  return generator.line(x1, y1, x2, y2);
};

///////////////////////////EXPORTED FUNCTIONS////////////////////////////////
export const createElement = ({ x1, y1, x2, y2, toolType, id, text }) => {
  let roughElement;

  switch (toolType) {
    case toolTypes.RECTANGLE:
      //creates a js class
      roughElement = generateRectangle({ x1, y1, x2, y2 });
      return {
        id: id,
        roughElement,
        type: toolType,
        x1,
        y1,
        x2,
        y2,
      };
    case toolTypes.LINE:
      roughElement = generateLine({ x1, x2, y1, y2 });
      return {
        id: id,
        roughElement,
        type: toolType,
        x1,
        y1,
        x2,
        y2,
      };
    case toolTypes.PENCIL:
      return {
        id,
        type: toolType,
        points: [{ x: x1, y: y1 }],
      };
    case toolTypes.TEXT:
      return {
        id,
        type: toolType,
        x1,
        y1,
        x2,
        y2,
        text: text || '',
      };
    default:
      throw new Error('Something went wrong when creating element');
  }
};

export const updateElement = (
  { index, id, x1, x2, y1, y2, type, text },
  elements
) => {
  const elementsCopy = [...elements];
  switch (type) {
    case toolTypes.RECTANGLE:
    case toolTypes.LINE:
      const updatedElement = createElement({
        id,
        x1,
        x2,
        y1,
        y2,
        toolType: type,
      });
      elementsCopy[index] = updatedElement;
      store.dispatch(setElements(elementsCopy));
      //TODO IF SOMETHING GOES WRONG UNCOMMENT THE BELOW LINE AND COMMENT THE NEXT TO BELOW LINE
      //emit update to server
      emitElementUpdate(updatedElement);
      // emitElementUpdate(elementsCopy);
      break;

    case toolTypes.PENCIL:
      elementsCopy[index] = {
        ...elementsCopy[index],
        points: [...elementsCopy[index].points, { x: x2, y: y2 }],
      };

      // const updatedPencilElement = elementsCopy[index];
      store.dispatch(setElements(elementsCopy));

      //TODO EMIT ONLY UPDATEDELEMENT IF DOESN'T WORK
      emitElementUpdate(elementsCopy[index]);
      // emitElementUpdate(elementsCopy);
      break;
    case toolTypes.TEXT:
      const textWidth = document
        .getElementById('canvas')
        .getContext('2d')
        .measureText(text).width;
      const textHeight = 24;

      elementsCopy[index] = {
        ...createElement({
          id,
          x1,
          y1,
          x2: x1 + textWidth,
          y2: y1 + textHeight,
          toolType: type,
          text,
        }),
      };

      //TODO
      // const updatedTextElement = elementsCopy[index];
      store.dispatch(setElements(elementsCopy));
      //TODO EMIT ONLY UPDATEDELEMENT IF DOESN'T WORK
      emitElementUpdate(elementsCopy[index]);
      // emitElementUpdate(elementsCopy);
      break;

    default:
      throw new Error('Something went wrong while updating element');
      break;
  }
};

export const updatePencilElementWhenMoving = (
  { index, newPoints },
  elements
) => {
  const elementsCopy = [...elements];

  elementsCopy[index] = {
    ...elementsCopy[index],
    points: newPoints,
  };

  const updatedPencilElement = elementsCopy[index];
  store.dispatch(setElements(elementsCopy));
  emitElementUpdate(updatedPencilElement);
};

const drawPencilElement = (context, element) => {
  //draw using the points array present in the element
  const myStroke = getStroke(element.points, {
    size: 5,
  });
  const pathData = getSvgPathFromStroke(myStroke);
  const myPath = new Path2D(pathData);
  context.fill(myPath);
};
const drawTextElement = (context, element) => {
  //means text will render to right and bottom from x1,y1
  context.textBaseline = 'top';
  context.font = '24px sans-serif';
  context.fillText(element.text, element.x1, element.y1);
};

export const drawElement = ({ roughCanvas, context, element }) => {
  switch (element.type) {
    case toolTypes.RECTANGLE:
    case toolTypes.LINE:
      return roughCanvas.draw(element.roughElement);
    case toolTypes.PENCIL:
      drawPencilElement(context, element);
      break;
    case toolTypes.TEXT:
      drawTextElement(context, element);
      break;
    default:
      throw new Error('Something went wrong while drawing element');
      break;
  }
};

//LOGIC FOR FINDING SELECTED ELEMENT
const nearPoint = (x, y, x1, y1, cursorPosition) => {
  const OFFSET = 5;
  //EVEN IF USER DOESN'T EXACTLY POINT AT THE BOUNDARY
  //OF ELEMENT WE NEED TO ADJUST IT TO NEAREST
  //ELEMENT POINT
  return Math.abs(x - x1) < OFFSET && Math.abs(y - y1) < OFFSET
    ? cursorPosition
    : null;
};
const distance = (a, b) => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

const onLine = ({ x1, y1, x2, y2, x, y, maxOffset = 1 }) => {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };

  const offset = distance(a, b) - (distance(a, c) + distance(b, c));
  return Math.abs(offset) < maxOffset ? cursorPositions.INSIDE : null;
};

const positionWithinElement = (x, y, element) => {
  const { type, x1, y1, x2, y2 } = element;
  switch (type) {
    case toolTypes.RECTANGLE: {
      const topLeft = nearPoint(x, y, x1, y1, cursorPositions.TOP_LEFT);
      const topRight = nearPoint(x, y, x2, y1, cursorPositions.TOP_RIGHT);
      const bottomLeft = nearPoint(x, y, x1, y2, cursorPositions.BOTTOM_LEFT);
      const bottomRight = nearPoint(x, y, x2, y2, cursorPositions.BOTTOM_RIGHT);
      const inside =
        x >= x1 && x <= x2 && y >= y1 && y <= y2
          ? cursorPositions.INSIDE
          : null;
      return topLeft || topRight || bottomLeft || bottomRight || inside;
    }

    case toolTypes.TEXT:
      return x >= x1 && x <= x2 && y >= y1 && y <= y2
        ? cursorPositions.INSIDE
        : null;

    case toolTypes.LINE:
      const on = onLine({ x1, y1, x2, y2, x, y });
      const start = nearPoint(x, y, x1, y1, cursorPositions.START);
      const end = nearPoint(x, y, x2, y2, cursorPositions.END);
      return start || end || on;

    case toolTypes.PENCIL:
      const betweenAnyPoint = element.points.some((point, index) => {
        const nextPoint = element.points[index + 1];
        if (!nextPoint) return false;
        return onLine({
          x1: point.x,
          y1: point.y,
          x2: nextPoint.x,
          y2: nextPoint.y,
          x,
          y,
          maxOffset: 5,
        });
      });
      return betweenAnyPoint ? cursorPositions.INSIDE : null;
    default:
      break;
  }
};
export const getElementAtPosition = (x, y, elements) => {
  return elements
    .map((el) => ({
      ...el,
      //check if point is inside this element or not
      position: positionWithinElement(x, y, el),
    }))
    .find((el) => el.position !== null && el.position !== undefined);
};

export const getCursorForPosition = (cursorPosition) => {
  switch (cursorPosition) {
    case cursorPositions.TOP_LEFT:
    case cursorPositions.BOTTOM_RIGHT:
    case cursorPositions.START:
    case cursorPositions.END:
      return 'nwse-resize';
    case cursorPositions.TOP_RIGHT:
    case cursorPositions.BOTTOM_LEFT:
      return 'nesw-resize';
    default:
      return 'move';
  }
};

//LOGIC FOR RESIZING
export const getResizedCoordinates = (
  clientX,
  clientY,
  position,
  coordinates
) => {
  const { x1, y1, x2, y2 } = coordinates;
  switch (position) {
    case cursorPositions.START:
    case cursorPositions.TOP_LEFT:
      return { x1: clientX, y1: clientY, x2, y2 };
    case cursorPositions.TOP_RIGHT:
      return { x1, y1: clientY, x2: clientX, y2 };
    case cursorPositions.BOTTOM_LEFT:
      return { x1: clientX, y1, x2, y2: clientY };
    case cursorPositions.END:
    case cursorPositions.BOTTOM_RIGHT:
      return { x1, y1, x2: clientX, y2: clientY };
    default:
      return null;
  }
};

// SWAPING COORDINATES IF USER STARTS DRAWING FROM BOTTOM TO TOP
//OR FROM RIGHT TO LEFT
export const adjustmentRequired = (type) => {
  return [toolTypes.RECTANGLE, toolTypes.LINE].includes(type);
};

export const adjustElementCoordinates = (element) => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === toolTypes.RECTANGLE) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  }

  if (type === toolTypes.LINE) {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
};

//HELPER FUNCTIONS FOR RENDERING PENCIL DRAWING
const average = (a, b) => (a + b) / 2;

export const getSvgPathFromStroke = (points, closed = true) => {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += 'Z';
  }

  return result;
};
