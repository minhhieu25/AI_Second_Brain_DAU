import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { DetailProvider } from '../../context/DetailContext';
import DocumentDetailDrawer from '../shared/DocumentDetailDrawer';

const Layout: React.FC = () => {
  return (
    <DetailProvider>
      <div className="app-container" style={{ 
        display: 'flex', minHeight: '100vh', background: 'var(--app-bg)', padding: '16px', gap: '16px' 
      }}>
        <Sidebar />
        <div className="main-content" style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', 
          height: 'calc(100vh - 32px)', overflow: 'hidden',
          background: 'var(--bg)', borderRadius: '24px',
          boxShadow: 'var(--shadow-card)', border: '1px solid var(--line)'
        }}>
          <Header />
          <main className="page-content" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <Outlet />
          </main>
        </div>
        <DocumentDetailDrawer />
      </div>
    </DetailProvider>
  );
};

export default Layout;
