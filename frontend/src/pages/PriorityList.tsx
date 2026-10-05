import React from 'react';
import { useData } from '../context/DataContext';
import { useDetail } from '../context/DetailContext';
import Skeleton from '../components/shared/Skeleton';

const PriorityList: React.FC = () => {
  const { openDetail } = useDetail();
  const { data, loading, refreshData, markAsRead, readWarnings } = useData();
  const rows = [...(data.insights?.uuTien || [])].sort((a: any, b: any) => {
    const aUnread = !readWarnings.includes(a.soHieu);
    const bUnread = !readWarnings.includes(b.soHieu);
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;
    return 0;
  });

  const handleViewWarning = async (soHieu: string) => {
    markAsRead('warning', soHieu);
    openDetail(soHieu);
    try {
      await fetch(`http://localhost:8000/api/v1/auditing/warnings/${encodeURIComponent(soHieu)}/resolve`, {
        method: 'POST'
      });
      refreshData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <section id="uu-tien" className="fade-in">
      <div className="wrap">
        <h2>Ưu tiên xử lý trước</h2>
        <p className="sub">
          Xếp theo mức độ: văn bản có căn cứ <b>bị bãi bỏ</b> và dính <b>nhiều căn cứ hỏng</b> lên đầu. Bấm để xem chi tiết.
        </p>
        <div id="priority" className="rlist">
          <div className="prow phead" style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 1fr', textTransform: 'uppercase', fontSize: '11px', color: 'var(--muted)', fontWeight: 700, paddingBottom: '12px', borderBottom: '1px solid var(--line)', marginBottom: '8px' }}>
            <span>#</span>
            <span>Văn bản</span>
            <span>Loại</span>
            <span>Căn cứ hỏng</span>
            <span>Mức độ</span>
          </div>
          {loading ? (
            <>
              <div className="prow"><Skeleton width="100%" height="24px" /></div>
              <div className="prow"><Skeleton width="100%" height="24px" /></div>
              <div className="prow"><Skeleton width="100%" height="24px" /></div>
              <div className="prow"><Skeleton width="100%" height="24px" /></div>
            </>
          ) : rows.length === 0 ? (
            <div style={{ padding: '60px 40px', textAlign: 'center', backgroundColor: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--line)', marginTop: '20px' }}>
              <h3 style={{ color: 'var(--green)', fontSize: '20px', marginBottom: '8px' }}>Mọi thứ đang ổn định</h3>
              <p className="sub">Hiện tại không có văn bản nào cần ưu tiên rà soát do xung đột căn cứ.</p>
            </div>
          ) : (
            rows.map((r: any, i: number) => {
              const lvl = r.baiBo ? (
                <span className="lv lv-hi" style={{ padding: '4px 10px', border: '1px solid #ffd0d0', color: 'var(--red)', background: '#fff0f0', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>Ưu tiên cao</span>
              ) : (
                <span className="lv lv-md" style={{ padding: '4px 10px', border: '1px solid #ffe4b5', color: 'var(--amber)', background: '#fffdf5', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>Cần rà</span>
              );
              const isUnread = !readWarnings.includes(r.soHieu);
              return (
                <div
                  key={r.docId}
                  className={`prow ${isUnread ? 'unread-item' : ''}`}
                  style={{ display: 'grid', gridTemplateColumns: '40px 3fr 2fr 1fr 1fr', alignItems: 'center', padding: '12px 8px', borderBottom: '1px solid var(--soft)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--soft)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  data-did={r.docId}
                  onClick={() => handleViewWarning(r.soHieu)}
                >
                  <span className="pk" style={{ color: 'var(--red)', fontWeight: 700 }}>{i + 1}</span>
                  <span className="pd" style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.soHieu}</span>
                  <span className="pl" style={{ color: 'var(--muted)' }}>{r.loai || ''}</span>
                  <span className="pn" style={{ color: 'var(--red)', fontWeight: 700 }}>{r.n}</span>
                  <span>{lvl}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
};

export default PriorityList;
