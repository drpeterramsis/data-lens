import React, { createContext, useContext, useState, useEffect } from 'react';
import initialUsers from '../data/users.json';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Load users and prioritize localStorage overrides
    const storedUsers = localStorage.getItem('pharmapulse_users_override');
    const mergedUsers = storedUsers 
      ? JSON.parse(storedUsers) 
      : initialUsers.users;
    setUsers(mergedUsers);

    // Check for existing session
    const savedUser = localStorage.getItem('pharma_current_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
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
    localStorage.setItem('pharmapulse_users_override', JSON.stringify(newUsers));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, users, updateUsers, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
