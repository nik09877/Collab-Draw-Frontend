import React from 'react';
import IconButton from './IconButton.component';
import rectangleIcon from '../../../assets/icons/rectangle.svg';
import lineIcon from '../../../assets/icons/line.svg';
import rubberIcon from '../../../assets/icons/rubber.svg';
import pencilIcon from '../../../assets/icons/pencil.svg';
import textIcon from '../../../assets/icons/text.svg';

import { toolTypes } from '../../../utils/constants';

const Menu = () => {
  return (
    <div className='menu_container'>
      <IconButton src={rectangleIcon} type={toolTypes.RECTANGLE} />
      <IconButton src={lineIcon} type={toolTypes.LINE} />
      <IconButton src={rubberIcon} isRubber={true} />
      <IconButton src={pencilIcon} type={toolTypes.PENCIL} />
      <IconButton src={textIcon} type={toolTypes.TEXT} />
    </div>
  );
};

export default Menu;
