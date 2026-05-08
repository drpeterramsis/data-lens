import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDashboardConfig } from '../services/githubService';
import dashboardConfigLocal from '../data/dashboardConfig.json';
import { ALL_TOOLS } from '../config/toolsConfig';

const DashboardConfigContext = createContext();

const syncConfigWithRegistry = (config) => {
  if (!config) return config;

  let changed = false;
  const validToolIds = ALL_TOOLS.map(t => t.id);

  // 1. Sync Dashboard Modules (Tiles)
  if (config.modules) {
    // Remove modules that don't exist in registry anymore
    const filteredModules = config.modules.filter(m => {
      const isValid = validToolIds.includes(m.id);
      if (!isValid) {
        console.log(`Removing orphaned module: ${m.id}`);
        changed = true;
      }
      return isValid;
    });

    let updatedModules = [...filteredModules];

    ALL_TOOLS.forEach(tool => {
      // Skip dashboard from being a separate module tile typically
      if (tool.id === 'dashboard') return;

      const existingModule = updatedModules.find(m => m.id === tool.id);
      if (!existingModule) {
        updatedModules.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          icon: tool.icon,
          color: tool.color,
          iconColor: tool.color,
          iconBg: `${tool.color}15`,
          accentColor: tool.color,
          route: tool.route,
          visible: tool.visibleByDefault ?? true,
          adminOnly: tool.adminOnly || false,
          order: updatedModules.length + 1
        });
        changed = true;
      } else {
        // Optionally update metadata if it changed in registry
        if (existingModule.name !== tool.name || existingModule.icon !== tool.icon) {
          existingModule.name = tool.name;
          existingModule.icon = tool.icon;
          changed = true;
        }
      }
    });
    config.modules = updatedModules;
  }

  // 2. Sync Sidebar Menu Items
  if (config.sidebarMenu) {
    let updatedMenu = [...config.sidebarMenu];
    
    // Remove menu items that don't match any tool (except dashboard which is special)
    updatedMenu = updatedMenu.filter(m => {
      const toolId = m.id.replace('menu_', '');
      const isValid = validToolIds.includes(toolId) || m.id === 'menu_dashboard';
      if (!isValid) {
        changed = true;
        return false;
      }
      return true;
    });

    ALL_TOOLS.forEach(tool => {
      const menuId = `menu_${tool.id}`;
      const existingEntry = updatedMenu.find(m => m.id === menuId);
      
      if (!existingEntry) {
        updatedMenu.push({
          id: menuId,
          label: tool.name,
          icon: tool.icon,
          route: tool.route,
          order: updatedMenu.length + 1,
          visible: tool.visibleByDefault ?? true,
          adminOnly: tool.adminOnly || false,
          groupId: tool.id === 'admin-settings' ? 'grp_admin' : 
                   tool.id === 'links-library' || tool.id === 'skill-zaty' ? 'grp_resources' : 
                   'grp_analytics'
        });
        changed = true;
      }
    });

    config.sidebarMenu = updatedMenu;
  }

  return changed ? { ...config } : config;
};

export const useDashboardConfig = () => {
  const context = useContext(DashboardConfigContext);
  if (!context) {
    throw new Error('useDashboardConfig must be used within a DashboardConfigProvider');
  }
  return context;
};

export const DashboardConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { content, sha: latestSha } = await getDashboardConfig();
      const synced = syncConfigWithRegistry(content);
      setConfig(synced);
      setSha(latestSha);
    } catch (error) {
      // Don't show full error object in console, just a warning if it's a config issue
      if (error.message && error.message.includes('not configured')) {
        console.warn('GitHub not configured, using local dashboard config');
      } else {
        console.error('Error loading config:', error);
      }
      
      // fallback to local data
      if (!config) {
        const synced = syncConfigWithRegistry(dashboardConfigLocal);
        setConfig(synced);
        setSha('local-fallback');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const refreshConfig = (newConfig, newSha) => {
    if (newConfig) setConfig(newConfig);
    if (newSha) setSha(newSha);
  };

  return (
    <DashboardConfigContext.Provider value={{ config, setConfig: refreshConfig, sha, loading, reloadConfig: loadConfig, setSha }}>
      {children}
    </DashboardConfigContext.Provider>
  );
};
