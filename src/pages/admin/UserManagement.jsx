import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, UserPlus, Edit, Power, Shield, Settings, Mail, X, Check, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast, { useToast } from '../../components/Toast';

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
        tools: user.tools
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <Toast toast={toast} onClose={hideToast} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-white italic tracking-tight">⚙️ USER <span className="text-accent">MANAGEMENT</span></h2>
          <p className="text-muted mt-1">Control platform access and tool assignments.</p>
        </div>
        
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-bg font-black rounded-xl transition-all shadow-lg active:scale-95"
        >
          <UserPlus size={20} />
          <span>Add New Supervisor</span>
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border bg-white/5 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
            <input 
              type="text" 
              placeholder="Filter supervisors by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg border border-border rounded-lg text-white text-sm focus:outline-none focus:border-accent transition-all"
            />
          </div>
          <div className="px-4 py-2 bg-bg border border-border rounded-lg">
             <span className="text-xs font-bold text-muted uppercase tracking-widest">Total: {users.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-bg text-muted uppercase text-[10px] font-black tracking-widest border-b border-border">
                <th className="px-6 py-4">Supervisor</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned Tools</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-black">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-white leading-tight">{u.name}</p>
                        <p className="text-xs text-muted">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md border ${
                      u.role === 'admin' ? 'bg-accent/10 border-accent text-accent' : 'bg-white/5 border-white/10 text-muted'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                       <div className={`w-2 h-2 rounded-full ${u.active ? 'bg-success' : 'bg-danger shadow-[0_0_8px_rgba(230,57,70,0.5)]'}`} />
                       <span className={`text-sm font-bold ${u.active ? 'text-success' : 'text-danger'}`}>
                        {u.active ? 'Active' : 'Inactive'}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-1.5">
                      {u.tools.map(tool => (
                        <span key={tool} className="text-[10px] font-bold bg-accent/20 text-accent border border-accent/30 px-2 py-0.5 rounded-full">
                          {tool}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenModal(u)}
                        className="p-2 hover:bg-white/10 rounded-lg text-muted hover:text-white transition-all"
                        title="Edit User"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleToggleActive(u.id)}
                        className={`p-2 rounded-lg transition-all ${u.active ? 'text-muted hover:text-danger hover:bg-danger/10' : 'text-success hover:bg-success/10'}`}
                        title={u.active ? "Deactivate" : "Activate"}
                      >
                        <Power size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 bg-accent/5 border border-accent/20 rounded-xl">
        <Info className="text-accent shrink-0 mt-0.5" size={18} />
        <div>
          <p className="text-sm font-bold text-accent mb-0.5">Persistence Warning</p>
          <p className="text-xs text-accent/80">User information is stored in the browser's local storage for this session. Changes made here will persist across reloads on this machine but are not hosted on a server.</p>
        </div>
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

              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] uppercase font-black text-muted tracking-widest mb-2">Display Name</label>
                    <input 
                      required 
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-[10px] uppercase font-black text-muted tracking-widest mb-2">Email Identity</label>
                    <input 
                      required 
                      disabled={!!editingUser}
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className={`w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-muted tracking-widest mb-2">Password</label>
                    <input 
                      required 
                      type="text"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-black text-muted tracking-widest mb-2">System Role</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2.5 bg-bg border border-border rounded-xl text-white focus:outline-none focus:border-accent"
                    >
                      <option value="user">Field Supervisor</option>
                      <option value="admin">Platform Administrator</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 self-end h-[46px] px-2">
                    <div className="flex-1 text-sm font-bold text-white">Account Active</div>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, active: !formData.active})}
                      className={`relative w-12 h-6 rounded-full transition-all ${formData.active ? 'bg-success' : 'bg-danger'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.active ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-black text-muted tracking-widest mb-3">Tool Authorization</label>
                  <div className="flex flex-wrap gap-4 px-1">
                    {['call-detailing', 'sales-analyzer'].map(tool => (
                      <label key={tool} className="flex items-center gap-3 cursor-pointer group">
                        <div 
                          onClick={() => {
                            const newTools = formData.tools.includes(tool)
                              ? formData.tools.filter(t => t !== tool)
                              : [...formData.tools, tool];
                            setFormData({...formData, tools: newTools});
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                            formData.tools.includes(tool) ? 'bg-accent border-accent text-bg' : 'border-border group-hover:border-accent'
                          }`}
                        >
                          {formData.tools.includes(tool) && <Check size={14} strokeWidth={4} />}
                        </div>
                        <span className="text-sm font-bold text-white capitalize">{tool.replace('-', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-border mt-4">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-accent hover:bg-accent-hover text-bg font-black rounded-xl transition-all shadow-lg active:scale-95"
                  >
                    {editingUser ? 'Commit Changes' : 'Initialize Supervisor'}
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
