import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Edit, Users, X, Search, Settings, Shield, Lock, Power, Trash2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Toast, { useToast } from '../../Toast';
import { getLatestSHA, saveFileToGitHub, getFileFromGitHub } from '../../../services/githubService';
import { ALL_TOOLS } from '../../../config/toolsConfig';
import { resolveIcon } from '../../../utils/iconResolver';

export const USER_ROLES = [
  'Medical Representative',
  'Area Supervisor',
  'District Manager',
  'Product Manager',
  'Line Sales Manager',
  'Business Unit Manager',
];

const AVAILABLE_PAGES = ALL_TOOLS.map(tool => ({
  id: tool.id,
  label: tool.name,
  icon: typeof tool.icon === 'string' ? tool.icon : '✨', 
  adminOnly: tool.adminOnly || false
}));

const UserManagementTab = () => {
  const { users, updateUsers, user: currentUser } = useAuth();
  
  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPagesModalOpen, setIsPagesModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  
  // Async states
  const [isSaving, setIsSaving] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: '',
    isActive: true,
    allowedPages: ['dashboard']
  });

  const getInitials = (name) => {
    return name.split(' ').map(n=>n?.[0]||'').join('').substring(0,2).toUpperCase();
  };

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.fullName || '',
        username: user.username || '',
        email: user.email || '',
        password: '', 
        role: user.role || '',
        isActive: user.isActive ?? true,
        allowedPages: user.allowedPages || ['dashboard']
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: '',
        isActive: true,
        allowedPages: ['dashboard']
      });
    }
    setIsUserModalOpen(true);
  };

  const syncLinksLibrary = async (userId, action = 'remove', commitPrefix = 'Sync') => {
    try {
      const { content, sha } = await getFileFromGitHub('src/data/linksLibrary.json');
      if (!content) return false;
      const currentLinks = Array.isArray(content) ? content : (content.links || []);
      
      let changed = false;
      const updatedLinks = currentLinks.map(link => {
        if (action === 'remove' && link.allowedUserIds?.includes(userId)) {
          changed = true;
          return {
            ...link,
            allowedUserIds: link.allowedUserIds.filter(id => id !== userId),
            updatedAt: new Date().toISOString()
          };
        }
        return link;
      });

      if (changed) {
        const latestLinksSHA = await getLatestSHA('src/data/linksLibrary.json');
        await saveFileToGitHub('src/data/linksLibrary.json', { links: updatedLinks }, latestLinksSHA, `${commitPrefix} links access for user: ${userId}`);
      }
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (currentUser?.role !== 'admin') return;
    setIsSaving(true);
    
    try {
      let updatedUsers;
      let commitMessage = '';
      
      const newAvatar = getInitials(formData.fullName);
      const timestamp = new Date().toISOString();

      if (editingUser) {
        commitMessage = 'Update user: ' + formData.fullName;
        
        updatedUsers = users.map(u => {
          if (u.id === editingUser.id) {
            const updated = { ...u, ...formData, avatar: newAvatar, updatedAt: timestamp };
            if (!formData.password) {
              updated.password = u.password;
            }
            return updated;
          }
          return u;
        });
      } else {
        if (users.some(u => u.username === formData.username || u.email === formData.email)) {
          showToast("Username or Email already exists ❌", "error");
          setIsSaving(false);
          return;
        }

        commitMessage = 'Add new user: ' + formData.fullName;
        const newUserId = "usr_" + Date.now();
        const newUser = {
          id: newUserId,
          ...formData,
          avatar: newAvatar,
          createdAt: timestamp,
          updatedAt: timestamp
        };
        updatedUsers = [...users, newUser];
      }

      const latestSHA = await getLatestSHA('src/data/users.json');
      const success = await saveFileToGitHub('src/data/users.json', { users: updatedUsers }, latestSHA, commitMessage);
      
      if (success) {
        updateUsers(updatedUsers);
        if (editingUser) {
          const hadLinks = editingUser.allowedPages?.includes('links-library');
          const hasLinks = formData.allowedPages?.includes('links-library');
          if (hadLinks && !hasLinks) {
            await syncLinksLibrary(editingUser.id, 'remove', 'Sync');
            showToast("User updated and links synced ✅", "success");
          } else {
            showToast("User updated on GitHub ✅", "success");
          }
        } else {
          showToast("User added and saved to GitHub ✅", "success");
        }
        setIsUserModalOpen(false);
      } else {
        showToast("Failed to save. Please try again ❌", "error");
      }
    } catch (e) {
      showToast("Something went wrong. Please try again ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRequest = (user) => {
    if (user.id === currentUser.id) {
      showToast("Cannot delete your own account ❌", "error");
      return;
    }
    if (user.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
      if (adminCount <= 1) {
        showToast("Cannot delete the last admin account ❌", "error");
        return;
      }
    }
    setDeleteConfirmId(user.id);
    setDeleteConfirmName(user.fullName);
  };

  const handleDeleteConfirm = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsSaving(true);
    try {
      const remainingUsers = users.filter(u => u.id !== deleteConfirmId);
      const latestSHA = await getLatestSHA('src/data/users.json');
      const success = await saveFileToGitHub('src/data/users.json', { users: remainingUsers }, latestSHA, 'Delete user: ' + deleteConfirmName);
      
      if (success) {
        updateUsers(remainingUsers);
        await syncLinksLibrary(deleteConfirmId, 'remove', 'Remove deleted user from');
        showToast("User deleted and removed from all links ✅", "success");
      } else {
        showToast("Failed to delete. Please try again ❌", "error");
      }
    } catch (e) {
      showToast("Something went wrong. Please try again ❌", "error");
    } finally {
      setIsSaving(false);
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
    }
  };

  const handleOpenPagesModal = (user) => {
    setEditingUser(user);
    setFormData({ ...formData, allowedPages: user.allowedPages || [], role: user.role });
    setIsPagesModalOpen(true);
  };

  const handleSavePages = async () => {
    if (currentUser?.role !== 'admin') return;
    setIsSaving(true);
    try {
      const updatedUsers = users.map(u => 
        u.id === editingUser.id 
        ? { ...u, allowedPages: formData.allowedPages, updatedAt: new Date().toISOString() } 
        : u
      );
      
      const latestSHA = await getLatestSHA('src/data/users.json');
      const success = await saveFileToGitHub('src/data/users.json', { users: updatedUsers }, latestSHA, 'Update page access: ' + editingUser.fullName);
      
      if (success) {
        updateUsers(updatedUsers);
        const hadLinks = editingUser.allowedPages?.includes('links-library');
        const hasLinks = formData.allowedPages?.includes('links-library');
        
        if (hadLinks && !hasLinks) {
          await syncLinksLibrary(editingUser.id, 'remove', 'Sync');
        }
        showToast("Page access updated ✅", "success");
        setIsPagesModalOpen(false);
      } else {
        showToast("Failed to save. Please try again ❌", "error");
      }
    } catch(e) {
      showToast("Something went wrong. Please try again ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = searchTerm.toLowerCase();
    const searchMatch = (u.fullName?.toLowerCase().includes(term) || u.username?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
    const roleMatch = roleFilter === 'All' || (roleFilter === 'Admin' && u.role === 'admin') || (roleFilter === 'User' && u.role !== 'admin');
    const statusMatch = statusFilter === 'All' || (statusFilter === 'Active' && u.isActive) || (statusFilter === 'Inactive' && !u.isActive);
    return searchMatch && roleMatch && statusMatch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast toast={toast} onClose={hideToast} />
      
      {/* HEADER */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-[#FFC300]" />
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">User Base Management</h3>
        </div>
        
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => handleOpenUserModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#FFC300] hover:bg-[#FFD700] text-[#7B0000] text-xs font-black uppercase tracking-widest rounded-lg transition-all shadow active:scale-95"
          >
            <UserPlus size={16} />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition-all"
          />
        </div>
        <div className="flex gap-2">
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider text-slate-600 outline-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
               <th className="px-6 py-3">Identity</th>
               <th className="px-6 py-3">Role</th>
               <th className="px-6 py-3">Status</th>
               <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-[#7B0000] flex items-center justify-center font-black shadow-sm shrink-0 text-sm border-2 border-white">
                      {u.avatar || getInitials(u.fullName)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-medium lowercase tracking-tight">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {u.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-50 text-yellow-600 border border-yellow-100">
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                      {u.role || 'User'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${u.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => handleOpenPagesModal(u)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Manage Pages">
                      <Settings size={16} />
                    </button>
                    <button onClick={() => handleOpenUserModal(u)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Edit User">
                      <Edit size={16} />
                    </button>
                    {u.id !== currentUser.id && (
                      <button onClick={() => handleDeleteRequest(u)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODALS (copied and adapted from existing UserManagement.jsx) */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                   <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
                     {editingUser ? <Edit size={20} className="text-amber-500" /> : <UserPlus size={20} className="text-amber-500" />}
                     {editingUser ? `Edit User` : 'Add New User'}
                   </h3>
                   <button onClick={() => setIsUserModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded bg-white border border-slate-200 shadow-sm"><X size={18}/></button>
                </div>
                <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                   <div className="space-y-4">
                     <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
                       <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="Full name"/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Username</label>
                         <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="username"/>
                       </div>
                       <div>
                         <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email</label>
                         <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="email@address.com"/>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Password {editingUser && '(Leave blank to keep current)'}</label>
                       <input required={!editingUser} type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none" placeholder="Password"/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Role *</label>
                          <select required value={formData.role} onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:ring-2 focus:ring-amber-500/20 outline-none">
                            <option value="">Select Role...</option>
                            {USER_ROLES.map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                            {editingUser && editingUser.role === 'admin' && (
                              <option value="admin">Admin</option>
                            )}
                          </select>
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                          <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className={`w-full h-full px-4 py-3 rounded-xl font-black uppercase text-[10px] flex items-center justify-center gap-2 border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                             {formData.isActive ? 'Active' : 'Inactive'}
                          </button>
                       </div>
                     </div>
                   </div>
                   
                   <div className="pt-6">
                     <button disabled={isSaving} type="submit" className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50">
                       {isSaving ? 'Saving...' : (editingUser ? 'Update Profile' : 'Register User')}
                     </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pages Modal (simplified version for the tab) */}
      <AnimatePresence>
        {isPagesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsPagesModalOpen(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                   <h3 className="text-lg font-black text-slate-700 flex items-center gap-2">
                     <Lock size={20} className="text-slate-400" />
                     Page Access Rules
                   </h3>
                   <button onClick={() => setIsPagesModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-900 rounded bg-white border border-slate-200 shadow-sm"><X size={18}/></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-2">
                   {AVAILABLE_PAGES.map(page => {
                      if (page.adminOnly && formData.role !== 'admin') return null;
                      const hasAccess = formData.allowedPages?.includes(page.id);
                      return (
                        <div key={page.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${hasAccess ? 'border-amber-500 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                           <div className="flex items-center gap-3">
                             <div className="text-slate-400">
                               {resolveIcon(page.icon, 18)}
                             </div>
                             <span className="text-sm font-bold text-slate-700">{page.label}</span>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => {
                               const curr = formData.allowedPages || [];
                               setFormData({...formData, allowedPages: hasAccess ? curr.filter(p=>p!==page.id) : [...curr, page.id]});
                             }}
                             className={`relative w-10 h-5 rounded-full transition-all focus:outline-none ${hasAccess ? 'bg-amber-500' : 'bg-slate-200'}`}
                           >
                             <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${hasAccess ? 'left-5.5' : 'left-0.5'}`} />
                           </button>
                        </div>
                      )
                   })}
                </div>
                <div className="p-6 border-t border-slate-100">
                   <button disabled={isSaving} onClick={handleSavePages} className="w-full py-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg disabled:opacity-50">
                     Update Access Permissions
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><Trash2 size={32} /></div>
                <h3 className="text-xl font-black text-slate-800 mb-2">Delete User?</h3>
                <p className="text-xs font-medium text-slate-500 mb-6 px-4 leading-relaxed">
                  Permanently remove <span className="font-bold text-slate-900">"{deleteConfirmName}"</span>? This action is irreversible and will revoke all system access.
                </p>
                <div className="flex gap-3">
                   <button disabled={isSaving} onClick={() => {setDeleteConfirmId(null); setDeleteConfirmName('')}} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">Cancel</button>
                   <button disabled={isSaving} onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-500 text-white font-black uppercase rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all text-xs">
                      {isSaving ? 'Processing...' : 'Confirm Delete'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default UserManagementTab;
