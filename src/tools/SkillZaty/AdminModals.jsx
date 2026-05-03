import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Edit, GripVertical, FileText, Music, Image as ImageIcon, Globe, FileStack, Video, Save, Loader2, Search } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { uploadFileToGitHub } from '../../services/githubService';

export const CategoryModal = ({ isOpen, onClose, onSave, initialData, isSaving }) => {
  const [formData, setFormData] = useState({
    name: '',
    icon: '💼',
    color: '#0ea5e9'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({ name: '', icon: '💼', color: '#0ea5e9' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Edit Category' : 'Add New Category'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="e.g. Sales Training"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Icon *</label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Emoji or Icon"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Color *</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-10 w-12 p-1 bg-white border border-gray-200 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || isSaving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {initialData ? 'Update Category' : 'Save Category'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const CourseModal = ({ isOpen, onClose, onSave, initialData, categories, users, isSaving }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: '',
    allowedUserIds: [],
    isActive: true,
    thumbnail: ''
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        allowedUserIds: initialData.allowedUserIds || []
      });
    } else {
      setFormData({
        title: '',
        description: '',
        categoryId: categories[0]?.id || '',
        allowedUserIds: [],
        isActive: true,
        thumbnail: ''
      });
    }
  }, [initialData, isOpen, categories]);

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image exceeds 5MB limit");
      return;
    }

    try {
      setUploading(true);
      const timestamp = new Date().getTime();
      const path = `public/skillzaty/thumbs/${timestamp}_${file.name}`;
      const result = await uploadFileToGitHub(path, file, "Upload course thumbnail");
      setFormData(prev => ({ ...prev, thumbnail: result.rawUrl }));
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Edit Course' : 'Create New Course'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Course Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Thumbnail</label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                  {formData.thumbnail ? (
                    <div className="relative group">
                      <img src={formData.thumbnail} className="w-full aspect-video object-cover rounded-lg shadow-sm" alt="Thumbnail" />
                      <button 
                        onClick={() => setFormData({ ...formData, thumbnail: '' })}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon size={32} className="text-gray-300" />
                        <label className="cursor-pointer px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                          {uploading ? 'Uploading...' : 'Upload Image'}
                          <input type="file" hidden accept="image/*" onChange={handleThumbnailUpload} disabled={uploading} />
                        </label>
                        <p className="text-[10px] text-gray-400 uppercase">Max size: 5MB</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Access Control</label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {users?.map(user => (
                    <label key={user.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.allowedUserIds.includes(user.id)}
                        onChange={(e) => {
                          const newIds = e.target.checked 
                            ? [...formData.allowedUserIds, user.id]
                            : formData.allowedUserIds.filter(id => id !== user.id);
                          setFormData({ ...formData, allowedUserIds: newIds });
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{user.fullName}</span>
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-500 ml-auto uppercase font-mono">{user.role}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1 italic">If none selected, it will be visible to all training users.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.title || !formData.categoryId || isSaving || uploading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {initialData ? 'Update Course' : 'Create Course'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SectionBuilder = ({ sections, onUpdate, onAdd, onEdit, onDelete }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileStack size={18} className="text-blue-500" />
          Course Sections ({sections?.length || 0})
        </h4>
        <div className="flex gap-2">
          {/* Add Section dropdown/buttons handled by parent */}
        </div>
      </div>

      <div className="space-y-3">
        {(!sections || sections.length === 0) && (
          <div className="py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400">
            <FileStack size={48} className="mb-2 opacity-20" />
            <p className="text-sm">No sections added yet</p>
          </div>
        )}

        {sections?.sort((a, b) => a.order - b.order).map((section, index) => (
          <div 
            key={section.id} 
            className="group bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-4 hover:shadow-md transition-all animate-in slide-in-from-bottom-2 duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="p-2 bg-gray-50 rounded-lg text-gray-300 cursor-grab active:cursor-grabbing">
              <GripVertical size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-indigo-50 text-indigo-600 rounded">
                  {section.type}
                </span>
                <h5 className="text-sm font-bold text-gray-900 truncate">{section.title || 'Untitled Section'}</h5>
              </div>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(section)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit size={18} />
              </button>
              <button 
                onClick={() => onDelete(section.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
