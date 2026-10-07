import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';
import toast from 'react-hot-toast';

interface DocumentCardProps {
  id: string;
  title: string;
  type: string;
  date: string;
  status: 'success' | 'warning' | 'danger';
  statusLabel: string;
  hasReport?: boolean;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ 
  id, title, type, date, status, statusLabel, hasReport 
}) => {
  const navigate = useNavigate();

  return (
    <div className="card document-card" onClick={() => navigate(`/compare/${id}`)}>
      <div className="doc-header">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <StatusBadge status={status} label={statusLabel} />
          {hasReport && <StatusBadge status="warning" label="Cần Báo Cáo" />}
        </div>
        <button 
          className="btn btn-outline" 
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderColor: 'var(--dau-border)', color: 'var(--dau-gray)' }}
          title="Xem file gốc"
          onClick={(e) => { 
            e.stopPropagation(); 
            const token = localStorage.getItem('token') || '';
            window.open(`/api/v1/documents/${id}/pdf?token=${token}`, '_blank');
          }}
        >
          <ExternalLink size={14} /> Xem gốc
        </button>
      </div>
      <h3 className="doc-title">{title}</h3>
      <div className="doc-meta">
        <span>{type}</span>
        <span>{date}</span>
      </div>
    </div>
  );
};

export default DocumentCard;
