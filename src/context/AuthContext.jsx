import React, { createContext, useContext, useState, useEffect } from 'react';
import initialUsers from '../data/users.json';
import { getFileFromGitHub } from '../services/githubService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    try {
      const { content } = await getFileFromGitHub('src/data/users.json');
      if (content && content.users) {
        setUsers(content.users);
        return content.users;
      }
    } catch (e) {
      console.error("Failed to fetch users from GitHub", e);
      if (users.length === 0) setUsers(initialUsers.users);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // First run from local data
      let currentUsers = initialUsers.users;
      try {
        const { content } = await getFileFromGitHub('src/data/users.json');
        if (content && content.users) {
           currentUsers = content.users;
        }
      } catch (e) { }

      setUsers(currentUsers);

      const savedUserStr = localStorage.getItem('pharma_current_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        const freshUser = currentUsers.find(u => u.id === savedUser.id) || savedUser;
        setUser(freshUser);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Make sure when user state updates, we also check if their role/active changed
  useEffect(() => {
    if (user && users.length > 0) {
      const liveUser = users.find(u => u.id === user.id);
      if (liveUser && (liveUser.isActive !== user.isActive || liveUser.role !== user.role || JSON.stringify(liveUser.allowedPages) !== JSON.stringify(user.allowedPages))) {
         setUser(liveUser);
         localStorage.setItem('pharma_current_user', JSON.stringify(liveUser));
      }
      // If user is deleted
      if (!liveUser) {
        logout();
      }
    }
  }, [users, user]);

  useEffect(() => {
    const interval = setInterval(fetchUsers, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const login = (username, password) => {
    const foundUser = users.find(u => 
      (u.username?.toLowerCase() === username.toLowerCase() || u.email?.toLowerCase() === username.toLowerCase()) 
      && u.password === password
    );
    
    if (!foundUser) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (!foundUser.isActive) {
      return { success: false, message: 'Account disabled' };
    }

    setUser(foundUser);
    localStorage.setItem('pharma_current_user', JSON.stringify(foundUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pharma_current_user');
  };

  const updateUsers = (newUsers) => {
    setUsers(newUsers);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, updateUsers, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
