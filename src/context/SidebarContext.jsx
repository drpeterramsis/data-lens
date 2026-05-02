import React, { createContext, useContext, useState, useEffect } from 'react';

const SidebarContext = createContext();

export const SidebarProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('datalens_sidebar_expanded');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('datalens_sidebar_expanded', JSON.stringify(isExpanded));
  }, [isExpanded]);

  const toggleExpanded = () => setIsExpanded(!isExpanded);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  const closeMobile = () => setIsMobileOpen(false);

  return (
    <SidebarContext.Provider value={{ isExpanded, isMobileOpen, toggleExpanded, toggleMobile, closeMobile }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => useContext(SidebarContext);
