import React, { createContext, useContext, useState, useEffect } from 'react';
import initialUsers from '../data/users.json';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Load users and prioritize localStorage overrides
    const storedUsers = localStorage.getItem('datalens_users_override');
    const parsedStored = storedUsers ? JSON.parse(storedUsers) : [];
    
    // Merge stored users with initial users to ensure new tools/fields are added
    const mergedUsers = initialUsers.users.map(initialU => {
      const storedU = parsedStored.find(u => u.id === initialU.id);
      if (storedU) {
        // Ensure sales-forecast and other new tools from initial users are merged
        const mergedTools = Array.from(new Set([...(storedU.tools || []), ...(initialU.tools || [])]));
        return { ...storedU, tools: mergedTools };
      }
      return initialU;
    });

    // Add any completely new users that were in localstorage but not initial
    parsedStored.forEach(su => {
      if (!mergedUsers.find(mu => mu.id === su.id)) {
        mergedUsers.push(su);
      }
    });

    setUsers(mergedUsers);

    // Check for existing session
    const savedUserStr = localStorage.getItem('pharma_current_user');
    if (savedUserStr) {
      const savedUser = JSON.parse(savedUserStr);
      // Refresh user fields from actual users source (in case tools were updated in users.json)
      const freshUser = mergedUsers.find(u => u.id === savedUser.id) || savedUser;
      setUser(freshUser);
    }
    
    setLoading(false);
  }, []);

  const login = (username, password) => {
    // case insensitive username check
    const foundUser = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    
    if (!foundUser) {
      return { success: false, message: 'Invalid username or password' };
    }

    if (!foundUser.active) {
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
    localStorage.setItem('datalens_users_override', JSON.stringify(newUsers));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, updateUsers, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
