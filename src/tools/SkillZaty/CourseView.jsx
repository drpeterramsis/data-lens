import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, FileStack, Settings, Plus, Layout, Edit, Trash2, GripVertical, FileText, Globe, Music, Image as ImageIcon, Video, Loader2, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSkillZaty, saveSkillZaty, getLatestSHA } from '../../services/githubService';
import skillzatyLocal from '../../data/skillzaty.json';
import SectionRenderer from './SectionRenderer';
import { SectionBuilder } from './AdminModals';
import { SectionForm } from './SectionForm';

const CourseView = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Admin State
  const [adminMode, setAdminMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sectionForm, setSectionForm] = useState({ open: false, type: 'rich-text', data: null, isChild: false, parentId: null });

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getSkillZaty();
      setData(result.content);
    } catch (error) {
      if (error.message && error.message.includes('not configured')) {
        console.warn('GitHub not configured, using local SkillZaty data in CourseView');
      } else {
        console.error(error);
      }
      
      // Fallback
      if (data.categories.length === 0) {
        setData(skillzatyLocal);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const courseInfo = useMemo(() => {
    for (const cat of data.categories) {
      const course = cat.courses?.find(c => c.id === courseId);
      if (course) return { ...course, categoryName: cat.name, categoryIcon: cat.icon };
    }
    return null;
  }, [data, courseId]);

  const sections = useMemo(() => {
    return (courseInfo?.sections || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [courseInfo]);

  useEffect(() => {
    if (sections.length > 0 && !activeSectionId) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  const activeSection = useMemo(() => {
    return sections.find(s => s.id === activeSectionId);
  }, [sections, activeSectionId]);

  const activeIndex = useMemo(() => {
    return sections.findIndex(s => s.id === activeSectionId);
  }, [sections, activeSectionId]);

  const handleSaveSections = async (updatedSections) => {
    try {
      setIsSaving(true);
      const currentData = { ...data };
      const freshSha = await getLatestSHA('src/data/skillzaty.json');

      currentData.categories = currentData.categories.map(cat => ({
        ...cat,
        courses: cat.courses?.map(c => {
          if (c.id === courseId) {
            return { ...c, sections: updatedSections, updatedAt: new Date().toISOString() };
          }
          return c;
        })
      }));

      await saveSkillZaty(currentData, freshSha, `Update sections for: ${courseInfo.title}`);
      setData(currentData);
      setSectionForm({ ...sectionForm, open: false });
    } catch (error) {
      alert("Error saving sections.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEditSection = async (sectionData) => {
    let newSections = [...sections];

    if (sectionForm.isChild) {
      // Handle adding/editing child in Active Card
      newSections = newSections.map(s => {
        if (s.id === sectionForm.parentId) {
          const children = s.children || [];
          let updatedChildren;
          if (sectionForm.data) {
            updatedChildren = children.map(c => c.id === sectionForm.data.id ? { ...c, ...sectionData } : c);
          } else {
            updatedChildren = [...children, { ...sectionData, id: `child_${Date.now()}`, order: children.length + 1 }];
          }
          return { ...s, children: updatedChildren };
        }
        return s;
      });
    } else {
      if (sectionForm.data) {
        // Update
        newSections = newSections.map(s => s.id === sectionForm.data.id ? { ...s, ...sectionData } : s);
      } else {
        // Add
        newSections.push({ 
          ...sectionData, 
          id: `sec_${Date.now()}`, 
          order: newSections.length + 1 
        });
      }
    }

    await handleSaveSections(newSections);
  };

  const handleDeleteSection = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    const newSections = sections.filter(s => s.id !== id);
    await handleSaveSections(newSections);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={48} className="animate-spin text-orange-500 mb-4" />
        <p className="text-gray-500 font-medium tracking-tight uppercase text-xs">Accessing Portal...</p>
      </div>
    );
  }

  if (!courseInfo) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
        <button onClick={() => navigate('/skill-zaty')} className="text-blue-600 hover:underline">Back to Training Center</button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full bg-gray-50 overflow-hidden">
      {/* Sidebar - Desktop Layout */}
      <div 
        className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col overflow-hidden hidden md:flex ${
          isSidebarOpen ? 'w-[320px]' : 'w-0 border-r-0'
        }`}
      >
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <button 
            onClick={() => navigate('/skill-zaty')}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-gray-900 mb-4 transition-colors group uppercase tracking-widest"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Back to Library
          </button>
          
          <div className="flex items-center gap-2 mb-1">
             <span className="text-lg">{courseInfo.categoryIcon}</span>
             <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{courseInfo.categoryName}</span>
          </div>
          <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{courseInfo.title}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {sections.map((section, idx) => (
            <button
              key={section.id}
              onClick={() => setActiveSectionId(section.id)}
              className={`w-full text-left p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 ${
                activeSectionId === section.id 
                ? 'bg-gray-900 text-white shadow-xl shadow-gray-200 translate-x-2' 
                : 'bg-white border border-gray-100 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-xl border ${activeSectionId === section.id ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'} shrink-0`}>
                {section.type === 'rich-text' && <FileText size={18} />}
                {section.type === 'pdf' && <FileStack size={18} />}
                {section.type === 'audio' && <Music size={18} />}
                {section.type === 'image' && <ImageIcon size={18} />}
                {section.type === 'html' && <Globe size={18} />}
                {section.type === 'video' && <Video size={18} />}
                {section.type === 'active-card' && <Layout size={18} />}
              </div>
              <div className="min-w-0">
                <div className={`text-[10px] uppercase font-bold tracking-widest mb-0.5 ${activeSectionId === section.id ? 'text-gray-400' : 'text-gray-300'}`}>Section {idx + 1}</div>
                <div className="text-sm font-bold truncate pr-2">{section.title}</div>
              </div>
            </button>
          ))}

          {sections.length === 0 && (
            <div className="text-center py-12 text-gray-400 italic text-sm">
              No sections available.
            </div>
          )}
        </div>

        {isAdmin && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={() => setAdminMode(!adminMode)}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm ${
                adminMode 
                ? 'bg-blue-600 text-white shadow-blue-200' 
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings size={18} className={adminMode ? 'animate-spin' : ''} />
              {adminMode ? 'Cancel Edit Mode' : 'Course Editor'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Toggle Sidebar Button (Desktop) */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-4 top-4 z-10 p-2 bg-white border border-gray-200 rounded-xl shadow-lg text-gray-500 hover:text-gray-900 hidden md:block transition-all"
        >
          {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
        </button>

        {/* Content Header (Mobile View) */}
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => navigate('/skill-zaty')} className="text-gray-400"><ArrowLeft size={20} /></button>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">{courseInfo.categoryName}</div>
            <div className="w-5" />
          </div>
          <h2 className="text-base font-bold text-gray-900 truncate">{courseInfo.title}</h2>
          
          <select 
            value={activeSectionId || ''} 
            onChange={(e) => setActiveSectionId(e.target.value)}
            className="w-full mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none"
          >
            {sections.map((s, i) => (
              <option key={s.id} value={s.id}>S{i+1}: {s.title}</option>
            ))}
          </select>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto px-6 py-10 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full">
            {adminMode ? (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
                  <div className="px-8 py-5 bg-blue-600 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Settings size={22} />
                      </div>
                      <h3 className="font-extrabold text-lg tracking-tight uppercase">Structure Editor</h3>
                    </div>
                    <div className="flex gap-2">
                       <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase">Live Build</span>
                    </div>
                  </div>
                  
                  <div className="p-8 space-y-8">
                    <SectionBuilder
                      sections={sections}
                      onEdit={(s) => setSectionForm({ open: true, type: s.type, data: s, isChild: false })}
                      onDelete={handleDeleteSection}
                    />

                    <div className="pt-6 border-t border-gray-100">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Add New Block</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { type: 'rich-text', label: 'Rich Text', icon: <FileText size={18} />, color: 'blue' },
                          { type: 'pdf', label: 'PDF Docs', icon: <FileStack size={18} />, color: 'indigo' },
                          { type: 'audio', label: 'Audio', icon: <Music size={18} />, color: 'orange' },
                          { type: 'image', label: 'Images', icon: <ImageIcon size={18} />, color: 'pink' },
                          { type: 'html', label: 'Custom HTML', icon: <Globe size={18} />, color: 'emerald' },
                          { type: 'video', label: 'Video', icon: <Video size={18} />, color: 'red' },
                          { type: 'active-card', label: 'Active Card', icon: <Layout size={18} />, color: 'amber' }
                        ].map(btn => (
                          <button
                            key={btn.type}
                            onClick={() => setSectionForm({ open: true, type: btn.type, data: null, isChild: false })}
                            className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all bg-gray-50 group shadow-sm"
                          >
                            <div className={`p-2 bg-white text-${btn.color}-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform`}>
                              {btn.icon}
                            </div>
                            <span className="text-xs font-bold text-gray-600">{btn.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-Builder for Active Card children */}
                {activeSection?.type === 'active-card' && (
                  <div className="bg-white rounded-3xl border border-orange-200 shadow-xl overflow-hidden animate-in zoom-in duration-300">
                    <div className="px-8 py-4 bg-orange-500 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-white">
                        <Layout size={20} />
                        <h4 className="font-bold text-sm uppercase tracking-wide">Inside Active Card: {activeSection.title}</h4>
                      </div>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4 mb-6">
                        {activeSection.children?.length === 0 && <p className="text-center text-gray-400 italic text-sm py-4">No content inside this card yet.</p>}
                        {activeSection.children?.map(child => (
                           <div key={child.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl">
                              <div className="flex items-center gap-3">
                                 <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{child.type}</span>
                                 <span className="text-sm font-bold">{child.title}</span>
                              </div>
                              <div className="flex gap-1">
                                 <button onClick={() => setSectionForm({ open: true, type: child.type, data: child, isChild: true, parentId: activeSection.id })} className="p-1.5 text-gray-400 hover:text-blue-600"><Edit size={16} /></button>
                                 <button onClick={() => {
                                   const newSections = sections.map(s => s.id === activeSection.id ? { ...s, children: s.children.filter(c => c.id !== child.id) } : s);
                                   handleSaveSections(newSections);
                                 }} className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>
                              </div>
                           </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                         {['rich-text', 'image', 'html', 'audio', 'pdf'].map(t => (
                           <button 
                            key={t}
                            onClick={() => setSectionForm({ open: true, type: t, data: null, isChild: true, parentId: activeSection.id })}
                            className="bg-white border border-gray-200 hover:border-orange-300 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 hover:text-orange-600 transition-colors"
                           >
                            + {t}
                           </button>
                         ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-500">
                {activeSection ? (
                  <div className="space-y-8">
                    <div className="border-b border-gray-200 pb-8 mb-8">
                       <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange-500 mb-2">Section {activeIndex + 1} of {sections.length}</div>
                       <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">{activeSection.title}</h1>
                    </div>
                    
                    <div className="min-h-[400px]">
                      <SectionRenderer section={activeSection} />
                    </div>

                    <div className="mt-20 pt-8 border-t border-gray-100 flex items-center justify-between">
                      <button
                        onClick={() => activeIndex > 0 && setActiveSectionId(sections[activeIndex - 1].id)}
                        disabled={activeIndex === 0}
                        className="flex items-center gap-3 px-6 py-3 rounded-2xl font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-sm"
                      >
                        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Previous Section
                      </button>
                      
                      <button
                        onClick={() => activeIndex < sections.length - 1 && setActiveSectionId(sections[activeIndex + 1].id)}
                        disabled={activeIndex === sections.length - 1}
                        className="flex items-center gap-3 px-8 py-3 rounded-2xl font-extrabold bg-gray-900 border border-gray-900 text-white hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed group shadow-xl shadow-gray-200"
                      >
                        Next Section
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-24 text-gray-400">
                    <FileStack size={64} className="mx-auto mb-4 opacity-10" />
                    <p className="text-xl font-medium tracking-tight">Select a section to begin learning</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Section Form Modal */}
      <SectionForm
        isOpen={sectionForm.open}
        type={sectionForm.type}
        initialData={sectionForm.data}
        onClose={() => setSectionForm({ ...sectionForm, open: false })}
        onSave={handleAddEditSection}
        isSaving={isSaving}
      />
    </div>
  );
};

export default CourseView;
