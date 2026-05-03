import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable
} from '@dnd-kit/sortable';
import {
  restrictToVerticalAxis,
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Save, 
  AlertCircle, 
  Shield, 
  CheckCircle2,
  LayoutDashboard,
  Phone,
  BarChart2,
  TrendingUp,
  Map as MapIcon,
  Link as LinkIcon,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useDashboardConfig } from '../../../context/DashboardConfigContext';
import { saveDashboardConfig, getLatestSHA } from '../../../services/githubService';

// Helper to get Lucide icon based on icon string
const getMenuIcon = (iconName) => {
  switch (iconName) {
    case 'dashboard': return <LayoutDashboard size={18} />;
    case 'phone': return <Phone size={18} />;
    case 'bar_chart': return <BarChart2 size={18} />;
    case 'trending_up': return <TrendingUp size={18} />;
    case 'map': return <MapIcon size={18} />;
    case 'link': return <LinkIcon size={18} />;
    case 'school': return <GraduationCap size={18} />;
    case 'shield': return <Shield size={18} />;
    default: return <LayoutDashboard size={18} />;
  }
};

const DEFAULT_GROUPS = [
  { id: 'grp_main', label: 'Main', color: '#3B82F6', order: 1, visible: true, collapsible: false, defaultCollapsed: false },
  { id: 'grp_analytics', label: 'Analytics', color: '#10B981', order: 2, visible: true, collapsible: true, defaultCollapsed: false },
  { id: 'grp_resources', label: 'Resources', color: '#EC4899', order: 3, visible: true, collapsible: true, defaultCollapsed: false },
  { id: 'grp_admin', label: 'Administration', color: '#8B5CF6', order: 4, visible: true, collapsible: false, defaultCollapsed: false, adminOnly: true }
];

const DEFAULT_MENU_ITEMS = [
  { id: 'menu_dashboard', label: 'Dashboard', icon: 'dashboard', route: '/dashboard', order: 1, visible: true, adminOnly: false, groupId: 'grp_main' },
  { id: 'menu_call_detailing', label: 'Call Detailing', icon: 'phone', route: '/tools/call-detailing', order: 2, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales_analyzer', label: 'ATR Sales Analyzer', icon: 'bar_chart', route: '/sales-analyzer', order: 3, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_sales_forecast', label: 'Sales Forecast', icon: 'trending_up', route: '/tools/sales-forecast', order: 4, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_routing', label: 'Routing Analyzer', icon: 'map', route: '/routing-analyzer', order: 5, visible: true, adminOnly: false, groupId: 'grp_analytics' },
  { id: 'menu_library', label: 'Library', icon: 'link', route: '/library', order: 6, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_skillzaty', label: 'Skill-Zaty', icon: 'school', route: '/skill-zaty', order: 7, visible: true, adminOnly: false, groupId: 'grp_resources' },
  { id: 'menu_admin_settings', label: 'Admin Settings', icon: 'shield', route: '/admin-settings', order: 8, visible: true, adminOnly: true, groupId: 'grp_admin' }
];

const Toggle = ({ value, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!value)}
    className={`w-10 h-5 rounded-full transition-colors relative ${value ? 'bg-emerald-500' : 'bg-slate-300'}`}
  >
    <div className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-transform ${value ? 'left-5' : 'left-0.5'}`} />
  </button>
);

const GroupEditorModal = ({ isOpen, onClose, onSave, group }) => {
  const [label, setLabel] = useState(group?.label || '');
  const [icon, setIcon] = useState(group?.icon || '📁');
  const [color, setColor] = useState(group?.color || '#3B82F6');
  const [collapsible, setCollapsible] = useState(group?.collapsible ?? true);
  const [adminOnly, setAdminOnly] = useState(group?.adminOnly ?? false);

  useEffect(() => {
    setLabel(group?.label || '');
    setIcon(group?.icon || '📁');
    setColor(group?.color || '#3B82F6');
    setCollapsible(group?.collapsible ?? true);
    setAdminOnly(group?.adminOnly ?? false);
  }, [group, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">{group ? 'Edit Group' : 'Add New Group'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Group Name *</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="e.g. Analytics"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">Icon (emoji)</label>
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={2}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-500 mb-1">Color</label>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full h-9 p-0.5 border border-slate-200 rounded-lg focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-medium text-slate-700">Collapsible in sidebar</span>
            <Toggle value={collapsible} onChange={setCollapsible} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Admin Only 👑</span>
            <Toggle value={adminOnly} onChange={setAdminOnly} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">
            Cancel
          </button>
          <button
            onClick={() => {
              if (!label.trim()) return;
              onSave({ label: label.trim(), icon, color, collapsible, adminOnly });
            }}
            disabled={!label.trim()}
            className="px-4 py-2 text-sm font-bold bg-amber-400 text-amber-900 hover:bg-amber-500 disabled:opacity-50 rounded-lg"
          >
            {group ? 'Save Changes' : 'Add Group'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SortableGroupRow = ({ group, itemCount, onEdit, onToggleVisible }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl transition-all hover:border-slate-300 hover:shadow-soft group mb-2">
      <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600" {...attributes} {...listeners}>
        <GripVertical size={18} />
      </div>
      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: group.color }} />
      <span className="text-lg w-6 text-center">{group.icon}</span>
      
      <div className="flex-1 flex flex-col justify-center">
        <span className="text-sm font-bold text-slate-700">{group.label}</span>
        <span className="text-[10px] text-slate-400 font-medium">
          {itemCount} items
          {group.adminOnly && ' • 👑 Admin'}
          {!group.visible && ' • 🚫 Hidden'}
        </span>
      </div>

      {group.collapsible && (
        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded-full">collapsible</span>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onToggleVisible} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg" title={group.visible ? 'Hide' : 'Show'}>
          {group.visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
        <button onClick={onEdit} className="px-2.5 py-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">
          Edit
        </button>
      </div>
    </div>
  );
};

const SortableMenuItemRow = ({ item, groups, onChangeGroup, onToggleVisible }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl transition-all hover:border-slate-300 hover:shadow-soft mb-2
        ${!item.visible ? 'bg-slate-50 opacity-60' : ''}
        ${item.adminOnly ? 'border-amber-100 bg-amber-50/30' : ''}`}
    >
      <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600" {...attributes} {...listeners}>
        <GripVertical size={18} />
      </div>

      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.adminOnly ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
        {getMenuIcon(item.icon)}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <span className="text-sm font-bold text-slate-700 truncate">{item.label}</span>
        <span className="text-[10px] text-slate-400 font-medium truncate">{item.route}</span>
      </div>

      <select
        className="text-[11px] font-medium px-2 py-1.5 border border-slate-200 rounded-lg text-slate-600 bg-slate-50 hover:border-slate-300 focus:outline-none focus:border-amber-400"
        value={item.groupId || ''}
        onChange={(e) => onChangeGroup(item.id, e.target.value)}
      >
        <option value="">-- No Group --</option>
        {groups.map(g => (
          <option key={g.id} value={g.id}>{g.icon} {g.label}</option>
        ))}
      </select>

      {item.adminOnly && (
        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-black uppercase rounded-full shrink-0">
          👑 Admin
        </span>
      )}

      <button
        type="button"
        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors shrink-0
          ${item.visible ? 'text-emerald-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-200'}
        `}
        onClick={() => onToggleVisible(item.id)}
        disabled={item.id === 'menu_dashboard'}
        title={item.visible ? 'Hide from menu' : 'Show in menu'}
      >
        {item.visible ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  );
};

const SidebarMenuTab = () => {
  const { config, setConfig, loading } = useDashboardConfig();
  const [groups, setGroups] = useState(config?.sidebarGroups || DEFAULT_GROUPS);
  const [menuItems, setMenuItems] = useState(() => {
    const fromConfig = config?.sidebarMenu;
    if (fromConfig && fromConfig.length > 0) {
      return [...fromConfig].sort((a, b) => a.order - b.order);
    }
    return DEFAULT_MENU_ITEMS;
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [message, setMessage] = useState('');
  
  const { user: currentUser } = useAuth();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (config) {
      if (config.sidebarGroups && config.sidebarGroups.length > 0) {
        setGroups([...config.sidebarGroups].sort((a, b) => a.order - b.order));
      }
      if (config.sidebarMenu && config.sidebarMenu.length > 0) {
        setMenuItems([...config.sidebarMenu].sort((a, b) => a.order - b.order));
      }
    }
  }, [config]);

  const handleGroupDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = groups.findIndex(g => g.id === active.id);
    const newIndex = groups.findIndex(g => g.id === over.id);
    const reordered = arrayMove(groups, oldIndex, newIndex).map((g, i) => ({ ...g, order: i + 1 }));
    setGroups(reordered);
    setIsDirty(true);
  };

  const handleItemDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    
    const oldIndex = menuItems.findIndex(i => i.id === active.id);
    const newIndex = menuItems.findIndex(i => i.id === over.id);
    const reordered = arrayMove(menuItems, oldIndex, newIndex).map((item, i) => ({ ...item, order: i + 1 }));
    setMenuItems(reordered);
    setIsDirty(true);
  };

  const handleChangeItemGroup = (itemId, newGroupId) => {
    setMenuItems(prev => prev.map(item => item.id === itemId ? { ...item, groupId: newGroupId } : item));
    setIsDirty(true);
  };

  const handleToggleItemVisible = (itemId) => {
    if (itemId === 'menu_dashboard') return;
    setMenuItems(prev => prev.map(item => item.id === itemId ? { ...item, visible: !item.visible } : item));
    setIsDirty(true);
  };

  const handleToggleGroupVisible = (groupId) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, visible: !g.visible } : g));
    setIsDirty(true);
  };

  const handleSaveGroup = (groupData) => {
    if (editingGroup) {
      setGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, ...groupData } : g));
    } else {
      const newGroup = { id: 'grp_' + Date.now(), order: groups.length + 1, visible: true, collapsible: true, defaultCollapsed: false, adminOnly: false, ...groupData };
      setGroups(prev => [...prev, newGroup]);
    }
    setGroupModalOpen(false);
    setEditingGroup(null);
    setIsDirty(true);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const currentSha = await getLatestSHA('src/data/dashboardConfig.json');
      const updatedConfig = {
        ...config,
        sidebarGroups: groups,
        sidebarMenu: menuItems,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.fullName || 'Admin'
      };

      const success = await saveDashboardConfig(updatedConfig, currentSha, 'Admin: Update sidebar menu groups & order');
      if (success) {
        setConfig(updatedConfig, currentSha);
        setIsDirty(false);
        setMessage('Sidebar menu saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const getItemsByGroup = (groupId) => menuItems.filter(item => item.groupId === groupId).sort((a, b) => a.order - b.order);
  const ungroupedItems = menuItems.filter(item => !item.groupId || !groups.find(g => g.id === item.groupId));

  if (loading) {
    return <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" /></div>;
  }

  return (
    <div className="animate-fade-in space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">Sidebar Menu Settings</h3>
          <p className="text-xs text-slate-500 font-medium mt-1">Manage categories and menu items</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg animate-pulse">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-[10px] font-black text-amber-600 uppercase">Unsaved Changes</span>
          </div>
        )}
      </div>

      {/* SECTION A: GROUP MANAGER */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center justify-between mx-1 mb-4">
          <div className="flex flex-col">
            <h4 className="font-bold text-slate-700">📂 Menu Groups</h4>
            <span className="text-[11px] text-slate-500">Reorder and manage sidebar category groups</span>
          </div>
          <button 
            onClick={() => { setEditingGroup(null); setGroupModalOpen(true); }}
            className="px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-sm font-bold text-slate-700 rounded-lg shadow-sm transition-all"
          >
            + Add Group
          </button>
        </div>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={groups.map(g => g.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {groups.sort((a, b) => a.order - b.order).map(group => (
                <SortableGroupRow
                  key={group.id}
                  group={group}
                  itemCount={getItemsByGroup(group.id).length}
                  onEdit={() => { setEditingGroup(group); setGroupModalOpen(true); }}
                  onToggleVisible={() => handleToggleGroupVisible(group.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* SECTION B: MENU ITEMS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col mb-6 mx-1">
          <h4 className="font-bold text-slate-700">🧭 Menu Items</h4>
          <span className="text-[11px] text-slate-500">Drag items to reorder them within the list, or select a group. Note: Sorting within groups is visual only; all items share one sorting list.</span>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={menuItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
            
            <div className="space-y-6">
              {groups.sort((a, b) => a.order - b.order).map(group => {
                const items = getItemsByGroup(group.id);
                if (items.length === 0) return null;

                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 px-3 py-1.5 mb-3 bg-white border-l-4 rounded-r-lg shadow-sm" style={{ borderLeftColor: group.color }}>
                      <span>{group.icon}</span>
                      <span className="text-[11px] font-black text-slate-600 tracking-wider uppercase">{group.label}</span>
                      <span className="text-[10px] text-slate-400 font-medium ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">{items.length} items</span>
                      {group.adminOnly && <span className="ml-auto text-xs">👑</span>}
                      {!group.visible && <span className="ml-2 px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-400 rounded-sm">Hidden</span>}
                    </div>
                    <div className="pl-2">
                      {items.map(item => (
                        <SortableMenuItemRow key={item.id} item={item} groups={groups} onChangeGroup={handleChangeItemGroup} onToggleVisible={handleToggleItemVisible} />
                      ))}
                    </div>
                  </div>
                );
              })}

              {ungroupedItems.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-3 py-1.5 mb-3 bg-white border-l-4 rounded-r-lg shadow-sm" style={{ borderLeftColor: '#94A3B8' }}>
                    <span>📌</span>
                    <span className="text-[11px] font-black text-slate-600 tracking-wider uppercase">Ungrouped</span>
                    <span className="text-[10px] text-slate-400 font-medium ml-1 bg-slate-100 px-1.5 py-0.5 rounded-full">{ungroupedItems.length} items</span>
                  </div>
                  <div className="pl-2">
                    {ungroupedItems.map(item => (
                      <SortableMenuItemRow key={item.id} item={item} groups={groups} onChangeGroup={handleChangeItemGroup} onToggleVisible={handleToggleItemVisible} />
                    ))}
                  </div>
                </div>
              )}
            </div>

          </SortableContext>
        </DndContext>
      </div>

      <GroupEditorModal
        isOpen={groupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSave={handleSaveGroup}
        group={editingGroup}
      />

      {/* FLOAT SAVE BAR */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center justify-between gap-6 px-6 py-4 bg-slate-800 text-white rounded-2xl shadow-2xl z-40 border border-slate-700 w-[90%] max-w-2xl animate-in slide-in-from-bottom-5">
          <span className="font-medium text-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            You have unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-[#FFC300] hover:bg-[#FFD700] text-[#7B0000] font-black rounded-xl transition-all"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      )}

      {message && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full shadow-lg z-50 animate-in slide-in-from-bottom-5">
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{message}</span>
        </div>
      )}
    </div>
  );
};

export default SidebarMenuTab;
