import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDashboardConfig } from '../services/githubService';

const DashboardConfigContext = createContext();

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
      setConfig(content);
      setSha(latestSha);
    } catch (error) {
      console.error('Error loading config:', error);
      // fallback to some defaults if needed, but here we expect the file to exist
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
