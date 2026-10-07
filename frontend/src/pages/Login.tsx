import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, token, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return <div className="flex h-screen w-screen items-center justify-center">Đang tải...</div>;
  }

  // If already logged in, redirect
  if (token) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axiosClient.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      const { access_token } = response.data;
      
      // Fetch user info to get role
      const userRes = await axiosClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      
      login(access_token, userRes.data);
      
      if (userRes.data.role === 'lecturer') {
        navigate('/search');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 1 phút.');
      } else {
        setError(err.response?.data?.detail || err.response?.data?.error || 'Sai email hoặc mật khẩu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#faf7f7', fontFamily: 'system-ui, sans-serif' }}>
      {/* Cột trái: Hình ảnh giới thiệu DAU */}
      <div style={{ 
        flex: 1, 
        background: 'linear-gradient(135deg, #7a0000 0%, #990000 100%)', 
        color: 'white', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '0 8%', 
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Abstract pattern */}
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', opacity: 0.05, transform: 'scale(1.5)' }}>
          <svg width="400" height="400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        
        <div style={{ zIndex: 10, maxWidth: '500px' }}>
          <div style={{ marginBottom: '24px', background: 'white', padding: '12px 20px', display: 'inline-block', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
             <span style={{ fontSize: '24px', fontWeight: 900, color: '#990000', letterSpacing: '-0.03em' }}>AI SECOND BRAIN</span>
          </div>
          <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '24px', lineHeight: 1.2 }}>Hệ thống Trợ lý pháp lý thông minh</h1>
          <p style={{ fontSize: '18px', color: '#f7d9d9', lineHeight: 1.6, fontWeight: 500 }}>
            Đại học Kiến trúc Đà Nẵng (DAU). Quản lý, bóc tách và tra cứu văn bản quy phạm pháp luật tự động bằng trí tuệ nhân tạo.
          </p>
        </div>
      </div>

      {/* Cột phải: Form đăng nhập */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
        <div style={{ width: '100%', maxWidth: '420px', background: 'white', padding: '48px', borderRadius: '20px', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0' }}>Đăng nhập</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Vui lòng đăng nhập để tiếp tục</p>
          </div>

          {error && (
            <div style={{ 
              marginBottom: '24px', 
              padding: '14px 16px', 
              background: '#fef2f2', 
              borderLeft: '4px solid #ef4444', 
              color: '#991b1b', 
              borderRadius: '6px', 
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Email đăng nhập</label>
              <input
                type="email"
                required
                style={{ 
                  width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', 
                  fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc'
                }}
                onFocus={(e) => e.target.style.borderColor = '#990000'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                placeholder="Ví dụ: admin@dau.edu.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Mật khẩu</label>
              <input
                type="password"
                required
                style={{ 
                  width: '100%', padding: '14px 16px', border: '1px solid #e2e8f0', borderRadius: '10px', 
                  fontSize: '15px', outline: 'none', transition: 'border-color 0.2s', background: '#f8fafc'
                }}
                onFocus={(e) => e.target.style.borderColor = '#990000'}
                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', padding: '16px', background: loading ? '#b91c1c' : '#990000', 
                color: 'white', fontWeight: 700, borderRadius: '10px', border: 'none', 
                fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '12px',
                transition: 'background 0.2s, transform 0.1s',
                boxShadow: '0 4px 12px rgba(153,0,0,0.2)'
              }}
              onMouseOver={(e) => { if(!loading) e.currentTarget.style.background = '#7a0000'; }}
              onMouseOut={(e) => { if(!loading) e.currentTarget.style.background = '#990000'; }}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
