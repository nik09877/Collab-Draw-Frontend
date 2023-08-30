import rough from 'roughjs/bundled/rough.esm';
import { toolTypes } from './constants';
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
    // case toolTypes.TEXT:
    //   return {
    //     id,
    //     type: toolType,
    //     x1,
    //     y1,
    //     text: text || '',
    //   };
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
      // emitElementUpdate(updatedElement);
      emitElementUpdate(elementsCopy);
      break;

    case toolTypes.PENCIL:
      elementsCopy[index] = {
        ...elementsCopy[index],
        points: [...elementsCopy[index].points, { x: x2, y: y2 }],
      };

      // const updatedPencilElement = elementsCopy[index];
      store.dispatch(setElements(elementsCopy));

      //TODO EMIT ONLY UPDATEDELEMENT IF DOESN'T WORK
      emitElementUpdate(elementsCopy);
      break;
    // case toolTypes.TEXT:
    //   const textWidth = document
    //     .getElementById('canvas')
    //     .getContext('2d')
    //     .measureText(text).width;
    //   const textHeight = 24;
    //   elementsCopy[index] = {
    //     ...createElement({
    //       id,
    //       x1,
    //       y1,
    //       x2: x1 + textWidth,
    //       y2: y1 + textHeight,
    //       toolType: type,
    //       text,
    //     }),
    //   };
    //   //TODO
    //   // const updatedTextElement = elementsCopy[index];
    //   store.dispatch(setElements(elementsCopy));

    //   //TODO EMIT ONLY UPDATEDELEMENT IF DOESN'T WORK
    //   emitElementUpdate(elementsCopy);
    //   break;
    default:
      throw new Error('Something went wrong while updating element');
      break;
  }
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
// const drawTextElement = (context, element) => {
//   //means text will render to right and bottom from x1,y1
//   context.textBaseline = 'top';
//   context.font = '24px sans-serif';
//   context.fillText(element.text, element.x1, element.y1);
// };

export const drawElement = ({ roughCanvas, context, element }) => {
  switch (element.type) {
    case toolTypes.RECTANGLE:
    case toolTypes.LINE:
      return roughCanvas.draw(element.roughElement);
    case toolTypes.PENCIL:
      drawPencilElement(context, element);
      break;
    // case toolTypes.TEXT:
    //   drawTextElement(context, element);
    //   break;
    default:
      throw new Error('Something went wrong while drawing element');
      break;
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
