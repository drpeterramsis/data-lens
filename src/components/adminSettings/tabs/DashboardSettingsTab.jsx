import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, Edit2, Plus, GripVertical, Check, Save, 
  Settings as SettingsIcon, Layout, Monitor, Trash2, 
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { getDashboardConfig, saveDashboardConfig, getLatestSHA } from '../../../services/githubService';
import CategoryEditor from '../dashboard/CategoryEditor';
import { useAuth } from '../../../context/AuthContext';

const DashboardSettingsTab = () => {
  const [config, setConfig] = useState(null);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { content, sha: latestSha } = await getDashboardConfig();
      setConfig(content);
      setSha(latestSha);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const currentSha = await getLatestSHA('src/data/dashboardConfig.json');
      const timestamp = new Date().toLocaleString();
      const success = await saveDashboardConfig(
        config, 
        currentSha, 
        `Admin: Update dashboard configuration - ${timestamp}`
      );
      
      if (success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
        setSha(currentSha);
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setConfig(prev => ({
      ...prev,
      dashboardSettings: {
        ...prev.dashboardSettings,
        [key]: value
      }
    }));
  };

  const toggleModuleVisibility = (moduleId) => {
    setConfig(prev => ({
      ...prev,
      modules: prev.modules.map(m => 
        m.id === moduleId ? { ...m, visible: !m.visible } : m
      )
    }));
  };

  const toggleCategoryVisibility = (catId) => {
    setConfig(prev => ({
      ...prev,
      categories: prev.categories.map(c => 
        c.id === catId ? { ...c, visible: !c.visible } : c
      )
    }));
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (categoryData) => {
    let updatedCategories;

    if (editingCategory) {
      // UPDATE existing
      updatedCategories = config.categories.map(cat =>
        cat.id === editingCategory.id
          ? { ...cat, ...categoryData }
          : cat
      );
    } else {
      // ADD new
      const newCategory = {
        id: 'cat_' + Date.now(),
        order: config.categories.length + 1,
        visible: true,
        modules: [],
        ...categoryData
      };
      updatedCategories = [...config.categories, newCategory];
    }

    const updatedConfig = {
      ...config,
      categories: updatedCategories,
      lastUpdated: new Date().toISOString(),
      updatedBy: currentUser?.fullName || 'Admin'
    };

    // Update local state first for immediate UI response
    setConfig(updatedConfig);
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div></div>;
  if (!config) return <div className="p-4 bg-red-50 text-red-600 rounded-lg">Error loading configuration.</div>;

  return (
    <div className="space-y-10 animate-fade-in">
      {/* SECTION A — General Display Settings */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Monitor size={18} className="text-blue-500" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Display Settings</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SettingToggle 
            label="Show Categories" 
            description="Group modules under category headers"
            active={config.dashboardSettings.showCategories}
            onToggle={(val) => updateSetting('showCategories', val)}
          />
          <SettingToggle 
            label="Show Module Descriptions" 
            description="Show subtitle text under module name"
            active={config.dashboardSettings.showModuleDescriptions}
            onToggle={(val) => updateSetting('showModuleDescriptions', val)}
          />
          <SettingToggle 
            label="Show Open Link" 
            description="Show navigation link on each card"
            active={config.dashboardSettings.showOpenLink}
            onToggle={(val) => updateSetting('showOpenLink', val)}
          />
          <SettingToggle 
            label="Category Separator" 
            description="Show divider line between categories"
            active={config.dashboardSettings.categorySeparator}
            onToggle={(val) => updateSetting('categorySeparator', val)}
          />
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-700">Grid Columns</p>
              <p className="text-xs text-slate-400">Desktop layout column count</p>
            </div>
            <select 
              value={config.dashboardSettings.gridColumns}
              onChange={(e) => updateSetting('gridColumns', parseInt(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Columns</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* SECTION B — Category Manager */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Layout size={18} className="text-purple-500" />
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Category Manager</h3>
          </div>
          <button 
            onClick={handleAddCategory}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
          >
            <Plus size={14} />
            Add Category
          </button>
        </div>
        <div className="space-y-3">
          {config.categories.sort((a,b) => a.order - b.order).map(cat => (
            <div key={cat.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-slate-200 transition-all flex items-center justify-between">
              <div className="flex items-center gap-4">
                <GripVertical className="text-slate-200 cursor-move" size={18} />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm`} style={{ backgroundColor: `${cat.color}15`, color: cat.color }}>
                  {cat.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-black text-slate-700">{cat.name}</p>
                    {cat.adminOnly && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-[9px] font-black uppercase tracking-wider">Admin Only</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{cat.modules.length} modules assigned</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleCategoryVisibility(cat.id)}
                  className={`p-2 rounded-lg transition-colors ${cat.visible ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-300 hover:bg-slate-50'}`}
                >
                  {cat.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
                <button 
                  onClick={() => handleEditCategory(cat)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <Edit2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION C — Module Visibility */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon size={18} className="text-emerald-500" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Module Visibility</h3>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Module</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Category</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Access</th>
                <th className="px-6 py-3 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {config.modules.sort((a,b) => a.order - b.order).map(mod => {
                 const cat = config.categories.find(c => c.modules.includes(mod.id));
                 return (
                  <tr key={mod.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{mod.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-700">{mod.name}</p>
                          <p className="text-[10px] text-slate-400 italic">{mod.route}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">
                        {cat ? cat.name : 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {mod.adminOnly ? (
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-tight">👑 Admin</span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Everyone</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleModuleVisibility(mod.id)}
                        className={`p-1.5 rounded-lg transition-colors ${mod.visible ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                      >
                        {mod.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                  </tr>
                 );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Floating Save Footer */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 -mx-8 -mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {message && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
              <CheckCircle2 size={16} />
              {message}
            </div>
          )}
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-[#FFC300] hover:bg-[#FFD700] disabled:opacity-50 text-[#7B0000] font-black rounded-xl shadow-lg shadow-amber-400/30 transition-all hover:scale-105 active:scale-95"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#7B0000]"></div> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      <CategoryEditor 
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        existingModules={config.modules || []}
      />
    </div>
  );
};

const SettingToggle = ({ label, description, active, onToggle }) => (
  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group transition-colors hover:border-slate-200">
    <div>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <p className="text-xs text-slate-400 font-medium">{description}</p>
    </div>
    <button 
      onClick={() => onToggle(!active)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${active ? 'bg-[#FFC300]' : 'bg-slate-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

export default DashboardSettingsTab;
