import React, { useState, useEffect, useMemo } from 'react';
import { History, Clock, User, CheckCircle, Edit, ArrowRight, XCircle, Search, Filter, Calendar } from 'lucide-react';

interface AuditLog {
  id: number;
  item_type: string;
  item_id: number;
  vb: string | null;
  dieu: string | null;
  original_text: string | null;
  original_summary: string;
  edited_summary: string | null;
  action: string;
  author: string;
  timestamp: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); // All, Duyệt giữ nguyên, Sửa & duyệt, Từ chối duyệt
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD format
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/v1/audit/logs');
        const data = await response.json();
        setLogs(data.logs || []);
      } catch (error) {
        console.error("Lỗi khi tải lịch sử:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('vi-VN', { 
      day: '2-digit', month: '2-digit', year: 'numeric', 
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }).format(date);
  };

  // Filter logs logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Search Query filter
      const searchMatch = !searchQuery || 
        (log.vb?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.dieu?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.original_text?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (log.original_summary?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        
      // 2. Type Filter
      const typeMatch = typeFilter === 'All' || log.action === typeFilter;
      
      // 3. Date Filter
      let dateMatch = true;
      if (dateFilter) {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        dateMatch = logDate === dateFilter;
      }
      
      return searchMatch && typeMatch && dateMatch;
    });
  }, [logs, searchQuery, typeFilter, dateFilter]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, typeFilter, dateFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <section id="audit-logs" style={{ paddingBottom: '60px' }}>
        <div className="wrap">
          <h2 style={{ fontSize: '28px', color: 'var(--blue)', marginBottom: '8px' }}>Nhật ký Hệ thống</h2>
          <p className="sub">Đang tải lịch sử thao tác...</p>
        </div>
      </section>
    );
  }

  return (
    <section id="audit-logs" style={{ paddingBottom: '60px' }}>
      <div className="wrap">
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '28px', color: 'var(--blue)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <History size={28} /> Nhật ký Hệ thống (Audit Logs)
          </h2>
          <p className="sub" style={{ margin: 0, fontSize: '15px' }}>
            Lưu vết toàn bộ thao tác duyệt, từ chối và chỉnh sửa văn bản của người dùng trên hệ thống.
          </p>
        </div>

        {/* --- KHU VỰC BỘ LỌC --- */}
        <div style={{ 
          display: 'flex', gap: '15px', marginBottom: '24px', flexWrap: 'wrap',
          background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--line)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          {/* Tìm kiếm */}
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', background: 'var(--soft)' }}>
            <Search size={18} color="var(--muted)" />
            <input 
              type="text" 
              placeholder="Tìm theo văn bản, điều, nội dung..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px', width: '100%', fontSize: '14px' }}
            />
          </div>
          
          {/* Lọc loại thao tác */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', background: 'var(--soft)' }}>
            <Filter size={18} color="var(--muted)" />
            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 0', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="All">Tất cả thao tác</option>
              <option value="Duyệt giữ nguyên">Duyệt giữ nguyên</option>
              <option value="Sửa & duyệt">Sửa & duyệt</option>
              <option value="Từ chối duyệt">Từ chối duyệt</option>
            </select>
          </div>

          {/* Lọc ngày */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', background: 'var(--soft)' }}>
            <Calendar size={18} color="var(--muted)" />
            <input 
              type="date" 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 0', fontSize: '14px', cursor: 'pointer', color: 'var(--ink)' }}
            />
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '16px', border: '1px dashed var(--line)' }}>
            <h3 style={{ color: 'var(--muted)', fontSize: '20px', marginBottom: '8px' }}>Không tìm thấy thao tác nào</h3>
            <p className="sub">Hãy thử thay đổi điều kiện lọc hoặc tìm kiếm.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {paginatedLogs.map((log) => {
              const isEdited = log.action === 'Sửa & duyệt';
              const isRejected = log.action === 'Từ chối duyệt';
              
              let borderColor = 'var(--green)';
              let bgColor = 'var(--green)';
              let textColor = 'white';
              let icon = <CheckCircle size={14}/>;
              
              if (isEdited) {
                borderColor = 'var(--amber)';
                bgColor = 'var(--amber-bg)';
                textColor = 'var(--amber)';
                icon = <Edit size={14}/>;
              } else if (isRejected) {
                borderColor = 'var(--red)';
                bgColor = 'var(--red-bg)';
                textColor = 'var(--red)';
                icon = <XCircle size={14}/>;
              }

              return (
                <div key={log.id} style={{ 
                  background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--line)', 
                  padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  borderLeft: `4px solid ${borderColor}`
                }}>
                  {/* HEADER LOG */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        background: bgColor, 
                        color: textColor,
                        padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}>
                        {icon}
                        {log.action}
                      </div>
                      <span className="badge" style={{ background: 'var(--soft)', color: 'var(--ink)', fontSize: '12px' }}>
                        {log.item_type === 'nghiaVu' ? '📚 Nghĩa vụ' : '🎯 Con số chốt'} (ID: {log.item_id})
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--muted)', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={14} /> <b>{log.author}</b>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> {formatDate(log.timestamp)}
                      </div>
                    </div>
                  </div>

                  {/* THÔNG TIN VĂN BẢN */}
                  <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--soft)', borderRadius: '8px', borderLeft: '3px solid var(--blue)' }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)' }}>
                      📄 {log.vb || 'Không rõ tên văn bản'}
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '4px' }}>
                      🔖 {log.dieu || 'Không rõ điều khoản'}
                    </div>
                  </div>

                  {/* CHI TIẾT NỘI DUNG */}
                  <div style={{ display: 'grid', gridTemplateColumns: isEdited ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                    
                    {/* Bản gốc (Original text) */}
                    <div style={{ background: '#fafafa', padding: '16px', borderRadius: '8px', border: '1px solid var(--line)', height: '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
                        Bản gốc (Văn bản)
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                        {log.original_text || 'Không có dữ liệu gốc...'}
                      </div>
                    </div>

                    {/* Bản Tóm tắt AI */}
                    <div style={{ background: '#f0f7ff', padding: '16px', borderRadius: '8px', border: '1px solid #d6e8ff', height: '100%' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)', marginBottom: '8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                        Bản tóm tắt (AI)
                        {isEdited && <ArrowRight size={14} />}
                      </div>
                      <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
                        {log.original_summary}
                      </div>
                    </div>
                    
                    {/* Bản Chỉnh sửa Người dùng (nếu có) */}
                    {isEdited && (
                      <div style={{ background: 'var(--amber-bg)', padding: '16px', borderRadius: '8px', border: '1px solid #ffe58f', height: '100%' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--amber)', marginBottom: '8px', textTransform: 'uppercase' }}>
                          Bản chỉnh sửa (Người dùng)
                        </div>
                        <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--ink)' }}>
                          {log.edited_summary}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                <button 
                  className="btn"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: currentPage === 1 ? 'var(--soft)' : '#fff',
                    color: currentPage === 1 ? 'var(--muted)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  Trang trước
                </button>
                <span style={{ fontSize: '14px', color: 'var(--muted)', fontWeight: 600 }}>
                  Trang {currentPage} / {totalPages}
                </span>
                <button 
                  className="btn"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: currentPage === totalPages ? 'var(--soft)' : '#fff',
                    color: currentPage === totalPages ? 'var(--muted)' : 'var(--ink)',
                    border: '1px solid var(--line)',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  Trang sau
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default AuditLogs;
