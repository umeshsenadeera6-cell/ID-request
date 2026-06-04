'use client';

import React from 'react';
import { Shield, User as UserIcon } from 'lucide-react';
import { useRole, UserRole } from '@/context/RoleContext';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  const { currentRole, currentUser, setRole } = useRole();

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRole(e.target.value as UserRole);
  };

  // Get initials for profile avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeClass = (role: UserRole) => {
    if (role === 'Admin') return styles.userRoleBadgeAdmin;
    if (role === 'HR User') return styles.userRoleBadgeHR;
    return styles.userRoleBadgeViewer;
  };

  return (
    <header className={styles.header}>
      {/* Title Panel */}
      <div className={styles.titleArea}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>

      {/* Control Actions & User Details */}
      <div className={styles.actionsArea}>
        {/* Role Quick Selector */}
        <div className={styles.roleSelectorContainer} title="Toggle roles to view layout permissions">
          <Shield size={16} className={styles.roleLabel} style={{ color: 'var(--primary)' }} />
          <span className={styles.roleLabel}>Access Role:</span>
          <select 
            className={styles.roleSelect} 
            value={currentRole} 
            onChange={handleRoleChange}
          >
            <option value="Admin">Admin</option>
            <option value="HR User">HR User</option>
            <option value="View Only User">View Only</option>
          </select>
        </div>

        {/* Profile Card */}
        <div className={styles.profileArea}>
          <div className={styles.avatar}>
            {currentUser.name ? getInitials(currentUser.name) : <UserIcon size={18} />}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{currentUser.name}</span>
            <span className={`${styles.userRoleBadge} ${getRoleBadgeClass(currentRole)}`}>
              {currentRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Header;
