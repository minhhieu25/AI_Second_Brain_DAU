import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import toast from 'react-hot-toast';

interface CitationBadgeProps {
  documentId: string;
  sourceText: string;
  pageNumber?: number;
}

const CitationBadge: React.FC<CitationBadgeProps> = ({ documentId, sourceText, pageNumber }) => {
  const handlePdfClick = (e: React.MouseEvent) => {
    if (pageNumber) {
      e.preventDefault();
      const token = localStorage.getItem('token') || '';
      const pageHash = pageNumber ? `#page=${pageNumber}` : '';
      window.open(`/api/v1/documents/${documentId}/pdf?token=${token}${pageHash}`, '_blank');
    }
  };

  return (
    <Link to={`/compare/${documentId}`} className="citation-badge" onClick={handlePdfClick}>
      <FileText size={14} />
      <span>{sourceText}</span>
    </Link>
  );
};

export default CitationBadge;
