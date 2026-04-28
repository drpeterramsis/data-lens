import React, { useMemo, useState } from 'react';
import { Search, GraduationCap, Calendar, User, ChevronRight, UserCircle, Briefcase, Clock, MapPin, Download, Shield } from 'lucide-react';

const JOBS_TITLES_COLORS = {
  "District Manager (DM)": "text-blue-700 bg-blue-50 border-blue-100",
  "Area Sales Manager": "text-purple-700 bg-purple-50 border-purple-100",
  "Regional Sales Manager": "text-purple-700 bg-purple-50 border-purple-100",
  "National Sales Manager": "text-purple-700 bg-purple-50 border-purple-100",
  "Medical Representative": "text-green-700 bg-green-50 border-green-100",
  "Senior Medical Representative": "text-green-700 bg-green-50 border-green-100",
  "Product Manager": "text-orange-700 bg-orange-50 border-orange-100",
  "Brand Manager": "text-orange-700 bg-orange-50 border-orange-100",
  "Marketing Manager": "text-orange-700 bg-orange-50 border-orange-100",
  "Medical Affairs Manager": "text-teal-700 bg-teal-50 border-teal-100",
  "Training Manager": "text-yellow-700 bg-yellow-50 border-yellow-100",
  "Field Force Excellence": "text-yellow-700 bg-yellow-50 border-yellow-100",
  "General Manager": "text-gray-900 bg-gray-100 border-gray-200",
  "Other": "text-gray-600 bg-gray-50 border-gray-100"
};

const CoachingSection = ({ data }) => {
  const [searchQ, setSearchQ] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [visitSearch, setVisitSearch] = useState("");

  const coachingSessions = useMemo(() => {
    if (!data || !data.length) return [];

    // Filter rows where coaching is TRUE
    const coachedRows = data.filter(r => 
      (r.IsMRCoachingSubmitted || "").toUpperCase() === "TRUE"
    );

    const sessionMap = {};
    coachedRows.forEach(row => {
      const date = row.ReportDate || "2026-04-01";
      const key = `${row.MrName}__${date}`;
      
      if (!sessionMap[key]) {
        sessionMap[key] = {
          id: key,
          mrName: row.MrName,
          lineName: row.LineName,
          date: date,
          coachType: row.CoachingType || "District Manager",
          hcoCoached: 0,
          phCoached: 0,
          hcpCoached: 0,
          visits: [],
        };
      }
      
      const s = sessionMap[key];
      if (row.InteractionType === "HCO") s.hcoCoached++;
      else if (row.InteractionType === "Pharmacy") s.phCoached++;
      else if (row.InteractionType === "HCP") s.hcpCoached++;

      s.visits.push({
        id: row.InteractionId,
        customerName: row.CustomerName,
        customerId: row.CustomerId,
        type: row.InteractionType,
        grade: row.CustomerGrade,
        specialty: row.Specialty,
        site: row.InteractionVisitedSite,
        coachingType: row.CoachingType,
        isManagerCoached: (row.IsManagerCoachingSubmitted || "").toUpperCase() === "TRUE",
        comment: row.Comment,
      });
    });

    return Object.values(sessionMap)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(s => ({
        ...s,
        totalCoached: s.hcoCoached + s.phCoached + s.hcpCoached,
        isCoachingDay: (s.hcoCoached + s.phCoached + s.hcpCoached) >= 4
      }));
  }, [data]);

  const filteredSessions = useMemo(() => {
    if (!searchQ.trim()) return coachingSessions;
    const q = searchQ.toLowerCase();
    return coachingSessions.filter(s => 
      s.mrName.toLowerCase().includes(q) ||
      s.date.includes(q) ||
      (s.coachType || "").toLowerCase().includes(q) ||
      s.visits.some(v => 
        (v.customerName || "").toLowerCase().includes(q) ||
        (v.customerId || "").includes(q)
      )
    );
  }, [coachingSessions, searchQ]);

  const selectedSession = useMemo(() => 
    coachingSessions.find(s => s.id === selectedSessionId),
    [coachingSessions, selectedSessionId]
  );

  const filteredVisits = useMemo(() => {
    if (!selectedSession) return [];
    if (!visitSearch.trim()) return selectedSession.visits;
    const q = visitSearch.toLowerCase();
    return selectedSession.visits.filter(v => 
      (v.customerName || "").toLowerCase().includes(q) ||
      (v.customerId || "").includes(q) ||
      (v.type || "").toLowerCase().includes(q) ||
      (v.grade || "").toLowerCase().includes(q)
    );
  }, [selectedSession, visitSearch]);

  const stats = useMemo(() => {
    return {
      totalDays: coachingSessions.filter(s => s.isCoachingDay).length,
      totalVisits: coachingSessions.reduce((sum, s) => sum + s.totalCoached, 0),
      hco: coachingSessions.reduce((sum, s) => sum + s.hcoCoached, 0),
      ph: coachingSessions.reduce((sum, s) => sum + s.phCoached, 0),
      hcp: coachingSessions.reduce((sum, s) => sum + s.hcpCoached, 0),
    };
  }, [coachingSessions]);

  return (
    <div id="section-coaching" className="scroll-mt-24 pt-8 pb-12">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-4">
          <span className="p-3 bg-yellow-400 rounded-2xl shadow-lg shadow-yellow-200">🎓</span>
          <span>Coaching <span className="text-yellow-500 underline decoration-yellow-400/20">Sessions</span></span>
        </h2>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2 ml-16">Data Lens Field Verification Engine</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="bg-white border-2 border-yellow-400/20 rounded-[2rem] p-6 text-center shadow-sm">
           <p className="text-3xl font-black text-gray-900">{stats.totalDays}</p>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Coaching Days</p>
        </div>
        <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-6 text-center shadow-sm">
           <p className="text-3xl font-black text-gray-900">{stats.totalVisits}</p>
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Coached Visits</p>
        </div>
        <div className="bg-green-50 border-2 border-green-100 rounded-[2rem] p-6 text-center shadow-sm">
           <p className="text-3xl font-black text-green-700">{stats.hco}</p>
           <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mt-1">HCO Focused</p>
        </div>
        <div className="bg-purple-50 border-2 border-purple-100 rounded-[2rem] p-6 text-center shadow-sm">
           <p className="text-3xl font-black text-purple-700">{stats.ph}</p>
           <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mt-1">Pharmacy Focus</p>
        </div>
        <div className="bg-blue-50 border-2 border-blue-100 rounded-[2rem] p-6 text-center shadow-sm">
           <p className="text-3xl font-black text-blue-700">{stats.hcp}</p>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-1">HCP Focused</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: SESSION LIST */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-4 rounded-3xl border-2 border-gray-50 flex items-center gap-3 shadow-inner">
             <Search className="text-gray-400 ml-2" size={20} />
             <input 
               type="text" 
               placeholder="Search Sessions by MR, Date, Coach..."
               value={searchQ}
               onChange={e => setSearchQ(e.target.value)}
               className="w-full text-sm font-bold outline-none placeholder:text-gray-300"
             />
          </div>

          <div className="space-y-3 max-h-[1000px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredSessions.map(session => (
              <button
                key={session.id}
                onClick={() => setSelectedSessionId(session.id)}
                className={`w-full text-left p-6 rounded-[2.5rem] border-2 transition-all group flex flex-col gap-4 ${
                  selectedSessionId === session.id
                    ? 'bg-yellow-50 border-yellow-400 shadow-xl shadow-yellow-100 translate-x-2'
                    : 'bg-white border-gray-100 hover:border-yellow-200'
                }`}
              >
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 ${
                        selectedSessionId === session.id ? 'bg-yellow-400 border-yellow-500' : 'bg-gray-50 border-gray-100 group-hover:bg-yellow-100 group-hover:border-yellow-200'
                      }`}>
                         {session.date.split('-')[2]}
                      </div>
                      <div>
                         <p className="text-xs font-black text-gray-900 group-hover:text-yellow-600 transition-colors uppercase tracking-tight">{session.mrName}</p>
                         <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                   </div>
                   {session.isCoachingDay && <span className="text-xl" title="Full Coaching Day (≥4 visits)">👑</span>}
                </div>
                
                <div className="flex items-center gap-3">
                   <div className="flex -space-x-2">
                     <span className="w-8 h-8 rounded-full bg-green-100 border-2 border-white flex items-center justify-center text-xs font-black text-green-700" title="HCO">{session.hcoCoached}</span>
                     <span className="w-8 h-8 rounded-full bg-purple-100 border-2 border-white flex items-center justify-center text-xs font-black text-purple-700" title="PH">{session.phCoached}</span>
                     <span className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-xs font-black text-blue-700" title="HCP">{session.hcpCoached}</span>
                   </div>
                   <div className="h-4 w-px bg-gray-100 mx-1"></div>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                     Coach: <span className="text-gray-900">{session.coachType}</span>
                   </p>
                   <ChevronRight className={`ml-auto transition-transform ${selectedSessionId === session.id ? 'rotate-90' : 'group-hover:translate-x-1'}`} size={16} />
                </div>
              </button>
            ))}
            {filteredSessions.length === 0 && (
              <div className="py-20 text-center bg-gray-50 rounded-[2.5rem] border-4 border-dashed border-gray-100">
                <p className="text-lg font-black text-gray-300 italic">No coaching sessions matching query</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: SESSION DETAIL CARD */}
        <div className="lg:col-span-7 sticky top-24">
          {!selectedSession ? (
            <div className="bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100 p-20 flex flex-col items-center justify-center text-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                  <GraduationCap className="text-gray-300" size={40} />
               </div>
               <h4 className="text-2xl font-black text-gray-400 uppercase tracking-tight">Select Session Summary</h4>
               <p className="text-sm text-gray-400 max-w-xs mt-3 font-medium">Click on a coaching day from the left list to view detailed visit records and manager feedback.</p>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border-2 border-yellow-400 shadow-2xl p-10 space-y-10 animate-in slide-in-from-right-8 duration-500 overflow-hidden relative group">
               <div className="absolute right-0 top-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl"></div>
               
               {/* 1. Header Detail */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-10 border-b-4 border-gray-50">
                  <div className="flex items-center gap-6">
                     <div className="w-20 h-20 rounded-[2rem] bg-gray-900 flex flex-col items-center justify-center text-white shadow-xl shadow-gray-200">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Day</span>
                        <span className="text-3xl font-black leading-none">{new Date(selectedSession.date).getDate()}</span>
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase">{selectedSession.mrName}</h3>
                        <p className="text-xs font-black text-yellow-600 mt-2 flex items-center gap-2 uppercase tracking-widest">
                          <Shield size={14}/> Coach: {selectedSession.coachType}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-[0.2em]">{new Date(selectedSession.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border-2 ${selectedSession.isCoachingDay ? 'bg-yellow-400 border-yellow-500 text-black shadow-lg shadow-yellow-100' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                        {selectedSession.isCoachingDay ? 'Coaching Day Active' : 'Partial Coaching'}
                     </span>
                     <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest leading-none">Line: {selectedSession.lineName || 'N/A'}</p>
                  </div>
               </div>

               {/* 2. Coached Visits Table */}
               <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                     <h5 className="text-[11px] font-black uppercase text-gray-400 tracking-[0.2em] flex items-center gap-2">
                       <UserCircle size={16}/> Visit Detailed Registry
                     </h5>
                     <div className="relative group/search">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within/search:text-yellow-600 transition-colors" size={14} />
                        <input 
                           type="text" 
                           placeholder="Filter visits..."
                           value={visitSearch}
                           onChange={e => setVisitSearch(e.target.value)}
                           className="bg-gray-50 border-2 border-gray-50 rounded-xl pl-10 pr-4 py-2 text-xs font-bold outline-none focus:border-yellow-400 focus:bg-white transition-all shadow-inner w-full sm:w-48"
                        />
                     </div>
                  </div>

                  <div className="border-2 border-gray-50 rounded-[2rem] overflow-hidden group/table">
                     <table className="w-full text-left text-[11px] whitespace-nowrap">
                        <thead className="bg-gray-50/50 p-4 border-b border-gray-100">
                           <tr className="uppercase font-black text-gray-400 tracking-tighter">
                              <th className="px-6 py-4">#</th>
                              <th className="px-6 py-4">Customer Name</th>
                              <th className="px-10 py-4">Type</th>
                              <th className="px-6 py-4">ID</th>
                              <th className="px-6 py-4">Grade</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                           {filteredVisits.map((visit, i) => (
                              <tr key={visit.id} className="hover:bg-yellow-50/30 transition-all group/row">
                                 <td className="px-6 py-4 font-black text-gray-300 group-hover/row:text-yellow-400">{i + 1}</td>
                                 <td className="px-6 py-4">
                                    <div className="font-black text-gray-900 flex items-center gap-1">
                                      {visit.customerName}
                                      {visit.isManagerCoached && <span title="Manager Double-Coached" className="text-yellow-600">🏛️</span>}
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                                      {visit.specialty && <span>{visit.specialty} ·</span>}
                                      <MapPin size={8}/> {visit.site || 'Field Site'}
                                    </div>
                                 </td>
                                 <td className="px-10 py-4">
                                    <span className={`px-2 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-widest ${
                                       visit.type === 'HCO' ? 'bg-green-100 text-green-700' :
                                       visit.type === 'Pharmacy' ? 'bg-purple-100 text-purple-700' :
                                       'bg-blue-100 text-blue-700'
                                    }`}>
                                       {visit.type}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4 text-gray-400 font-bold">{visit.id}</td>
                                 <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                      visit.grade === "A+" ? "bg-yellow-100 text-yellow-800 border border-yellow-200" :
                                      visit.grade === "A" ? "bg-green-100 text-green-800 border border-green-200" :
                                      visit.grade === "B" ? "bg-blue-100 text-blue-800 border border-blue-200" :
                                      "bg-gray-100 text-gray-600 border border-gray-200"
                                    }`}>
                                      {visit.grade || '—'}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                           {filteredVisits.length === 0 && (
                              <tr>
                                 <td colSpan="5" className="py-12 text-center text-gray-300 font-black italic">No records matching visit filter</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* 3. Footer Summary */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t-2 border-gray-50 items-end">
                  <div className="flex flex-col gap-6">
                     <div className="flex items-center gap-6">
                         <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-green-600 leading-none">{selectedSession.hcoCoached}</span>
                            <span className="text-[8px] font-black uppercase text-gray-400 mt-1">HCO</span>
                         </div>
                         <div className="w-px h-8 bg-gray-100"></div>
                         <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-purple-600 leading-none">{selectedSession.phCoached}</span>
                            <span className="text-[8px] font-black uppercase text-gray-400 mt-1">PH</span>
                         </div>
                         <div className="w-px h-8 bg-gray-100"></div>
                         <div className="flex flex-col items-center">
                            <span className="text-2xl font-black text-blue-600 leading-none">{selectedSession.hcpCoached}</span>
                            <span className="text-[8px] font-black uppercase text-gray-400 mt-1">HCP</span>
                         </div>
                     </div>
                     <p className="text-[9px] font-bold text-gray-400 italic max-w-sm">
                       This coaching session verify '{selectedSession.totalCoached}' interactions completed in the field under direct supervision.
                     </p>
                  </div>
                  
                  <div className="flex gap-4">
                     <button className="flex-1 bg-gray-50 h-14 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 border-2 border-gray-100 hover:bg-white hover:text-gray-900 transition-all active:scale-95">
                        <Calendar size={14}/> Add To Planner
                     </button>
                     <button className="flex-1 bg-gray-900 h-14 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-gray-200 hover:bg-black transition-all active:scale-95">
                        <Download size={14}/> Export Summary
                     </button>
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoachingSection;
