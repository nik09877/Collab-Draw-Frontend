import React from 'react';
import { useSelector } from 'react-redux';
import cursorIcon from '../../../assets/icons/selection.svg';
const CursorOverLay = () => {
  const cursors = useSelector((state) => state.cursor.cursors);

  return (
    <>
      {cursors.map((c) => (
        <img
          key={c.userId}
          className='cursor'
          style={{
            position: 'absolute',
            left: c.x,
            top: c.y,
            width: '30px',
          }}
          src={cursorIcon}
        />
      ))}
    </>
  );
};

export default CursorOverLay;
