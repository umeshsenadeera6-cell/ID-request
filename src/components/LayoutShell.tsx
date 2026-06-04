'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar onCollapseChange={setCollapsed} />
      <div className={`page-wrapper ${collapsed ? 'page-wrapper-collapsed' : ''}`}>
        {children}
      </div>
    </div>
  );
}
