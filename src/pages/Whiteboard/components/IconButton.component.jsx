import { useDispatch, useSelector } from 'react-redux';
import { setElements, setToolType } from '../../../store/whiteboardSlice';
import { emitClearWhiteboard } from '../../../socketConnection/socketConnection';

const IconButton = ({ src, type, isRubber }) => {
  const dispatch = useDispatch();
  const selectedToolType = useSelector((state) => state.whiteboard.tool);

  const handleToolChange = () => {
    dispatch(setToolType(type));
  };
  const handleClearCanvas = () => {
    dispatch(setElements([]));
    emitClearWhiteboard();
  };

  return (
    <button
      onClick={isRubber ? handleClearCanvas : handleToolChange}
      className={
        selectedToolType === type ? 'menu_button_active' : 'menu_button'
      }
    >
      <img src={src} alt='draw-button' width='80%' height='80%' />
    </button>
  );
};

export default IconButton;
