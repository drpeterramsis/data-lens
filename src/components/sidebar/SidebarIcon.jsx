import React from 'react';
import { resolveIcon } from '../../utils/iconResolver';

export const SidebarIcon = ({ name, size = 18, strokeWidth = 1.8, className = '' }) => {
  return resolveIcon(name, size, className);
};
