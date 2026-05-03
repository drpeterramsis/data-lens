import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Eye, EyeOff, Edit2 } from 'lucide-react';

const SortableCategoryItem = ({ 
  category, 
  onEdit, 
  onToggleVisible 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-2xl transition-all ${
        isDragging ? 'shadow-2xl border-amber-500 scale-[1.02] bg-amber-50/30' : 'hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
        title="Drag to reorder"
      >
        <GripVertical size={20} />
      </div>

      {/* Category Icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0"
        style={{ backgroundColor: `${category.color}15`, color: category.color }}
      >
        {category.icon}
      </div>

      {/* Category Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-700 truncate">{category.name}</h4>
          {category.adminOnly && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full italic">
              Admin Only
            </span>
          )}
        </div>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
          {category.modules?.length || 0} Modules
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button 
          onClick={() => onToggleVisible(category.id)}
          className={`p-2 rounded-xl transition-all ${
            category.visible 
              ? 'text-slate-400 hover:text-amber-500 hover:bg-amber-50' 
              : 'text-red-400 bg-red-50'
          }`}
          title={category.visible ? 'Visible' : 'Hidden'}
        >
          {category.visible ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
        <button 
          onClick={() => onEdit(category)}
          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
          title="Edit Details"
        >
          <Edit2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default SortableCategoryItem;
