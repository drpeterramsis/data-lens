import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Music, Image as ImageIcon, Globe, Video, FileStack, Loader2 } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { uploadFileToGitHub } from '../../services/githubService';

const QuillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    ['blockquote', 'link'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ]
};

export const SectionForm = ({ isOpen, type, onClose, onSave, initialData, isSaving }) => {
  const [formData, setFormData] = useState({
    title: '',
    type: type,
    content: '',
    fileUrl: '',
    fileName: '',
    fileSize: '',
    duration: '',
    htmlContent: '',
    videoUrl: '',
    allowDownload: false,
    caption: '',
    color: '#f97316',
    collapsible: true,
    defaultOpen: true,
    children: []
  });
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        title: '',
        type: type,
        content: '',
        fileUrl: '',
        fileName: '',
        fileSize: '',
        duration: '',
        htmlContent: '',
        videoUrl: '',
        allowDownload: false,
        caption: '',
        color: '#f97316',
        collapsible: true,
        defaultOpen: true,
        children: []
      });
    }
  }, [initialData, type, isOpen]);

  const handleFileUpload = async (e, folder, maxSize) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > maxSize) {
      alert(`File size exceeds limit (${Math.round(maxSize / 1024 / 1024)}MB)`);
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      const timestamp = new Date().getTime();
      const path = `public/skillzaty/${folder}/${timestamp}_${file.name}`;
      
      const result = await uploadFileToGitHub(path, file, `Upload ${type} for section: ${formData.title}`);
      
      setFormData(prev => ({
        ...prev,
        fileUrl: result.rawUrl,
        fileName: file.name,
        fileSize: (file.size / 1024 / 1024).toFixed(2) + 'MB'
      }));
      setUploadProgress(100);
    } catch (error) {
      console.error(error);
      alert("Upload failed. Please check your GitHub configuration.");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  if (!isOpen) return null;

  const renderFormFields = () => {
    switch (type) {
      case 'rich-text':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Content *</label>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden min-h-[300px]">
                <ReactQuill
                  theme="snow"
                  modules={QuillModules}
                  value={formData.content}
                  onChange={(val) => setFormData({ ...formData, content: val })}
                  className="h-[250px]"
                />
              </div>
            </div>
          </div>
        );

      case 'pdf':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
              {formData.fileUrl ? (
                <div className="flex flex-col items-center">
                  <FileText size={48} className="text-blue-500 mb-2" />
                  <p className="text-sm font-bold text-gray-900">{formData.fileName}</p>
                  <p className="text-xs text-gray-500 mb-4">{formData.fileSize}</p>
                  <button 
                    onClick={() => setFormData({ ...formData, fileUrl: '', fileName: '', fileSize: '' })}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    Change File
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <FileText size={48} className="text-gray-300 mb-4" />
                  <label className="cursor-pointer px-6 py-2 bg-white border border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
                    {uploading ? `Uploading (${uploadProgress.toFixed(2)}%)...` : 'Select PDF File'}
                    <input type="file" hidden accept=".pdf" onChange={(e) => handleFileUpload(e, 'pdfs', 25 * 1024 * 1024)} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest">Max size: 25MB</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50">
              {formData.fileUrl ? (
                <div className="flex flex-col items-center">
                  <Music size={48} className="text-orange-500 mb-2" />
                  <p className="text-sm font-bold text-gray-900">{formData.fileName}</p>
                  <p className="text-xs text-gray-500 mb-4">{formData.duration || 'Audio file attached'}</p>
                  <button 
                    onClick={() => setFormData({ ...formData, fileUrl: '', fileName: '' })}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 hover:bg-red-100 transition-colors"
                  >
                    Change Audio
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Music size={48} className="text-gray-300 mb-4" />
                  <label className="cursor-pointer px-6 py-2 bg-white border border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
                    {uploading ? `Uploading (${uploadProgress.toFixed(2)}%)...` : 'Select Audio File'}
                    <input type="file" hidden accept="audio/*" onChange={(e) => handleFileUpload(e, 'audio', 25 * 1024 * 1024)} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest">Max size: 25MB (.mp3, .wav, .m4a)</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center bg-gray-50">
              {formData.fileUrl ? (
                <div className="relative group">
                  <img src={formData.fileUrl} className="max-h-64 mx-auto rounded-lg shadow-md" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                    <button 
                      onClick={() => setFormData({ ...formData, fileUrl: '' })}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold shadow-lg"
                    >
                      Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center">
                  <ImageIcon size={48} className="text-gray-300 mb-4" />
                  <label className="cursor-pointer px-6 py-2 bg-white border border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50 transition-all shadow-sm">
                    {uploading ? `Uploading...` : 'Select Image File'}
                    <input type="file" hidden accept="image/*" onChange={(e) => handleFileUpload(e, 'images', 5 * 1024 * 1024)} disabled={uploading} />
                  </label>
                  <p className="text-[10px] text-gray-400 mt-4 uppercase tracking-widest">Max size: 5MB</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Caption</label>
              <input
                type="text"
                value={formData.caption}
                onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Image description..."
              />
            </div>
          </div>
        );

      case 'html':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">HTML Code *</label>
              <textarea
                rows={12}
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 text-green-400 font-mono text-sm border border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="<div style='color: blue;'>...</div>"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Live Preview</label>
              <div className="h-[275px] bg-white border border-gray-200 rounded-lg overflow-auto p-4 shadow-inner">
                 <div dangerouslySetInnerHTML={{ __html: formData.htmlContent || '<p class="text-gray-300 italic text-sm">Preview will appear here...</p>' }} />
              </div>
            </div>
          </div>
        );

      case 'video':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Video URL (Direct link or YouTube/Vimeo) *</label>
              <input
                type="text"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="https://example.com/video.mp4 or https://youtu.be/..."
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <div>
                <h4 className="font-bold text-blue-900 text-xs">Allow Download</h4>
                <p className="text-[10px] text-blue-500">Only applicable for direct video links</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.allowDownload} 
                  onChange={(e) => setFormData(p => ({ ...p, allowDownload: e.target.checked }))}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-400 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {formData.videoUrl && (
              <div className="aspect-video w-full max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-gray-200 shadow-lg flex items-center justify-center">
                <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs gap-2">
                  <Video size={24} className="text-gray-400" />
                  <p>Video Preview Active</p>
                  <p className="text-[10px] text-gray-500">{formData.videoUrl.slice(0, 40)}...</p>
                </div>
              </div>
            )}
          </div>
        );

      case 'active-card':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Accent Color</label>
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
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={formData.collapsible}
                    onChange={(e) => setFormData({ ...formData, collapsible: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Collapsible</span>
                </label>
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer mt-5">
                  <input
                    type="checkbox"
                    checked={formData.defaultOpen}
                    onChange={(e) => setFormData({ ...formData, defaultOpen: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Default Open</span>
                </label>
              </div>
            </div>
            
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800 italic">
                Active Card acts as a container. After saving, you will be able to add children blocks to it from the section list.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'rich-text': return <FileText size={18} />;
      case 'pdf': return <FileText size={18} />;
      case 'audio': return <Music size={18} />;
      case 'image': return <ImageIcon size={18} />;
      case 'html': return <Globe size={18} />;
      case 'video': return <Video size={18} />;
      case 'active-card': return <FileStack size={18} />;
      default: return <FileStack size={18} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              {getIcon()}
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {initialData ? 'Edit Block' : `Add ${type.replace('-', ' ')} Block`}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Section Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Introduction & Goals"
            />
          </div>

          {renderFormFields()}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.title || isSaving || uploading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Save Block
          </button>
        </div>
      </div>
    </div>
  );
};
