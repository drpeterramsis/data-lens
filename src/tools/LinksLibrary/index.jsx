import React, { useState, useEffect, useMemo } from 'react';
import { Search, Link as LinkIcon, Plus, Edit, Trash2, X, AlertTriangle, ExternalLink, Github, Folder, Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import initialLinksData from '../../data/linksLibrary.json';
import Toast, { useToast } from '../../components/Toast';
import { getFileContent, updateFileContent, validateJSON, getLatestSHA, saveFileToGitHub, getFileFromGitHub } from '../../services/githubService';
import { getLinkIcon, getQuickIcons } from '../../utils/iconDetector';

const CATEGORIES = ["Reports", "Dashboards", "Tools", "References", "Training", "HR", "Finance", "Operations", "Other", "Custom..."];

const Library = () => {
  const { user, users: allUsers } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { toast, showToast, hideToast } = useToast();
  
  const [links, setLinks] = useState([]);
  const [linksSHA, setLinksSHA] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Fetch Links from GitHub
  const fetchLinks = async () => {
    try {
      setIsLoadingData(true);
      const { content, sha } = await getFileFromGitHub('src/data/linksLibrary.json');
      setLinks(Array.isArray(content) ? content : (content.links || []));
      setLinksSHA(sha);
    } catch (e) {
      // Silently swallow GitHub errors falling back to initial data
      if (links.length === 0) setLinks(Array.isArray(initialLinksData) ? initialLinksData : (initialLinksData.links || []));
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchLinks();
    const interval = setInterval(fetchLinks, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // View state
  const [searchQuery, setSearchQuery] = useState('');
  const [adminUserFilter, setAdminUserFilter] = useState(''); // admin only filter by user
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
  // Icon Editor State
  const [activeIconEditorId, setActiveIconEditorId] = useState(null);
  const [tempIcon, setTempIcon] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    customIcon: '',
    description: '',
    category: 'Other',
    customCategory: '',
    url: '',
    buttonLabel: 'Open',
    allowedUserIds: [],
    isActive: true
  });
  
  const [formErrors, setFormErrors] = useState({});

  // JSON Editor States
  const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState(null);
  const [fileSha, setFileSha] = useState('');
  const [isLoadingJson, setIsLoadingJson] = useState(false);

  const handleOpenJsonModal = async () => {
    setIsJsonModalOpen(true);
    setIsLoadingJson(true);
    setJsonError(null);
    try {
      const { content, sha } = await getFileContent('src/data/linksLibrary.json');
      setJsonContent(content);
      setFileSha(sha);
    } catch (err) {
      setJsonError(err.message);
    } finally {
      setIsLoadingJson(false);
    }
  };

  const handleSaveJson = async () => {
    const { isValid, error } = validateJSON(jsonContent);
    if (!isValid) {
      setJsonError(`Invalid JSON: ${error}`);
      return;
    }

    if (!window.confirm("Are you sure you want to update this file on GitHub?")) {
      return;
    }

    setIsLoadingJson(true);
    try {
      await updateFileContent('src/data/linksLibrary.json', jsonContent, fileSha, 'Update linksLibrary.json via app');
      showToast("Links file updated on GitHub ✅", "success");
      setIsJsonModalOpen(false);
    } catch (err) {
      setJsonError(err.message);
      showToast("Failed to update links file", "error");
    } finally {
      setIsLoadingJson(false);
    }
  };

  const availableCategories = useMemo(() => {
    const cats = new Set(links.map(l => l.category || 'Other'));
    return ['All', ...Array.from(cats).sort()];
  }, [links]);

  // Filter the links based on current user role, search query, admin filters, and category
  const visibleLinks = useMemo(() => {
    let filtered = links;

    // 1. Role-based filtering
    if (!isAdmin) {
      // Regular users only see active links assigned to them
      filtered = filtered.filter(link => 
        link.isActive && link.allowedUserIds?.includes(user.id)
      );
    } else if (adminUserFilter) {
      // Admins can filter by user
      filtered = filtered.filter(link => 
        link.allowedUserIds?.includes(adminUserFilter)
      );
    }

    // 2. Category filtering
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(link => (link.category || 'Other') === selectedCategory);
    }

    // 3. Search query filtering
    if (searchQuery) {
      const qs = searchQuery.toLowerCase();
      filtered = filtered.filter(link => 
        link.name?.toLowerCase().includes(qs) || 
        link.description?.toLowerCase().includes(qs)
      );
    }

    // 4. Sort logic (newest first or alphabetical)
    return filtered.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [links, isAdmin, user?.id, adminUserFilter, selectedCategory, searchQuery]);


  // Helper: validate URL
  const isValidUrl = (urlString) => {
    try { 
      return Boolean(new URL(urlString)); 
    } catch(e){ 
      return false; 
    }
  };

  const handleOpenModal = (link = null) => {
    if (link) {
      const isPredefined = CATEGORIES.includes(link.category);
      setFormData({
        name: link.name,
        customIcon: link.customIcon || '',
        description: link.description || '',
        category: isPredefined || !link.category ? (link.category || 'Other') : 'Custom...',
        customCategory: isPredefined ? '' : link.category,
        url: link.url,
        buttonLabel: link.buttonLabel || 'Open',
        allowedUserIds: link.allowedUserIds || [],
        isActive: link.isActive
      });
      setEditingLink(link.id);
    } else {
       setFormData({
        name: '',
        customIcon: '',
        description: '',
        category: 'Other',
        customCategory: '',
        url: '',
        buttonLabel: 'Open',
        allowedUserIds: [],
        isActive: true
      });
      setEditingLink(null);
    }
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLink(null);
    setFormErrors({});
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Multiple select handling
  const handleUserSelectToggle = (userId) => {
    setFormData(prev => {
      const isSelected = prev.allowedUserIds.includes(userId);
      if (isSelected) {
        return { ...prev, allowedUserIds: prev.allowedUserIds.filter(id => id !== userId) };
      } else {
        return { ...prev, allowedUserIds: [...prev.allowedUserIds, userId] };
      }
    });
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!isAdmin) return;

    // Validate
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.url.trim()) errors.url = 'URL is required';
    else if (!isValidUrl(formData.url)) errors.url = 'Valid URL is required (include http:// or https://)';
    if (!formData.buttonLabel.trim()) errors.buttonLabel = 'Button label is required';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    const now = new Date().toISOString();
    
    try {
      let updatedLinks;
      let commitMessage = '';

      const finalCategory = formData.category === 'Custom...' ? (formData.customCategory.trim() || 'Other') : formData.category;
      
      const submitData = {
        name: formData.name,
        customIcon: formData.customIcon,
        description: formData.description,
        category: finalCategory,
        url: formData.url,
        buttonLabel: formData.buttonLabel,
        allowedUserIds: formData.allowedUserIds,
        isActive: formData.isActive
      };

      if (editingLink) {
        // Update existing
        updatedLinks = links.map(l => 
          l.id === editingLink ? { ...l, ...submitData, updatedAt: now } : l
        );
        commitMessage = `Update link: ${submitData.name} in category ${submitData.category}`;
      } else {
        // Create new
        const newLink = {
          id: `lnk_${Date.now()}`,
          ...submitData,
          createdAt: now,
          updatedAt: now
        };
        updatedLinks = [...links, newLink];
        commitMessage = `Add link: ${submitData.name} in category ${submitData.category}`;
      }

      const latestSHA = await getLatestSHA('src/data/linksLibrary.json');
      const payload = { links: updatedLinks };
      const success = await saveFileToGitHub('src/data/linksLibrary.json', payload, latestSHA, commitMessage);
      
      if (success) {
        setLinks(updatedLinks);
        setLinksSHA(latestSHA);
        showToast(editingLink ? "Link updated on GitHub ✅" : "Link added and saved to GitHub ✅", "success");
        handleCloseModal();
      } else {
        showToast("Failed to save. Please try again ❌", "error");
      }
    } catch (e) {
      showToast("Something went wrong. Please try again ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;

    setIsSaving(true);
    try {
      const linkToDelete = links.find(l => l.id === id);
      const remainingLinks = links.filter(l => l.id !== id);
      
      const latestSHA = await getLatestSHA('src/data/linksLibrary.json');
      const success = await saveFileToGitHub('src/data/linksLibrary.json', { links: remainingLinks }, latestSHA, 'Delete link: ' + (linkToDelete ? linkToDelete.name : 'Unknown'));
      
      if (success) {
        setLinks(remainingLinks);
        setConfirmDeleteId(null);
        showToast("Link deleted from GitHub ✅", "success");
      } else {
        showToast("Failed to delete. Please try again ❌", "error");
      }
    } catch (e) {
      showToast("Something went wrong. Please try again ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick Icon Update function for admin
  const handleQuickIconUpdate = async (link, newIcon) => {
    if (!isAdmin) return;
    
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const updatedLinks = links.map(l => 
        l.id === link.id ? { ...l, customIcon: newIcon, updatedAt: now } : l
      );
      
      const latestSHA = await getLatestSHA('src/data/linksLibrary.json');
      const success = await saveFileToGitHub(
        'src/data/linksLibrary.json', 
        { links: updatedLinks }, 
        latestSHA, 
        `Update icon for: ${link.name}`
      );
      
      if (success) {
        setLinks(updatedLinks);
        showToast("Icon updated ✅", "success");
        setActiveIconEditorId(null);
      } else {
        showToast("Failed to update icon ❌", "error");
      }
    } catch (e) {
      showToast("Error updating icon ❌", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-auto py-6 px-4 md:px-8">
      <Toast toast={toast} onClose={hideToast} />
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-yellow-400 rounded-xl">
            <LinkIcon size={24} className="text-gray-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Library</h1>
            <p className="text-sm text-gray-500">Access all your important resources and links</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleOpenJsonModal} 
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors shadow-soft"
            >
              <Github size={18} />
              <span className="font-semibold">Edit Data File</span>
            </button>
            <button 
              onClick={() => handleOpenModal()} 
              className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg hover:bg-yellow-500 transition-colors shadow-soft"
            >
              <Plus size={18} />
              <span className="font-semibold">Add Link</span>
            </button>
          </div>
        )}
      </div>

      {/* Control Bar: Search & Admin Filters */}
      <div className={`bg-white rounded-xl shadow-soft p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center ${isAdmin ? 'border-l-4 border-l-yellow-400' : ''}`}>
        
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search links by name or description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-sm"
          />
        </div>

        {/* Admin only filter */}
        {isAdmin && (
          <div className="flex items-center gap-3 w-full md:w-auto">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Filter by User:</label>
            <div className="flex flex-1 items-center gap-2">
              <select 
                value={adminUserFilter}
                onChange={(e) => setAdminUserFilter(e.target.value)}
                className="flex-1 md:w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50"
              >
                <option value="">All Users</option>
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.fullName} ({u.role})</option>
                ))}
              </select>
              {adminUserFilter && (
                <button 
                  onClick={() => setAdminUserFilter('')}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Clear Filter"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
              {visibleLinks.length} results
            </div>
          </div>
        )}
      </div>

      {/* Category Tabs */}
      {availableCategories.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {availableCategories.map(cat => (
             <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center gap-2 ${selectedCategory === cat ? 'bg-gray-900 text-white border-transparent' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
             >
                {cat !== 'All' && <Folder size={16} className={selectedCategory === cat ? 'text-yellow-400' : 'text-gray-400'} />}
                {cat}
             </button>
          ))}
        </div>
      )}

      {/* Links Grid */}
      {visibleLinks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          {visibleLinks.map(link => {
            const currentIcon = getLinkIcon(link);
            const categoryColors = {
              'Reports': '#3B82F6',
              'Dashboards': '#8B5CF6',
              'Tools': '#F59E0B',
              'References': '#10B981',
              'Training': '#EC4899',
              'HR': '#6366F1',
              'Finance': '#059669',
              'Operations': '#7C3AED',
              'Other': '#6B7280'
            };
            const categoryColor = categoryColors[link.category] || '#6B7280';

            return (
              <div 
                key={link.id} 
                className={`bg-white border text-left rounded-xl overflow-hidden hover:shadow-card transition-shadow flex flex-col h-full ${
                  !link.isActive && isAdmin ? 'border-dashed border-gray-300 opacity-60' : 'border-gray-200 shadow-soft'
                }`}
              >
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      {/* Icon Circle */}
                      <div className="relative group">
                        <div 
                          className="w-[52px] h-[52px] rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                          style={{ 
                            backgroundColor: categoryColor + '20',
                            color: categoryColor 
                          }}
                        >
                          <span className="text-[1.6rem] leading-none select-none">{currentIcon}</span>
                        </div>
                        
                        {/* Admin Pencil Overlay */}
                        {isAdmin && (
                          <>
                            <button 
                              onClick={() => {
                                setActiveIconEditorId(activeIconEditorId === link.id ? null : link.id);
                                setTempIcon(link.customIcon || '');
                              }}
                              className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-gray-100 rounded-full shadow-sm flex items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all z-10"
                              title="Edit Icon"
                            >
                              <Pencil size={12} />
                            </button>
                            
                            {/* Icon Editor Popover */}
                            {activeIconEditorId === link.id && (
                              <div className="absolute top-full left-0 mt-2 z-[60] w-64 bg-white border border-gray-100 rounded-xl shadow-xl p-4 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-50">
                                  <span className="text-xs font-bold text-gray-900 uppercase">Edit Icon</span>
                                  <button onClick={() => setActiveIconEditorId(null)} className="text-gray-400 hover:text-gray-900">
                                    <X size={14} />
                                  </button>
                                </div>
                                
                                <div className="flex gap-2 mb-4">
                                  <input 
                                    type="text"
                                    value={tempIcon}
                                    onChange={(e) => setTempIcon(e.target.value)}
                                    placeholder="Type emoji..."
                                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                                  />
                                  <button 
                                    onClick={() => handleQuickIconUpdate(link, tempIcon)}
                                    className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-black transition-colors"
                                  >
                                    Save
                                  </button>
                                </div>
                                
                                <div className="mb-4">
                                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Quick Picks</div>
                                  <div className="grid grid-cols-6 gap-1">
                                    {getQuickIcons().map(icon => (
                                      <button
                                        key={icon}
                                        onClick={() => setTempIcon(icon)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors text-lg"
                                      >
                                        {icon}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                
                                <button 
                                  onClick={() => handleQuickIconUpdate(link, '')}
                                  className="w-full py-2 text-[10px] font-bold text-gray-400 uppercase hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-dashed border-gray-200 transition-all"
                                >
                                  ↺ Reset to Auto
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-900 text-[15px] leading-tight line-clamp-1">{link.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-widest text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                             <Folder size={10} />
                             {link.category || 'Other'}
                          </span>
                          {isAdmin && !link.isActive && (
                            <span className="inline-block text-[10px] uppercase font-black tracking-widest text-red-500 bg-red-50 px-2 py-0.5 rounded">Inactive</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Admin Tools on Card */}
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        <button 
                          onClick={() => handleOpenModal(link)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          title="Edit Link"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(link.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                          title="Delete Link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-4 flex-1 line-clamp-3">{link.description || 'No description provided.'}</p>
                  
                  {isAdmin && (
                    <div className="mb-4">
                      <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-wider">Assigned To ({link.allowedUserIds?.length || 0})</div>
                      <div className="flex flex-wrap gap-1">
                        {link.allowedUserIds && link.allowedUserIds.slice(0, 3).map(id => {
                          const u = allUsers.find(user => user.id === id);
                          return u ? (
                            <span key={id} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                              {u.fullName}
                            </span>
                          ) : null;
                        })}
                        {link.allowedUserIds?.length > 3 && (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">+{link.allowedUserIds.length - 3}</span>
                        )}
                        {(!link.allowedUserIds || link.allowedUserIds.length === 0) && (
                          <span className="text-[10px] text-red-400 font-medium">None</span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <a 
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-yellow-400 hover:text-gray-900 border border-gray-200 hover:border-yellow-400 text-gray-700 font-semibold rounded-lg transition-colors text-sm text-center"
                  >
                    {link.buttonLabel}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-gray-200 rounded-xl shadow-soft text-center py-20 pb-10">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <Search size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No links found</h3>
          <p className="text-gray-500 text-sm max-w-md">
            {searchQuery ? 'Try adjusting your search terms.' : (isAdmin ? 'Get started by adding a new link to the library.' : 'You do not have access to any links yet.')}
          </p>
          {isAdmin && !searchQuery && (
             <button 
             onClick={() => handleOpenModal()} 
             className="mt-6 flex items-center gap-2 px-6 py-2 bg-yellow-400 text-gray-900 rounded-full hover:bg-yellow-500 transition-colors font-bold shadow-sm"
           >
             <Plus size={18} />
             Add Your First Link
           </button>
          )}
        </div>
      )}

      {/* Admin Modal for Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingLink ? 'Edit Link' : 'Add New Link'}</h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Link Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${formErrors.name ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-yellow-400'}`}
                  placeholder="e.g. Sales Dashboard"
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              {/* Custom Icon */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Custom Icon</label>
                <div className="flex gap-3">
                  <div className="w-10 h-10 border border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 text-xl shrink-0">
                    {getLinkIcon({ ...formData, name: formData.name, description: formData.description, category: formData.category })}
                  </div>
                  <div className="flex-1 flex gap-2">
                    <input 
                      type="text" 
                      name="customIcon"
                      value={formData.customIcon} 
                      onChange={handleFormChange}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Leave empty for auto-detect"
                    />
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, customIcon: '' }))}
                      className="px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl border border-blue-100 transition-colors"
                    >
                      Auto Detect
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Paste an emoji or leave empty to use smart detection</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea 
                  name="description" 
                  value={formData.description} 
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="Short explanation of what this link is for..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                <select 
                  name="category"
                  value={formData.category}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 font-bold text-gray-700"
                >
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                {formData.category === 'Custom...' && (
                  <input 
                    type="text"
                    name="customCategory"
                    value={formData.customCategory}
                    onChange={handleFormChange}
                    placeholder="Enter custom category name..."
                    className="w-full mt-2 px-4 py-2 border border-blue-200 bg-blue-50/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                  />
                )}
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">URL <span className="text-red-500">*</span></label>
                <input 
                  type="url" 
                  name="url" 
                  value={formData.url} 
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${formErrors.url ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-yellow-400'}`}
                  placeholder="https://..."
                />
                {formErrors.url && <p className="text-red-500 text-xs mt-1">{formErrors.url}</p>}
              </div>

              {/* Button Label */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Button Label <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="buttonLabel" 
                  value={formData.buttonLabel} 
                  onChange={handleFormChange}
                  className={`w-full px-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 ${formErrors.buttonLabel ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-yellow-400'}`}
                  placeholder="e.g. Open, Visit, View Dashboard"
                />
                {formErrors.buttonLabel && <p className="text-red-500 text-xs mt-1">{formErrors.buttonLabel}</p>}
              </div>

              {/* Allowed Users Multi-Select */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-semibold text-gray-700">Allowed Users <span className="text-red-500">*</span></label>
                  <span className="text-xs text-gray-500">{formData.allowedUserIds.length} selected</span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-gray-50 max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-200 bg-white border-b border-gray-200">
                     <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, allowedUserIds: allUsers.map(u => u.id) }))}
                       className="py-2 text-xs font-bold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                     >
                       Select All
                     </button>
                     <button
                       type="button"
                       onClick={() => setFormData(prev => ({ ...prev, allowedUserIds: [] }))}
                       className="py-2 text-xs font-bold text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                     >
                       Clear All
                     </button>
                  </div>
                  <div className="p-2 space-y-1">
                    {allUsers.map(u => (
                      <label 
                        key={u.id} 
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${formData.allowedUserIds.includes(u.id) ? 'bg-blue-50/50' : 'hover:bg-gray-100'}`}
                      >
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={formData.allowedUserIds.includes(u.id)}
                          onChange={() => handleUserSelectToggle(u.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-900 truncate">{u.fullName}</div>
                          <div className="text-xs text-gray-500 truncate">{u.role} &bull; {u.email}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Active Status</h4>
                  <p className="text-xs text-gray-500">Is this link visible to assigned users?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="isActive" 
                    checked={formData.isActive} 
                    onChange={handleFormChange}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-yellow-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-success"></div>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
              <button 
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 text-sm font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : (editingLink ? 'Save Changes' : 'Create Link')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-500 mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Link?</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Are you sure you want to delete this link? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDeleteId(null)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {isSaving ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* JSON Editor Modal */}
      {isJsonModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsJsonModalOpen(false)}
          />
          <div className="relative w-full max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-900" />
            
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Github size={22} className="text-gray-900" />
                  Edit src/data/linksLibrary.json
                </h3>
                <p className="text-xs font-bold text-red-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                  ⚠️ Direct JSON editing. Invalid JSON will break the app.
                </p>
              </div>
              <button onClick={() => setIsJsonModalOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 p-6 flex flex-col min-h-0 bg-gray-50">
              {isLoadingJson ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Loading from GitHub...</p>
                </div>
              ) : (
                <>
                  <textarea 
                    value={jsonContent}
                    onChange={(e) => setJsonContent(e.target.value)}
                    className="w-full flex-1 font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded-xl shadow-inner focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                    spellCheck={false}
                  />
                  {jsonError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-bold">
                      {jsonError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex items-center justify-end gap-3 bg-white bg-gray-50/50">
              <button 
                onClick={() => setIsJsonModalOpen(false)}
                className="px-6 py-3 rounded-xl border border-gray-200 font-black text-gray-500 uppercase tracking-widest hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveJson}
                disabled={isLoadingJson}
                className="px-6 py-3 bg-gray-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isLoadingJson ? 'Saving...' : 'Save to GitHub'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Library;
