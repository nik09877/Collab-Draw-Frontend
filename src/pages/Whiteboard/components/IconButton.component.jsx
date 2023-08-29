import { useDispatch, useSelector } from 'react-redux';
import { setToolType } from '../../../store/whiteboardSlice';

const IconButton = ({ src, type }) => {
  const dispatch = useDispatch();
  const selectedToolType = useSelector((state) => state.whiteboard.tool);

  const handleToolChange = () => {
    dispatch(setToolType(type));
  };

  return (
    <button
      onClick={handleToolChange}
      className={
        selectedToolType === type ? 'menu_button_active' : 'menu_button'
      }
    >
      <img src={src} alt='draw-button' width='80%' height='80%' />
    </button>
  );
};

export default IconButton;
