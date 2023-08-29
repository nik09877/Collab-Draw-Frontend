import rough from 'roughjs/bundled/rough.esm';
import { toolTypes } from './constants';
import { store } from '../store/store';
import { setElements } from '../store/whiteboardSlice';

const generator = rough.generator();

const generateRectangle = ({ x1, y1, x2, y2 }) => {
  return generator.rectangle(x1, y1, x2 - x1, y2 - y1);
};

///////////////////////////EXPORTED FUNCTIONS////////////////////////////////
export const createElement = ({ x1, y1, x2, y2, toolType, id }) => {
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
    default:
      throw new Error('Something went wrong when creating element');
  }
};

export const updateElement = (
  { index, id, x1, x2, y1, y2, type },
  elements
) => {
  const elementsCopy = [...elements];
  switch (type) {
    case toolTypes.RECTANGLE:
      const updateElement = createElement({
        id,
        x1,
        x2,
        y1,
        y2,
        toolType: type,
      });
      elementsCopy[index] = updateElement;
      store.dispatch(setElements(elementsCopy));

      break;

    default:
      throw new Error('Something went wrong while updating element');
      break;
  }
};

export const drawElement = ({ roughCanvas, context, element }) => {
  switch (element.type) {
    case toolTypes.RECTANGLE:
      return roughCanvas.draw(element.roughElement);
      break;

    default:
      throw new Error('Something went wrong while drawing element');
      break;
  }
};

export const adjustmentRequired = (type) => {
  return [toolTypes.RECTANGLE].includes(type);
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
};
