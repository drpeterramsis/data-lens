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
    const mergedUsers = storedUsers 
      ? JSON.parse(storedUsers) 
      : initialUsers.users;
    setUsers(mergedUsers);

    // Initial session check
    const savedUser = sessionStorage.getItem('datalens_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (email, password) => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    
    if (!foundUser) {
      return { success: false, message: 'Invalid email or password' };
    }

    if (!foundUser.active) {
      return { success: false, message: 'Account disabled' };
    }

    setUser(foundUser);
    sessionStorage.setItem('datalens_user', JSON.stringify(foundUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('datalens_user');
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
