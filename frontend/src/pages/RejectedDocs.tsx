import React, { useState, useEffect } from 'react';
import { Trash2, RefreshCw, XCircle, Search, Filter } from 'lucide-react';
import ConfirmModal from '../components/shared/ConfirmModal';

interface RejectedDocument {
  id: number;
  soHieu: string;
  loai: string;
  ngayKy: string;
  chuDe: string[];
  status: string;
}

const RejectedDocs: React.FC = () => {
  const [documents, setDocuments] = useState<RejectedDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Reset page khi filter thay đổi - phải đặt trước mọi early return
  useEffect(() => { setPage(1); }, [searchTerm, domainFilter, startDate, endDate, sortOrder]);

  const fetchRejectedDocs = async () => {
    try {
      const response = await fetch('/api/v1/documents/rejected');
      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (error) {
      console.error("Lỗi khi tải văn bản bị loại:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRejectedDocs();
  }, []);

  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => { }
  });

  const handleReprocess = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Bóc tách lại',
      message: 'Bạn có chắc muốn đưa văn bản này về lại tab Tải tài liệu để bóc tách lại không?',
      isDestructive: false,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setProcessingId(id);
        try {
          const response = await fetch(`/api/v1/documents/${id}/reprocess`, {
            method: 'POST'
          });
          const result = await response.json();
          if (response.ok) {
            setDocuments(prev => prev.filter(doc => doc.id !== id));
            setMessage({ text: result.message, type: 'success' });
          } else {
            setMessage({ text: result.detail || 'Lỗi khi bóc tách lại', type: 'error' });
          }
        } catch (error) {
          setMessage({ text: 'Không thể kết nối đến máy chủ', type: 'error' });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  const handleHardDelete = (id: number) => {
    setConfirmState({
      isOpen: true,
      title: 'Xóa vĩnh viễn',
      message: 'CẢNH BÁO: Hành động này sẽ xóa vĩnh viễn văn bản khỏi cơ sở dữ liệu và ổ cứng. Bạn có chắc chắn không?',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        setProcessingId(id);
        try {
          const response = await fetch(`/api/v1/documents/${id}/hard_delete`, {
            method: 'DELETE'
          });
          const result = await response.json();
          if (response.ok) {
            setDocuments(prev => prev.filter(doc => doc.id !== id));
            setMessage({ text: result.message, type: 'success' });
          } else {
            setMessage({ text: result.detail || 'Lỗi khi xóa', type: 'error' });
          }
        } catch (error) {
          setMessage({ text: 'Không thể kết nối đến máy chủ', type: 'error' });
        } finally {
          setProcessingId(null);
        }
      }
    });
  };

  if (loading) {
    return (
      <section style={{ padding: '20px' }}>
        <div className="wrap">
          <h2>Thùng rác / Văn bản bị loại</h2>
          <p className="sub">Đang tải...</p>
        </div>
      </section>
    );
  }

  const filteredDocs = documents.filter(doc => {
    const matchSearch = doc.soHieu.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDomain = domainFilter === 'All' || doc.loai === domainFilter;

    let matchDate = true;
    if (startDate || endDate) {
      const parts = doc.ngayKy.split('/');
      if (parts.length === 3) {
        const docDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        if (startDate) {
          matchDate = matchDate && docDate >= new Date(startDate);
        }
        if (endDate) {
          matchDate = matchDate && docDate <= new Date(endDate);
        }
      }
    }
    return matchSearch && matchDomain && matchDate;
  }).sort((a, b) => {
    return sortOrder === 'newest' ? b.id - a.id : a.id - b.id;
  });

  const pagedDocs = filteredDocs.slice((page - 1) * limit, page * limit);
  const totalPages = Math.ceil(filteredDocs.length / limit) || 1;

  return (
    <section style={{ background: 'var(--soft)', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="wrap" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trash2 size={24} color="var(--red)" />
            Văn bản bị loại bỏ
          </h2>
          <p className="sub" style={{ color: 'var(--muted)', marginTop: '4px' }}>
            Nơi quản lý các văn bản đã bị từ chối toàn bộ nội dung. Bạn có thể xóa vĩnh viễn hoặc đưa chúng trở lại hàng chờ để bóc tách lại.
          </p>
        </div>

        {message && (
          <div style={{
            padding: '12px 16px',
            marginBottom: '20px',
            borderRadius: '8px',
            background: message.type === 'success' ? 'var(--green-50)' : 'var(--red-50)',
            color: message.type === 'success' ? 'var(--green)' : 'var(--red)',
            fontWeight: 600
          }}>
            {message.text}
          </div>
        )}

        {/* Bộ lọc */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px',
          padding: '16px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <Search size={18} color="var(--muted)" />
            <input
              type="text"
              placeholder="Tìm theo số hiệu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <Filter size={18} color="var(--muted)" />
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="All">Tất cả lĩnh vực</option>
              <option value="Giáo dục">Giáo dục</option>
              <option value="Tài chính">Tài chính</option>
              <option value="Pháp luật khung">Pháp luật khung</option>
              <option value="Khác">Khác</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '14px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '14px', cursor: 'pointer' }}
            >
              <option value="newest">Sắp xếp: Mới nhất</option>
              <option value="oldest">Sắp xếp: Cũ nhất</option>
            </select>
          </div>
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', background: 'var(--card-bg)', borderRadius: '12px' }}>
            <XCircle size={48} color="var(--muted)" style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p style={{ color: 'var(--muted)', fontWeight: 600 }}>Thùng rác đang trống.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Headers */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 2fr 1fr 1fr auto',
              gap: '16px',
              padding: '0 16px 8px 16px',
              fontWeight: 600,
              color: 'var(--muted)',
              borderBottom: '2px solid var(--border)',
              alignItems: 'center'
            }}>
              <span>STT</span>
              <span>Số hiệu / Tên văn bản</span>
              <span>Lĩnh vực</span>
              <span>Ngày ký</span>
              <span>Hành động</span>
            </div>

            {filteredDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontWeight: 500 }}>
                Không tìm thấy văn bản nào khớp với bộ lọc.
              </div>
            ) : (
              <>
                {pagedDocs.map((doc, idx) => (
              <div key={doc.id} style={{
                display: 'grid',
                gridTemplateColumns: '40px 2fr 1fr 1fr auto',
                gap: '16px',
                padding: '16px',
                background: 'var(--card-bg)',
                borderRadius: '8px',
                alignItems: 'center',
                border: '1px solid var(--border)',
              }}>
                <span style={{ fontWeight: 600, color: 'var(--muted)' }}>{idx + 1}</span>
                <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{doc.soHieu}</span>
                <span style={{ color: 'var(--muted)' }}>{doc.loai}</span>
                <span style={{ color: 'var(--muted)' }}>{doc.ngayKy}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleReprocess(doc.id)}
                    disabled={processingId === doc.id}
                    style={{
                      background: 'var(--blue-50)', color: 'var(--blue)', border: 'none',
                      padding: '8px 12px', borderRadius: '6px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px', cursor: processingId === doc.id ? 'wait' : 'pointer'
                    }}
                  >
                    <RefreshCw size={16} /> Bóc tách lại
                  </button>
                  <button
                    onClick={() => handleHardDelete(doc.id)}
                    disabled={processingId === doc.id}
                    style={{
                      background: 'var(--red-50)', color: 'var(--red)', border: 'none',
                      padding: '8px 12px', borderRadius: '6px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px', cursor: processingId === doc.id ? 'wait' : 'pointer'
                    }}
                  >
                    <Trash2 size={16} /> Xóa vĩnh viễn
                  </button>
                </div>
              </div>
                ))}

                {filteredDocs.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '8px 16px', background: page === 1 ? '#e0e0e0' : 'var(--blue)', color: page === 1 ? '#888' : '#fff', border: 'none', borderRadius: '8px', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Trang trước</button>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Trang {page} / {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} style={{ padding: '8px 16px', background: page >= totalPages ? '#e0e0e0' : 'var(--blue)', color: page >= totalPages ? '#888' : '#fff', border: 'none', borderRadius: '8px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}>Trang sau</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        isDestructive={confirmState.isDestructive}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </section>
  );
};

export default RejectedDocs;
