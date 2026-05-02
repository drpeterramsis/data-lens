import React from 'react';

export const FilterButton = ({ 
  label, 
  isActive = false, 
  onClick, 
  disabled = false,
  className = "",
  children,
  variant
}) => {
  // ONLY buttons where the label contains the word "Filter" or "Filters" get the yellow style
  const content = children || label;
  
  const checkFilter = (val) => {
    if (typeof val === 'string') return val.toLowerCase().includes('filter');
    if (Array.isArray(val)) return val.some(item => checkFilter(item));
    if (React.isValidElement(val)) return checkFilter(val.props.children);
    return false;
  };

  const isFilter = variant === 'filter' || checkFilter(content);
  
  const btnClass = isFilter ? 'btn-filters' : 'tab-btn';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${btnClass} group
        ${isActive ? 'active' : ''}
        ${className}
      `}
    >
      {content}
    </button>
  );
};
