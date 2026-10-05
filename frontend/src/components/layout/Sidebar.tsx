import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  FileX2,
  CalendarClock,
  PieChart,
  History,
  ClipboardList,
  Search,
  CheckSquare,
  Book,
  Network,
  Bot,
  Layers,
  Settings,
  Trash2
} from 'lucide-react';

import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';

const Badge = ({ count }: { count: number }) => {
  if (!count) return null;
  return (
    <span style={{
      background: '#ef4444', 
      color: 'white', 
      fontSize: '11px', 
      fontWeight: 700, 
      padding: '2px 8px', 
      borderRadius: '12px'
    }}>
      {count}
    </span>
  );
};

const navStyle = {};

const Sidebar: React.FC = () => {
  const { data, readDeadDocs, readEvents, readObligations, readThresholds, readDeadlines, readWarnings} = useData();
  const { role, logout, user } = useAuth();
  
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const allWarnings = (data?.insights?.uuTien || []).map((w: any) => w.soHieu);
  const unreadWarningsCount = allWarnings.filter((id: string) => !readWarnings.includes(id)).length;
  const allDeadDocs = [...(data?.vbTuChet || []), ...(data?.vbSapChet || [])].map((d: any) => d.docId);
  const unreadDeadDocsCount = allDeadDocs.filter(id => !readDeadDocs.includes(id)).length;
  const unreadEventsCount = Math.max(0, (data?.events?.length || 0) - readEvents.length);
  
  const uniqueObligationDocs = Array.from(new Set((data?.nghiaVu || []).map((n: any) => n.vb)));
  const unreadObligationsCount = Math.max(0, uniqueObligationDocs.length - (readObligations?.length || 0));

  const uniqueThresholdDocs = Array.from(new Set((data?.conSoChot || []).map((n: any) => n.vb)));
  const unreadThresholdsCount = Math.max(0, uniqueThresholdDocs.length - (readThresholds?.length || 0));

  const uniqueDeadlineDocs = Array.from(new Set((data?.hanChot || []).map((n: any) => n.vb)));
  const unreadDeadlinesCount = Math.max(0, uniqueDeadlineDocs.length - (readDeadlines?.length || 0));



  return (
    <aside className="sidebar" style={{ 
      width: '260px', background: 'var(--sidebar-bg)', 
      borderRadius: '24px', padding: '24px 0 0 0', display: 'flex', flexDirection: 'column', 
      height: 'calc(100vh - 32px)', position: 'sticky', top: '16px', zIndex: 20,
      border: '1px solid var(--sidebar-border)', color: 'var(--sidebar-text)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
    }}>
      <div className="sidebar-header" style={{ padding: '0 24px', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="logo" style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary-gradient)', borderRadius: '12px', boxShadow: '0 4px 10px rgba(79, 70, 229, 0.4)' }}>
          <img src="/dau-logo.png" alt="DAU" style={{ maxWidth: '65%', maxHeight: '65%', filter: 'brightness(0) invert(1)' }} />
        </div>
        <span style={{ fontWeight: 800, color: '#fff', fontSize: '18px', letterSpacing: '-0.02em', background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Core AI</span>
      </div>
      
      {/* Sidebar nav wrap */}
      <div style={{ position: 'relative', flex: 1, overflowY: 'auto' }}>

        <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 12px' }}>
          
          {role === 'admin' && (
            <>
              <div className="sidebar-section">
                Cảnh báo & Rà soát
              </div>
          <NavLink to="/priority" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <AlertTriangle size={18} />
              <span>Ưu tiên xử lý</span>
            </div>
            <Badge count={unreadWarningsCount} />
          </NavLink>
          <NavLink to="/dead-docs" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <FileX2 size={18} />
              <span>Văn bản khai tử</span>
            </div>
            <Badge count={Math.max(0, unreadDeadDocsCount)} />
          </NavLink>
          <NavLink to="/deadlines" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <CalendarClock size={18} />
              <span>Hạn chót & mốc</span>
            </div>
            <Badge count={unreadDeadlinesCount} />
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <PieChart size={18} />
            <span>Phân tích</span>
          </NavLink>
          <NavLink to="/events" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <History size={18} />
              <span>Sự kiện luật</span>
            </div>
            <Badge count={Math.max(0, unreadEventsCount)} />
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <ClipboardList size={18} />
              <span>Cần rà soát</span>
            </div>
            <Badge count={data?.pendingCount || 0} />
          </NavLink>
          <NavLink to="/topics" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <Layers size={18} />
            <span>Chủ đề văn bản</span>
          </NavLink>
          </>
          )}
          
          <div className="sidebar-section">
            Tra cứu & Dữ liệu
          </div>
          <NavLink to="/search" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <Search size={18} />
            <span>Tra cứu thủ công</span>
          </NavLink>
          <NavLink to="/chat" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <Bot size={18} />
            <span>Tra cứu AI (Chatbot)</span>
          </NavLink>
          <NavLink to="/obligations" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <CheckSquare size={18} />
              <span>Việc phải làm</span>
            </div>
            <Badge count={unreadObligationsCount} />
          </NavLink>
          <NavLink to="/thresholds" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <Book size={18} />
              <span>Sổ ngưỡng & định mức</span>
            </div>
            <Badge count={unreadThresholdsCount} />
          </NavLink>
          <NavLink to="/graph" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <Network size={18} />
            <span>Đồ thị ảnh hưởng</span>
          </NavLink>

          {role === 'admin' && (
          <>
          <div className="sidebar-section">
            Hệ thống
          </div>
          <NavLink to="/admin" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={{...navStyle, justifyContent: 'space-between'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px', width: '100%'}}>
              <Settings size={18} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                <span>Tải tài liệu (Admin)</span>
                {data.hasNewDocs && (
                  <div style={{
                    background: 'var(--red)', color: 'white', borderRadius: '50%',
                    width: '8px', height: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}></div>
                )}
              </div>
            </div>
            <Badge count={data?.adminCount || 0} />
          </NavLink>
          <NavLink to="/audit" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <History size={18} />
            <span>Nhật ký thao tác</span>
          </NavLink>
          <NavLink to="/rejected" className={({ isActive }) => `navtabs-a ${isActive ? 'active' : ''}`} style={navStyle}>
            <Trash2 size={18} />
            <span>Văn bản loại bỏ</span>
          </NavLink>
          </>
          )}
        </nav>
      </div>
      
      <div style={{ padding: '24px 20px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--sidebar-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
            {user?.email?.[0].toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.email}</div>
            <div style={{ fontSize: '12px', color: 'var(--sidebar-muted)' }}>{role === 'admin' ? 'Quản trị viên' : 'Giảng viên'}</div>
          </div>
        </div>
        <button 
          onClick={() => setIsLogoutModalOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#f87171', cursor: 'pointer', fontSize: '14px', fontWeight: 600, justifyContent: 'center', transition: '0.2s' }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        title="Xác nhận đăng xuất"
        message="Bạn có chắc chắn muốn đăng xuất khỏi hệ thống không?"
        confirmText="Đăng xuất"
        isDestructive={true}
        onConfirm={() => {
          setIsLogoutModalOpen(false);
          logout();
        }}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      <style>{`
        .navtabs-a {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          color: var(--sidebar-muted);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid transparent;
        }
        .navtabs-a:hover {
          background: var(--sidebar-hover);
          color: #fff;
        }
        .navtabs-a.active {
          background: var(--sidebar-active);
          color: #fff;
          box-shadow: var(--sidebar-active-glow);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .sidebar-section {
          padding: 24px 16px 8px;
          font-size: 11px;
          font-weight: 700;
          color: var(--sidebar-border);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>
    </aside>
  );
};

export default Sidebar;
