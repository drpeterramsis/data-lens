import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, GraduationCap, Edit, Trash2, ChevronRight, FileText, Globe, Music, Image as ImageIcon, Video, FileStack, Loader2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSkillZaty, saveSkillZaty, getLatestSHA } from '../../services/githubService';
import { CategoryModal, CourseModal } from './AdminModals';

const SkillZaty = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [data, setData] = useState({ categories: [] });
  const [loading, setLoading] = useState(true);
  const [sha, setSha] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  
  // Modals
  const [catModal, setCatModal] = useState({ open: false, data: null });
  const [courseModal, setCourseModal] = useState({ open: false, data: null });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await getSkillZaty();
      setData(result.content);
      setSha(result.sha);
    } catch (error) {
      console.error('Error fetching Skill-Zaty data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter courses based on user access
  const allCourses = useMemo(() => {
    const list = [];
    data.categories.forEach(cat => {
      cat.courses?.forEach(course => {
        // Access check
        const isAllowed = isAdmin || 
          !course.allowedUserIds || 
          course.allowedUserIds.length === 0 || 
          course.allowedUserIds.includes(user?.id);
          
        if (isAllowed) {
          list.push({
            ...course,
            categoryName: cat.name,
            categoryIcon: cat.icon,
            categoryColor: cat.color,
            categoryId: cat.id
          });
        }
      });
    });
    return list.sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [data, user, isAdmin]);

  // Search logic
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results = [];
    
    data.categories.forEach(cat => {
      // Check category name
      if (cat.name.toLowerCase().includes(query)) {
        // Could add here, but usually we search courses/sections
      }
      
      cat.courses?.forEach(course => {
        // Access check for search
        const isAllowed = isAdmin || 
          !course.allowedUserIds || 
          course.allowedUserIds.length === 0 || 
          course.allowedUserIds.includes(user?.id);
          
        if (!isAllowed) return;

        // Check Course Title/Desc
        if (course.title.toLowerCase().includes(query) || course.description?.toLowerCase().includes(query)) {
          results.push({
            type: 'course',
            id: course.id,
            title: course.title,
            breadcrumb: `${cat.name} → ${course.title}`,
            courseId: course.id
          });
        }
        
        // Check Sections
        course.sections?.forEach(sec => {
          if (sec.title?.toLowerCase().includes(query)) {
            results.push({
              type: 'section',
              id: sec.id,
              title: sec.title,
              breadcrumb: `${cat.name} → ${course.title} → ${sec.title}`,
              courseId: course.id,
              sectionType: sec.type
            });
          }
        });
      });
    });
    
    return results.slice(0, 10);
  }, [data, searchQuery, user, isAdmin]);

  const filteredCourses = useMemo(() => {
    if (activeCategoryId === 'all') return allCourses;
    return allCourses.filter(c => c.categoryId === activeCategoryId);
  }, [allCourses, activeCategoryId]);

  const memoizedUsers = useMemo(() => {
    // In a real app we might fetch users. Here we use users.json content or similar
    return [
      { id: '1', fullName: 'Peter Admin', role: 'admin' },
      { id: '4', fullName: 'MR User', role: 'user' },
      { id: 'usr_1777727016685', fullName: 'DiaCore MR', role: 'user' }
    ];
  }, []);

  // Admin Actions
  const handleSaveCategory = async (catData) => {
    try {
      setIsSaving(true);
      const currentData = { ...data };
      const freshSha = await getLatestSHA('src/data/skillzaty.json');
      let savedCat = null;
      
      if (catModal.data) {
        // Update
        currentData.categories = currentData.categories.map(c => {
          if (c.id === catModal.data.id) {
            savedCat = { ...c, ...catData };
            return savedCat;
          }
          return c;
        });
      } else {
        // Add
        const newCat = {
          ...catData,
          id: `cat_${Date.now()}`,
          order: currentData.categories.length + 1,
          createdAt: new Date().toISOString(),
          courses: []
        };
        currentData.categories.push(newCat);
        savedCat = newCat;
      }
      
      await saveSkillZaty(currentData, freshSha, `Update categories: ${catData.name}`);
      setData(currentData);
      setCatModal({ open: false, data: null });
      return savedCat;
    } catch (error) {
      alert("Error saving category. Please check GitHub config.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCourse = async (courseData) => {
    try {
      setIsSaving(true);
      const currentData = { ...data };
      const freshSha = await getLatestSHA('src/data/skillzaty.json');
      
      const category = currentData.categories.find(c => c.id === courseData.categoryId);
      if (!category) return;

      if (courseModal.data) {
        // Update
        // Find old category and remove if changed
        currentData.categories = currentData.categories.map(cat => {
          const updatedCourses = cat.courses ? cat.courses.map(c => {
            if (c.id === courseModal.data.id) {
              return { ...c, ...courseData, updatedAt: new Date().toISOString() };
            }
            return c;
          }) : [];
          
          // Re-handle category change if needed (simplified here for same cat)
          return { ...cat, courses: updatedCourses };
        });
      } else {
        // Add
        const newCourse = {
          ...courseData,
          id: `crs_${Date.now()}`,
          order: (category.courses?.length || 0) + 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sections: []
        };
        if (!category.courses) category.courses = [];
        category.courses.push(newCourse);
      }

      await saveSkillZaty(currentData, freshSha, `Update courses: ${courseData.title}`);
      setData(currentData);
      setCourseModal({ open: false, data: null });
    } catch (error) {
      alert("Error saving course.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    
    try {
      const currentData = { ...data };
      const freshSha = await getLatestSHA('src/data/skillzaty.json');
      
      currentData.categories = currentData.categories.map(cat => ({
        ...cat,
        courses: cat.courses?.filter(c => c.id !== courseId) || []
      }));
      
      await saveSkillZaty(currentData, freshSha, "Delete course");
      setData(currentData);
    } catch (error) {
      alert("Delete failed");
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm("Delete this category and ALL its courses?")) return;
    
    try {
      const currentData = { ...data };
      const freshSha = await getLatestSHA('src/data/skillzaty.json');
      
      currentData.categories = currentData.categories.filter(c => c.id !== catId);
      
      await saveSkillZaty(currentData, freshSha, "Delete category");
      setData(currentData);
      if (activeCategoryId === catId) setActiveCategoryId('all');
    } catch (error) {
      alert("Delete failed");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <Loader2 size={48} className="animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium">Loading Training Center...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm border border-orange-200">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Skill-Zaty</h1>
                  <p className="text-gray-500 font-medium">Pharma Intelligence Training Center</p>
                </div>
              </div>
            </div>

            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={22} />
              </div>
              <input
                type="text"
                placeholder="Search training, courses, sections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-orange-500 focus:bg-white outline-none transition-all shadow-sm text-gray-900"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              )}

              {/* Search Results Dropdown */}
              {searchQuery.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Results</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{searchResults.length} found</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    {searchResults.length === 0 ? (
                      <div className="p-8 text-center text-gray-400">
                        <Search size={32} className="mx-auto mb-2 opacity-10" />
                        <p className="text-sm font-medium">No results found for "{searchQuery}"</p>
                      </div>
                    ) : (
                      searchResults.map((res, i) => (
                        <button
                          key={`${res.type}-${res.id}-${i}`}
                          onClick={() => {
                            setSearchQuery('');
                            navigate(`/skill-zaty/${res.courseId}`);
                          }}
                          className="w-full px-4 py-4 text-left hover:bg-orange-50 flex items-start gap-3 border-b border-gray-50 last:border-0 transition-colors group"
                        >
                          <div className={`mt-0.5 p-1.5 rounded-lg ${res.type === 'course' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                            {res.type === 'course' ? <GraduationCap size={16} /> : <FileText size={16} />}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-orange-700 transition-colors">{res.title}</div>
                            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{res.breadcrumb}</div>
                          </div>
                          <ChevronRight size={16} className="ml-auto text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
        {/* Categories Tabs */}
        <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={`px-6 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
              activeCategoryId === 'all' 
              ? 'bg-gray-900 border-gray-900 text-white shadow-gray-200' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            All Courses
          </button>
          
          {data.categories.sort((a, b) => a.order - b.order).map(cat => (
            <div key={cat.id} className="relative group/cat shrink-0">
              <button
                onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all shadow-sm border ${
                  activeCategoryId === cat.id 
                  ? 'bg-white border-2 text-gray-900' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={{ borderColor: activeCategoryId === cat.id ? cat.color : '#DEE2E6' }}
              >
                <span className="text-lg">{cat.icon}</span>
                {cat.name}
              </button>
              
              {isAdmin && (
                <div className="absolute -top-3 -right-3 flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity z-10 scale-75">
                  <button onClick={() => setCatModal({ open: true, data: cat })} className="p-2 bg-white border border-gray-200 rounded-full shadow-lg text-blue-600 hover:bg-blue-50">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 bg-white border border-gray-200 rounded-full shadow-lg text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {isAdmin && (
            <button
              onClick={() => setCatModal({ open: true, data: null })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all border-dashed shrink-0"
            >
              <Plus size={18} />
              Add Category
            </button>
          )}
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isAdmin && (
            <button
              onClick={() => setCourseModal({ open: true, data: null })}
              className="h-full min-h-[340px] border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-8 bg-white hover:bg-blue-50 hover:border-blue-300 group transition-all"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Plus size={32} />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Create New Course</h3>
              <p className="text-gray-400 text-sm text-center mt-2">Design a new training program for your team</p>
            </button>
          )}

          {filteredCourses.map((course, idx) => (
            <div 
              key={course.id}
              className="group bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <div className="relative aspect-video overflow-hidden bg-gray-100">
                {course.thumbnail ? (
                  <img src={course.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" alt={course.title} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${course.categoryColor}20` }}>
                    <GraduationCap size={48} style={{ color: course.categoryColor }} className="opacity-30" />
                  </div>
                )}
                <div className="absolute top-4 left-4">
                  <span 
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold text-white uppercase tracking-wider shadow-lg"
                    style={{ backgroundColor: course.categoryColor }}
                  >
                    <span>{course.categoryIcon}</span>
                    {course.categoryName}
                  </span>
                </div>
                {isAdmin && (
                  <div className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all scale-90 origin-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setCourseModal({ open: true, data: course }); }}
                      className="p-2.5 bg-white/90 backdrop-blur-sm text-blue-600 rounded-2xl shadow-xl hover:bg-white"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}
                      className="p-2.5 bg-white/90 backdrop-blur-sm text-red-600 rounded-2xl shadow-xl hover:bg-white"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-2 line-clamp-1">{course.title}</h3>
                <p className="text-gray-500 text-sm mb-6 line-clamp-2 leading-relaxed flex-1">{course.description}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gray-100 rounded-lg text-gray-500">
                      <FileStack size={14} />
                    </div>
                    <span className="text-xs font-bold text-gray-500">{course.sections?.length || 0} Sections</span>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/skill-zaty/${course.id}`)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-extrabold text-sm border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm"
                  >
                    Open Course
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCourses.length === 0 && !isAdmin && (
          <div className="py-20 text-center animate-in zoom-in duration-300">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <GraduationCap size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Courses Available</h3>
            <p className="text-gray-500 max-w-md mx-auto font-medium">Check back later for new training programs from your administrator. 📚</p>
          </div>
        )}
      </div>

      {/* Admin Modals */}
      <CategoryModal
        isOpen={catModal.open}
        onClose={() => setCatModal({ open: false, data: null })}
        initialData={catModal.data}
        onSave={handleSaveCategory}
        isSaving={isSaving}
      />
      
      <CourseModal
        isOpen={courseModal.open}
        onClose={() => setCourseModal({ open: false, data: null })}
        initialData={courseModal.data}
        onSave={handleSaveCourse}
        onSaveCategory={handleSaveCategory}
        categories={data.categories}
        users={memoizedUsers}
        isSaving={isSaving}
      />
    </div>
  );
};

export default SkillZaty;
