'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  IdCard, 
  CreditCard, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useRole } from '@/context/RoleContext';

interface SidebarProps {
  onCollapseChange?: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCollapseChange }) => {
  const pathname = usePathname();
  const { isAdmin } = useRole();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    if (onCollapseChange) {
      onCollapseChange(newState);
    }
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Requisition Portal', path: '/dashboard', icon: LayoutDashboard }
  ];

  if (isAdmin) {
    navItems.push({ label: 'Employees Database', path: '/employees', icon: Users });
  }

  return (
    <>
      {/* Mobile Floating Toggle Menu Button */}
      <button 
        className={styles.mobileMenuBtn} 
        onClick={toggleMobile}
        aria-label="Toggle Navigation Menu"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar Container */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${isMobileOpen ? styles.sidebarActive : ''}`}>
        
        {/* Logo and Branding Header */}
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>
            <IdCard size={28} strokeWidth={2.5} />
          </div>
          <span className={`${styles.logoText} ${isCollapsed ? styles.logoTextCollapsed : ''}`}>
            Card Tracker
          </span>
        </div>

        {/* Navigation Items */}
        <nav className={styles.navSection}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
            
            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                <span className={`${styles.navLabel} ${isCollapsed ? styles.navLabelCollapsed : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Collapse Control Switch Footer */}
        <div className={styles.footerArea}>
          <button className={styles.toggleBtn} onClick={toggleSidebar} aria-label="Toggle Sidebar width">
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
