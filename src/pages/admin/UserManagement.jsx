import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, Edit, Users, X, Search, Settings, Shield, Lock, Power } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast, { useToast } from '../../components/Toast';
import { getLatestSHA, saveFileToGitHub, getFileFromGitHub } from '../../services/githubService';
import { ALL_TOOLS } from '../../config/toolsConfig';

const AVAILABLE_PAGES = ALL_TOOLS.map(tool => ({
  id: tool.id,
  label: tool.name,
  icon: typeof tool.icon === 'string' ? tool.icon : '✨', // fallback for lucide icons if needed
  adminOnly: tool.adminOnly || false
}));

const UserManagement = () => {
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
    role: 'user',
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
        password: '', // blank by default for edit
        role: user.role || 'user',
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
        role: 'user',
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
        // use latest SHA
        const latestLinksSHA = await getLatestSHA('src/data/linksLibrary.json');
        await saveFileToGitHub('src/data/linksLibrary.json', { links: updatedLinks }, latestLinksSHA, `${commitPrefix} links access for user: ${userId}`);
      }
      return true;
    } catch (e) {
      console.error("Failed to sync links library", e);
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
            // If password was empty, restore original
            if (!formData.password) {
              updated.password = u.password;
            }
            return updated;
          }
          return u;
        });
      } else {
        // Validation check
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

      // Save to GitHub
      const latestSHA = await getLatestSHA('src/data/users.json');
      const success = await saveFileToGitHub('src/data/users.json', { users: updatedUsers }, latestSHA, commitMessage);
      
      if (success) {
        updateUsers(updatedUsers);
        
        // Sync links if this was an edit AND links-library was removed
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
    setFormData({ ...formData, allowedPages: user.allowedPages || [] });
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
    const roleMatch = roleFilter === 'All' || (roleFilter === 'Admin' && u.role === 'admin') || (roleFilter === 'User' && u.role === 'user');
    const statusMatch = statusFilter === 'All' || (statusFilter === 'Active' && u.isActive) || (statusFilter === 'Inactive' && !u.isActive);
    return searchMatch && roleMatch && statusMatch;
  });

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 pb-20 p-4 md:p-6 lg:p-8">
      <Toast toast={toast} onClose={hideToast} />
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter flex items-center gap-3">
            <Users className="text-accent" size={32} />
            USER <span className="text-accent">MANAGEMENT</span>
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mt-1">Control system access</p>
        </div>
        
        {currentUser?.role === 'admin' && (
          <button
            onClick={() => handleOpenUserModal()}
            className="flex w-full md:w-auto items-center justify-center gap-2 px-6 py-3 bg-accent hover:bg-accent-hover text-accent-dark font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
          >
            <UserPlus size={20} />
            <span>Add User</span>
          </button>
        )}
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, username, or email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-accent font-medium transition-all"
          />
        </div>
        <div className="flex gap-4">
          <select 
            value={roleFilter} 
            onChange={e => setRoleFilter(e.target.value)}
            className="flex-1 lg:w-36 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-accent appearance-none cursor-pointer"
          >
            <option value="All">All Roles</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)}
            className="flex-1 lg:w-36 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-accent appearance-none cursor-pointer"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-soft">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
              <th className="px-6 py-4">User Identity</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Access</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent text-accent-dark flex items-center justify-center font-black shadow-sm shrink-0">
                      {u.avatar || getInitials(u.fullName)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-gray-900 leading-tight truncate">{u.fullName}</p>
                      <p className="text-[11px] text-gray-400 font-medium truncate">@{u.username} • {u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {u.role === 'admin' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-yellow-100 text-yellow-700 border border-yellow-200">
                      <Shield size={10} /> Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-blue-50 text-blue-600 border border-blue-100">
                      User
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${u.isActive ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-[11px] font-black text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 shadow-sm">
                    {u.allowedPages?.length || 0}/{AVAILABLE_PAGES.length} Pages
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => handleOpenPagesModal(u)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100" title="Manage Pages">
                      <Settings size={16} />
                    </button>
                    <button onClick={() => handleOpenUserModal(u)} className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-lg transition-colors border border-transparent hover:border-accent/20" title="Edit User">
                      <Edit size={16} />
                    </button>
                    {u.id !== currentUser.id && (
                      <button onClick={() => handleDeleteRequest(u)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100" title="Delete User">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 font-bold">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-4">
        {filteredUsers.map(u => (
          <div key={u.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm relative">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-full bg-accent text-accent-dark flex items-center justify-center font-black shadow-sm shrink-0 text-lg">
                {u.avatar || getInitials(u.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-900 truncate">{u.fullName}</p>
                <p className="text-xs text-gray-500 font-bold truncate">@{u.username}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {u.role === 'admin' ? (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-yellow-100 text-yellow-700">Admin</span>
                  ) : (
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600">User</span>
                  )}
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${u.isActive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
               <button onClick={() => handleOpenPagesModal(u)} className="flex flex-col items-center justify-center py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 active:bg-gray-100 transition-colors">
                 <Settings size={16} className="mb-1" />
                 <span className="text-[10px] font-black uppercase">Pages</span>
               </button>
               <button onClick={() => handleOpenUserModal(u)} className="flex flex-col items-center justify-center py-2 bg-gray-50 border border-gray-100 rounded-xl text-accent-dark active:bg-accent/10 transition-colors">
                 <Edit size={16} className="mb-1" />
                 <span className="text-[10px] font-black uppercase">Edit</span>
               </button>
               {u.id !== currentUser.id ? (
                 <button onClick={() => handleDeleteRequest(u)} className="flex flex-col items-center justify-center py-2 bg-red-50 border border-red-100 rounded-xl text-red-500 active:bg-red-100 transition-colors">
                   <X size={16} className="mb-1" />
                   <span className="text-[10px] font-black uppercase">Delete</span>
                 </button>
               ) : <div className="flex flex-col items-center justify-center py-2 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 opacity-50"><X size={16} className="mb-1"/><span className="text-[10px] font-black uppercase">Self</span></div>}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 font-bold bg-white rounded-2xl border border-gray-200">No users found.</div>
        )}
      </div>

      {/* USER FORM MODAL */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsUserModalOpen(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                     {editingUser ? <Edit size={20} className="text-accent" /> : <UserPlus size={20} className="text-accent" />}
                     {editingUser ? `Edit — ${editingUser.fullName}` : 'Add New User'}
                   </h3>
                   <button onClick={() => setIsUserModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 rounded bg-white border border-gray-200 shadow-sm"><X size={18}/></button>
                </div>
                <form onSubmit={handleSaveUser} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                   {/* form content */}
                   <div className="space-y-4">
                     <div>
                       <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Full Name *</label>
                       <input required type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-inner" placeholder="e.g. John Doe"/>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Username *</label>
                         <input required type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-inner" placeholder="johndoe"/>
                       </div>
                       <div>
                         <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Email *</label>
                         <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-inner" placeholder="user@company.com"/>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Password {editingUser ? '' : '*'}</label>
                       <input required={!editingUser} type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 font-medium focus:ring-2 focus:ring-accent outline-none transition-all shadow-inner" placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter strong password'}/>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Role *</label>
                          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 font-bold outline-none focus:ring-2 focus:ring-accent">
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                       </div>
                       <div>
                          <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-1">Status</label>
                          <button type="button" onClick={() => setFormData({...formData, isActive: !formData.isActive})} className={`w-full h-[46px] rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all border-2 ${formData.isActive ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                             {formData.isActive ? 'Active' : 'Inactive'}
                          </button>
                       </div>
                     </div>
                     {!editingUser && (
                       <div className="pt-2">
                          <label className="block text-[11px] font-black text-gray-600 uppercase tracking-widest mb-2">Initial Area Access</label>
                          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                             <p className="text-xs text-gray-500 font-medium">New users get "Dashboard" access only. Modify pages in the Pages Access Modal after creation.</p>
                          </div>
                       </div>
                     )}
                   </div>
                   
                   <div className="pt-6">
                     <button disabled={isSaving} type="submit" className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                       {isSaving ? 'Saving to GitHub...' : (editingUser ? 'Update User' : 'Create User')}
                     </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PAGES MODAL */}
      <AnimatePresence>
        {isPagesModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPagesModalOpen(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50">
                   <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                     <Settings size={20} className="text-gray-500" />
                     {editingUser ? `Page Access — ${editingUser.fullName}` : 'Page Access'}
                   </h3>
                   <button onClick={() => setIsPagesModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 rounded bg-white border border-gray-200 shadow-sm"><X size={18}/></button>
                </div>
                <div className="p-4 border-b border-gray-100 bg-white">
                   <p className="text-xs font-black text-gray-500 uppercase tracking-widest text-center">Configuring access rules</p>
                </div>
                <div className="p-4 bg-gray-50 flex gap-2 justify-center border-b border-gray-100">
                   <button onClick={() => setFormData({...formData, allowedPages: AVAILABLE_PAGES.filter(p => !p.adminOnly || formData.role==='admin').map(p=>p.id)})} className="px-4 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100">Select All</button>
                   <button onClick={() => setFormData({...formData, allowedPages: []})} className="px-4 py-1.5 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100">Deselect All</button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-3">
                   {AVAILABLE_PAGES.map(page => {
                      if (page.adminOnly && formData.role !== 'admin') return null;
                      const hasAccess = formData.allowedPages?.includes(page.id);
                      return (
                        <div key={page.id} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${hasAccess ? 'border-accent bg-accent/5' : 'border-gray-100 bg-white'}`}>
                           <div className="flex items-center gap-3">
                             <div className="text-lg">{page.icon}</div>
                             <span className="text-sm font-black text-gray-900">{page.label}</span>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => {
                               const curr = formData.allowedPages || [];
                               setFormData({...formData, allowedPages: hasAccess ? curr.filter(p=>p!==page.id) : [...curr, page.id]});
                             }}
                             className={`relative w-12 h-6 rounded-full transition-all shadow-inner focus:outline-none ${hasAccess ? 'bg-success' : 'bg-gray-200'}`}
                           >
                             <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${hasAccess ? 'left-7' : 'left-1'}`} />
                           </button>
                        </div>
                      )
                   })}
                </div>
                <div className="p-6 border-t border-gray-100 bg-white">
                   <button disabled={isSaving} onClick={handleSavePages} className="w-full py-3.5 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50">
                     {isSaving ? 'Saving...' : 'Save Page Privileges'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col p-6 text-center border-t-4 border-red-500">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100"><X size={32} /></div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Delete User?</h3>
                <p className="text-sm font-medium text-gray-500 mb-6 px-4">
                  Are you sure you want to completely remove <span className="font-black text-gray-900">"{deleteConfirmName}"</span>? This will also remove them from all <span className="font-bold underline">Library</span> items permanently.
                </p>
                <div className="flex gap-3">
                   <button disabled={isSaving} onClick={() => {setDeleteConfirmId(null); setDeleteConfirmName('')}} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl active:scale-95 transition-all">Cancel</button>
                   <button disabled={isSaving} onClick={handleDeleteConfirm} className="flex-1 py-3 bg-red-500 text-white font-black uppercase rounded-xl shadow-lg shadow-red-200 active:scale-95 transition-all">
                      {isSaving ? 'Deleting...' : 'Yes, Delete'}
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default UserManagement;
