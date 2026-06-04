'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'Admin' | 'HR User' | 'View Only User';

interface User {
  name: string;
  role: UserRole;
  email: string;
}

interface RoleContextType {
  currentRole: UserRole;
  currentUser: User;
  setRole: (role: UserRole) => void;
  canWrite: boolean;
  canDelete: boolean;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const roleUsers: Record<UserRole, User> = {
  'Admin': { name: 'System Administrator', role: 'Admin', email: 'admin@company.com' },
  'HR User': { name: 'HR Executive', role: 'HR User', email: 'hr@company.com' },
  'View Only User': { name: 'Guest Viewer', role: 'View Only User', email: 'viewer@company.com' }
};

export const RoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('Admin'); // Default to Admin for easy testing
  const [currentUser, setCurrentUser] = useState<User>(roleUsers['Admin']);

  const setRole = (role: UserRole) => {
    setCurrentRole(role);
    setCurrentUser(roleUsers[role]);
    localStorage.setItem('user_role', role);
  };

  useEffect(() => {
    const savedRole = localStorage.getItem('user_role') as UserRole;
    if (savedRole && roleUsers[savedRole]) {
      setCurrentRole(savedRole);
      setCurrentUser(roleUsers[savedRole]);
    }
  }, []);

  const canWrite = currentRole === 'Admin' || currentRole === 'HR User';
  const canDelete = currentRole === 'Admin';
  const isAdmin = currentRole === 'Admin';

  return (
    <RoleContext.Provider value={{ currentRole, currentUser, setRole, canWrite, canDelete, isAdmin }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
