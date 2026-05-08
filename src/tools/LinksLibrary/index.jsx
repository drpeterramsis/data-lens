import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Link as LinkIcon, Plus, Edit, Trash2, X, AlertTriangle, ExternalLink, Github, Folder, Pencil, Loader2, Globe, FileDown, FileText, File as FileIcon, CheckCircle, Smartphone, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import initialLinksData from '../../data/linksLibrary.json';
import Toast, { useToast } from '../../components/Toast';
import { getFileContent, updateFileContent, validateJSON, getLatestSHA, saveFileToGitHub, getFileFromGitHub, uploadFileToGitHub } from '../../services/githubService';
import { getLinkIcon, getQuickIcons } from '../../utils/iconDetector';
import VideoPlayer from '../../components/ui/VideoPlayer';

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
    url: '', // This will be treated as primaryUrl
    buttonLabel: 'Open', // This will be treated as primaryLabel
    primaryAction: 'open',
    primaryFileUrl: '',
    primaryFileName: '',
    primarySourceType: 'url', // 'url' or 'file'
    mediaType: 'none', // 'none', 'file', 'link', 'video'
    videoConfig: {
      url: '',
      title: '',
      allowDownload: false,
      defaultSpeed: 1
    },
    extraButtons: [], // max 3: { id, label, url, action, color, customHex }
    allowedUserIds: [],
    isActive: true
  });
  
  const colorClasses = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700',
    secondary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-700',
    warning: 'bg-amber-400 hover:bg-amber-500 text-black border-amber-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-700',
    gray: 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300'
  };

  const getContrastText = (hexcolor) => {
    if (!hexcolor || hexcolor === 'custom') return 'text-white';
    if (!hexcolor.startsWith('#')) return 'text-white';
    
    const r = parseInt(hexcolor.substring(1, 3), 16);
    const g = parseInt(hexcolor.substring(3, 5), 16);
    const b = parseInt(hexcolor.substring(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? 'text-black' : 'text-white';
  };
  
  const [formErrors, setFormErrors] = useState({});
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

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
        url: link.url || '',
        buttonLabel: link.buttonLabel || 'Open',
        primaryAction: link.primaryAction || 'open',
        primaryFileUrl: link.primaryFileUrl || '',
        primaryFileName: link.primaryFileName || '',
        primarySourceType: link.primaryFileUrl ? 'file' : 'url',
        mediaType: link.mediaType || (link.primaryFileUrl ? 'file' : 'link'),
        videoConfig: link.videoConfig || { url: '', title: '', allowDownload: false, defaultSpeed: 1 },
        extraButtons: link.extraButtons || [],
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
        primaryAction: 'open',
        primaryFileUrl: '',
        primaryFileName: '',
        primarySourceType: 'url',
        mediaType: 'link',
        videoConfig: { url: '', title: '', allowDownload: false, defaultSpeed: 1 },
        extraButtons: [],
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
    
    // Check primary source
    const effectiveUrl = formData.primarySourceType === 'file' ? formData.primaryFileUrl : formData.url;
    if (!effectiveUrl) {
      errors.url = 'URL or File is required';
    } else if (formData.primarySourceType === 'url' && !isValidUrl(formData.url)) {
      errors.url = 'Valid URL is required (include http:// or https://)';
    }

    if (!formData.buttonLabel.trim()) errors.buttonLabel = 'Button label is required';
    
    // Validate extra buttons
    if (formData.extraButtons?.length > 0) {
      formData.extraButtons.forEach((btn, idx) => {
        if (!btn.label.trim()) errors[`btn_${idx}_label`] = 'Label required';
        if (!btn.url.trim()) errors[`btn_${idx}_url`] = 'URL required';
        else if (!isValidUrl(btn.url)) errors[`btn_${idx}_url`] = 'Valid URL required';
        
        if (btn.color === 'custom') {
          const hexRegex = /^#([0-9A-Fa-f]{6})$/;
          if (!btn.customHex || !hexRegex.test(btn.customHex)) {
            errors[`btn_${idx}_hex`] = 'Valid Hex required (e.g. #FF7A00)';
          }
        }
      });
    }

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
        mediaType: formData.mediaType,
        videoConfig: formData.videoConfig,
        // Map back to legacy field 'url' for compatibility if needed, but we use primary resolver
        url: formData.url, 
        buttonLabel: formData.buttonLabel,
        primaryAction: formData.primaryAction,
        primaryFileUrl: formData.primaryFileUrl,
        primaryFileName: formData.primaryFileName,
        extraButtons: formData.extraButtons,
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check size (e.g., 20MB limit)
    if (file.size > 20 * 1024 * 1024) {
      showToast("File size exceeds 20MB limit", "error");
      return;
    }

    setIsUploadingFile(true);
    try {
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `public/library/files/${timestamp}_${sanitizedName}`;
      
      const result = await uploadFileToGitHub(filePath, file, `Upload library file: ${file.name}`);
      
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          primaryFileUrl: result.rawUrl,
          primaryFileName: file.name
        }));
        showToast("File uploaded to GitHub ✅", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to upload file ❌", "error");
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const addExtraButton = () => {
    if (formData.extraButtons?.length >= 3) return;
    setFormData(prev => ({
      ...prev,
      extraButtons: [
        ...(prev.extraButtons || []),
        { id: `btn_${Date.now()}`, label: '', url: '', action: 'open', color: 'secondary' }
      ]
    }));
  };

  const updateExtraButton = (id, field, value) => {
    setFormData(prev => ({
      ...prev,
      extraButtons: prev.extraButtons.map(btn => 
        btn.id === id ? { ...btn, [field]: value } : btn
      )
    }));
  };

  const removeExtraButton = (id) => {
    setFormData(prev => ({
      ...prev,
      extraButtons: prev.extraButtons.filter(btn => btn.id !== id)
    }));
  };

  const handleLinkAction = (url, action) => {
    if (!url) return;
    
    switch (action) {
      case 'open':
        window.open(url, '_blank', 'noopener,noreferrer');
        break;
      case 'same_tab':
        window.location.href = url;
        break;
      case 'download':
        // Modern browsers usually need a direct click or specific headers for 'download' attribute to work cross-origin
        // Best effort: open in new tab and let browser handle if it's a file
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        link.download = ''; // Best effort
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        break;
      default:
        window.open(url, '_blank', 'noopener,noreferrer');
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
                  
                  {link.mediaType === 'video' && link.videoConfig?.url && (
                    <div className="mb-4">
                      <VideoPlayer 
                        url={link.videoConfig.url}
                        title={link.videoConfig.title || link.name}
                        allowDownload={link.videoConfig.allowDownload}
                        defaultSpeed={link.videoConfig.defaultSpeed}
                        className="rounded-lg shadow-sm"
                      />
                    </div>
                  )}

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
                  
                  <div className="space-y-2 mt-auto">
                    {/* Primary Button */}
                    {(() => {
                      const primaryUrl = link.primaryFileUrl || link.url;
                      const hasPrimary = !!primaryUrl;
                      
                      return (
                        <button 
                          onClick={() => hasPrimary && handleLinkAction(primaryUrl, link.primaryAction || 'open')}
                          disabled={!hasPrimary}
                          className={`w-full flex justify-center items-center gap-2 py-2.5 px-4 font-semibold rounded-lg transition-all text-sm text-center border shadow-sm ${
                            hasPrimary 
                              ? 'bg-gray-900 border-gray-900 text-white hover:bg-black hover:scale-[1.02] active:scale-95' 
                              : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          }`}
                        >
                          <span className="truncate">{link.buttonLabel || 'Open'}</span>
                          {link.primaryAction === 'download' ? <FileDown size={14} /> : <ExternalLink size={14} />}
                        </button>
                      );
                    })()}

                    {/* Extra Buttons */}
                    {link.extraButtons?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {link.extraButtons.map(btn => {
                          const isCustom = btn.color === 'custom' && btn.customHex;
                          const bgStyle = isCustom ? { backgroundColor: btn.customHex } : {};
                          const textColorClass = isCustom ? getContrastText(btn.customHex) : '';
                          const presetClass = !isCustom ? (colorClasses[btn.color || 'secondary'] || colorClasses.secondary) : '';

                          return (
                            <button
                              key={btn.id}
                              onClick={() => handleLinkAction(btn.url, btn.action)}
                              style={bgStyle}
                              className={`flex-1 min-w-[100px] flex justify-center items-center gap-2 py-2 px-3 font-bold rounded-lg transition-all text-xs text-center border active:scale-95 shadow-sm truncate ${presetClass} ${textColorClass}`}
                            >
                              <span className="truncate">{btn.label}</span>
                              {btn.action === 'download' ? <FileDown size={12} /> : <Globe size={12} />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
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

              {/* Button Label */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Smartphone size={14} className="text-blue-500" />
                    Primary Button Label <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    name="buttonLabel" 
                    value={formData.buttonLabel} 
                    onChange={handleFormChange}
                    className={`w-full px-4 py-2 border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 ${formErrors.buttonLabel ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-yellow-400'}`}
                    placeholder="e.g. Open Report"
                  />
                  {formErrors.buttonLabel && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.buttonLabel}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-500" />
                    Primary Action
                  </label>
                  <select 
                    name="primaryAction"
                    value={formData.primaryAction}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 bg-gray-50 font-bold"
                  >
                    <option value="open">New Tab (Open)</option>
                    <option value="same_tab">Same Tab</option>
                    <option value="download">Direct Download</option>
                  </select>
                </div>
              </div>

              {/* Content Type Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Content Type</label>
                <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                  {['link', 'file', 'video'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, mediaType: type }))}
                      className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${formData.mediaType === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Configuration (if needed) */}
              {formData.mediaType === 'video' && (
                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Video size={16} className="text-violet-600" />
                    <label className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Video Configuration</label>
                  </div>
                  
                  <div>
                    <label className="block text-[9px] font-black text-violet-400 uppercase mb-1">Direct Video URL</label>
                    <input 
                      type="url"
                      value={formData.videoConfig.url}
                      onChange={(e) => setFormData(p => ({ ...p, videoConfig: { ...p.videoConfig, url: e.target.value } }))}
                      className="w-full px-4 py-2 border border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                      placeholder="https://example.com/video.mp4"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-black text-violet-400 uppercase mb-1">Alternative Title (Optional)</label>
                      <input 
                        type="text"
                        value={formData.videoConfig.title}
                        onChange={(e) => setFormData(p => ({ ...p, videoConfig: { ...p.videoConfig, title: e.target.value } }))}
                        className="w-full px-4 py-2 border border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
                        placeholder="Video Title"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-violet-400 uppercase mb-1">Default Speed</label>
                      <select 
                        value={formData.videoConfig.defaultSpeed}
                        onChange={(e) => setFormData(p => ({ ...p, videoConfig: { ...p.videoConfig, defaultSpeed: parseFloat(e.target.value) } }))}
                        className="w-full px-4 py-2 border border-violet-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white font-bold"
                      >
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                          <option key={s} value={s}>{s}x</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-white border border-violet-100 rounded-xl">
                    <div>
                      <h4 className="font-bold text-violet-900 text-xs">Allow Download</h4>
                      <p className="text-[10px] text-violet-400">Add download button to player</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={formData.videoConfig.allowDownload} 
                        onChange={(e) => setFormData(p => ({ ...p, videoConfig: { ...p.videoConfig, allowDownload: e.target.checked } }))}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-violet-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                    </label>
                  </div>
                </div>
              )}

              {/* Primary Source Group */}
              {formData.mediaType !== 'video' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Link Source</label>
                  <div className="flex bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, primarySourceType: 'url' }))}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${formData.primarySourceType === 'url' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Url
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, primarySourceType: 'file' }))}
                      className={`px-3 py-1 text-[10px] font-black uppercase rounded-md transition-all ${formData.primarySourceType === 'file' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      File
                    </button>
                  </div>
                </div>

                {formData.primarySourceType === 'url' ? (
                  <div>
                    <input 
                      type="url" 
                      name="url" 
                      value={formData.url} 
                      onChange={handleFormChange}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 ${formErrors.url ? 'border-red-300 focus:ring-red-500 bg-red-50' : 'border-gray-200 focus:ring-yellow-400'}`}
                      placeholder="https://example.com/report"
                    />
                    {formErrors.url && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase">{formErrors.url}</p>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.primaryFileUrl ? (
                      <div className="bg-white p-3 border border-green-100 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600 shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 truncate">{formData.primaryFileName}</p>
                            <p className="text-[10px] text-green-500 font-medium truncate uppercase tracking-tighter">GitHub Hosted</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                           <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                            title="Replace File"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setFormData(p => ({ ...p, primaryFileUrl: '', primaryFileName: '' }))}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove File"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => !isUploadingFile && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isUploadingFile ? 'bg-slate-100 border-slate-300 opacity-50' : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/30'}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          {isUploadingFile ? (
                            <Loader2 size={32} className="text-blue-500 animate-spin" />
                          ) : (
                            <FileIcon size={32} className="text-slate-300" />
                          )}
                          <p className="text-xs font-bold text-slate-500">{isUploadingFile ? 'Uploading to GitHub...' : 'Click to upload file'}</p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Supports PDF, Excel, Ppt, Images</p>
                        </div>
                      </div>
                    )}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                    {formErrors.url && !formData.primaryFileUrl && <p className="text-red-500 text-[10px] mt-1 font-bold uppercase text-center">{formErrors.url}</p>}
                  </div>
                )}
              </div>
              )}

              {/* Extra Buttons Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-tight">
                    <Plus size={14} className="text-pink-500" />
                    Extra Buttons ({formData.extraButtons?.length || 0}/3)
                  </label>
                  {(formData.extraButtons?.length < 3) && (
                    <button 
                      type="button"
                      onClick={addExtraButton}
                      className="text-[10px] font-black uppercase text-pink-600 hover:text-pink-700 bg-pink-50 px-3 py-1 rounded-full transition-all border border-pink-100 shadow-sm"
                    >
                      ✚ Add Button
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {formData.extraButtons?.map((btn, idx) => (
                    <div key={btn.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl relative animate-in slide-in-from-top-2 duration-200">
                      <button 
                        type="button"
                        onClick={() => removeExtraButton(btn.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all z-10"
                      >
                        <X size={14} />
                      </button>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Label</label>
                          <input 
                            type="text"
                            value={btn.label}
                            onChange={(e) => updateExtraButton(btn.id, 'label', e.target.value)}
                            className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-bold outline-none focus:ring-2 ${formErrors[`btn_${idx}_label`] ? 'border-red-300' : 'border-slate-200 focus:ring-pink-500/20'}`}
                            placeholder="e.g. Download PDF"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Action</label>
                          <select
                            value={btn.action}
                            onChange={(e) => updateExtraButton(btn.id, 'action', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-pink-500/20"
                          >
                            <option value="open">New Tab</option>
                            <option value="same_tab">Same Tab</option>
                            <option value="download">Download</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Color Theme</label>
                          <select
                            value={btn.color}
                            onChange={(e) => updateExtraButton(btn.id, 'color', e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-pink-500/20"
                          >
                            <option value="primary">Primary (Emerald)</option>
                            <option value="secondary">Secondary (Blue)</option>
                            <option value="success">Success (Green)</option>
                            <option value="warning">Warning (Amber)</option>
                            <option value="danger">Danger (Red)</option>
                            <option value="gray">Gray (Slate)</option>
                            <option value="custom">Custom Hex</option>
                          </select>
                        </div>
                        {btn.color === 'custom' && (
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Hex Code</label>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={btn.customHex || '#'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val.length <= 7) updateExtraButton(btn.id, 'customHex', val);
                                }}
                                className={`flex-1 px-3 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold outline-none ${formErrors[`btn_${idx}_hex`] ? 'border-red-500' : 'border-slate-200'}`}
                                placeholder="#000000"
                              />
                              <div 
                                className="w-8 h-8 rounded-lg border border-slate-200 shadow-inner" 
                                style={{ backgroundColor: btn.customHex?.startsWith('#') ? btn.customHex : '#eee' }} 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Preview</label>
                        <div className="flex gap-2">
                          {(() => {
                            const isCustom = btn.color === 'custom' && btn.customHex;
                            const bgStyle = isCustom ? { backgroundColor: btn.customHex } : {};
                            const textColorClass = isCustom ? getContrastText(btn.customHex) : '';
                            const presetClass = !isCustom ? (colorClasses[btn.color || 'secondary'] || colorClasses.secondary) : '';
                            
                            return (
                                <div 
                                  style={bgStyle}
                                  className={`flex-1 py-2 px-3 rounded-lg border text-center text-[10px] font-bold shadow-sm ${presetClass} ${textColorClass}`}
                                >
                                  {btn.label || 'Button Preview'}
                                </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">URL</label>
                        <input 
                          type="url"
                          value={btn.url}
                          onChange={(e) => updateExtraButton(btn.id, 'url', e.target.value)}
                          className={`w-full px-3 py-1.5 bg-white border rounded-lg text-xs font-bold outline-none focus:ring-2 ${formErrors[`btn_${idx}_url`] ? 'border-red-300' : 'border-slate-200 focus:ring-pink-500/20'}`}
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  ))}

                  {(!formData.extraButtons || formData.extraButtons.length === 0) && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">No extra buttons added</p>
                    </div>
                  )}
                </div>
              </div>

              {/* URL - HIDDEN - Replaced by primary source group above */}
              {/* Button Label - HIDDEN - Replaced by primary button label group above */}

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
