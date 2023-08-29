import React from 'react';
import IconButton from './IconButton.component';
import rectangleIcon from '../../../assets/icons/rectangle.svg';
import { toolTypes } from '../../../utils/constants';

const Menu = () => {
  return (
    <div className='menu_container'>
      <IconButton src={rectangleIcon} type={toolTypes.RECTANGLE} />
    </div>
  );
};

export default Menu;
