import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, UserPlus, Edit, Power, Shield, Settings, Mail, X, Check, Search, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast, { useToast } from '../../components/Toast';

const AVAILABLE_TOOLS = [
  { 
    id: 'call-detailing', 
    label: 'Call Detailing Analyzer',
    icon: '📋',
    desc: 'Field call analysis & coaching'
  },
  { 
    id: 'sales-analyzer', 
    label: 'ATR Sales Analyzer',
    icon: '📊',
    desc: 'ATR invoices & sales performance'
  },
  { 
    id: 'routing-analyzer', 
    label: 'Routing Analyzer',
    icon: '🗺️',
    desc: 'Customer routing & coverage map'
  },
];

const UserManagement = () => {
  const { users, updateUsers, user: currentUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    active: true,
    tools: ['call-detailing']
  });

  const handleToggleActive = (userId) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        if (u.id === currentUser.id) {
          showToast("Cannot deactivate your own account", "error");
          return u;
        }
        return { ...u, active: !u.active };
      }
      return u;
    });
    updateUsers(updatedUsers);
    showToast("User status updated", "success");
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        active: user.active,
        tools: user.tools || ['call-detailing']
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        active: true,
        tools: ['call-detailing']
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    if (editingUser) {
      const updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...formData, id: u.id, email: u.email } : u);
      updateUsers(updatedUsers);
      showToast("User updated successfully", "success");
    } else {
      if (users.some(u => u.email === formData.email)) {
        showToast("User with this email already exists", "error");
        return;
      }
      const newUser = {
        ...formData,
        id: Math.max(...users.map(u => u.id)) + 1
      };
      updateUsers([...users, newUser]);
      showToast("User created successfully", "success");
    }
    setIsModalOpen(false);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <Settings className="text-accent" size={32} />
            USER <span className="text-accent">MANAGEMENT</span>
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Control system access and assign supervisor toolsets</p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-accent-dark font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
        >
          <UserPlus size={20} />
          <span>Onboard Supervisor</span>
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-soft">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
            <input 
              type="text" 
              placeholder="Query users by name, email or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:outline-none focus:border-accent transition-all font-medium"
            />
          </div>
          <div className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">Total Nodes: {users.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="px-6 py-4">Supervisor Node</th>
                <th className="px-6 py-4">Access Tier</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Provisioned Tools</th>
                <th className="px-6 py-4 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent-dark font-black shadow-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-gray-900 leading-tight">{u.name}</p>
                        <p className="text-[11px] text-gray-400 font-medium">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border shadow-sm ${
                      u.role === 'admin' ? 'bg-accent/10 border-accent/20 text-accent-dark' : 'bg-gray-100 border-gray-200 text-gray-500'
                    }`}>
                      {u.role === 'admin' ? 'Administrator' : 'Standard Node'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5">
                       <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-success animate-pulse' : 'bg-gray-300'}`} />
                       <span className={`text-[10px] font-black uppercase tracking-widest ${u.active ? 'text-success' : 'text-gray-400'}`}>
                        {u.active ? 'Online' : 'Locked'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-1.5">
                      {(u.tools || []).map(toolId => {
                        const tool = AVAILABLE_TOOLS.find(
                          t => t.id === toolId
                        );
                        return (
                          <span
                            key={toolId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black border border-gray-200"
                          >
                            <span>{tool?.icon || '🔧'}</span>
                            {tool?.label || toolId}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 border border-gray-100 bg-white hover:bg-gray-50 rounded-lg text-gray-400 hover:text-accent transition-all shadow-sm"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleToggleActive(u.id)}
                        className={`p-2 border rounded-lg transition-all shadow-sm ${u.active ? 'bg-white border-gray-100 text-danger hover:bg-danger/5' : 'bg-white border-gray-100 text-success hover:bg-success/5'}`}
                      >
                        <Power size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-4 p-5 bg-gray-900 rounded-2xl shadow-xl text-white relative overflow-hidden group">
        <Info className="text-accent shrink-0 mt-0.5 group-hover:rotate-12 transition-transform" size={20} />
        <div className="relative z-10">
          <p className="text-xs font-black uppercase tracking-widest text-accent mb-1 italic">Security Governance Protocol</p>
          <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
            Analyzer toolsets are assigned per node. Supervisors only gain visibility into modules explicitly provisioned by the Administrator. 
            All state changes are persisted in the local secure storage environment.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full -mr-16 -mt-16 blur-2xl" />
      </div>

      {/* User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-bg/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-accent" />
              
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  {editingUser ? <Edit size={22} className="text-accent" /> : <UserPlus size={22} className="text-accent" />}
                  {editingUser ? 'Edit User Credentials' : 'Register New Supervisor'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 ml-1">Supervisor Full Name</label>
                    <input 
                      required 
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent font-medium"
                      placeholder="e.g. Dr. Peter Ramsis"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 ml-1">Communication Identity</label>
                    <input 
                      required 
                      disabled={!!editingUser}
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent font-medium ${editingUser ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}`}
                      placeholder="user@datalens.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 ml-1">System Passkey</label>
                    <input 
                      required 
                      type="text"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent font-medium"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-gray-400 tracking-widest mb-2 ml-1">Governance Role</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-accent font-bold"
                    >
                      <option value="user">Supervisor Node</option>
                      <option value="admin">Platform Admin</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 self-end">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Active Node</span>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, active: !formData.active})}
                      className={`relative w-12 h-6 rounded-full transition-all shadow-inner ${formData.active ? 'bg-success' : 'bg-gray-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${formData.active ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-3">
                    Tool Access
                  </label>
                  <div className="space-y-2">
                    {AVAILABLE_TOOLS.map(tool => (
                      <label
                        key={tool.id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-all ${
                          (formData.tools || []).includes(tool.id)
                            ? 'border-yellow-400 bg-yellow-50'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                        }`}
                      >
                        {/* Custom Checkbox */}
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            (formData.tools || []).includes(tool.id)
                              ? 'bg-yellow-400 border-yellow-400'
                              : 'border-gray-300'
                          }`}
                        >
                          {(formData.tools || []).includes(tool.id) && (
                            <Check className="w-3 h-3 text-black font-black" />
                          )}
                        </div>

                        <input
                          type="checkbox"
                          className="hidden"
                          checked={(formData.tools || []).includes(tool.id)}
                          onChange={() => {
                            const current = formData.tools || [];
                            const next = current.includes(tool.id)
                              ? current.filter(t => t !== tool.id)
                              : [...current, tool.id];
                            setFormData(prev => ({
                              ...prev,
                              tools: next
                            }));
                          }}
                        />

                        {/* Tool Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {tool.icon}
                            </span>
                            <span className="text-sm font-black text-gray-900">
                              {tool.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            {tool.desc}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 mt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-accent hover:bg-accent-hover text-accent-dark font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-[0.98]"
                  >
                    {editingUser ? 'Commit Node Updates' : 'Initialize Supervisor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserManagement;
