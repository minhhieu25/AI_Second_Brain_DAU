import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import axiosClient from '../api/axiosClient';

const emptyData = {
  hasNewDocs: false,
  pendingCount: 0,
  soCanhBao: 0,
  soSuKien: 0,
  adminCount: 0,
  warnings: [],
  nghiaVu: [],
  conSoChot: [],
  hanChot: [],
  chuaHieuLuc: [],
  vbTuChet: [],
  vbSapChet: [],
  events: [],
  suKienHieuLuc: [],
  impact: [],
  coQuanVbBo: [],
  namVbBo: [],
  insights: {
    luotVien: 0,
    thayThe: 0,
    baiBo: 0,
    vbNhieuCanCu: 0,
    luotLuatMoi: 0,
    topCanCu: [],
    theoNam: [],
    tapTrung: { theoLoai: [], theoChuDe: [] },
    tinCay: { tb: 0, tong: 0, ocr: 0, duoi80: 0 },
    uuTien: []
  }
};

interface DataContextType {
  data: any;
  loading: boolean;
  error: string | null;
  refreshData: () => void;
  readDeadDocs: string[];
  readEvents: string[];
  readObligations: string[];
  readThresholds: string[];
  readDeadlines: string[];
  readWarnings: string[];
  markAsRead: (type: 'dead' | 'event' | 'obligation' | 'threshold' | 'deadline' | 'warning', id: string) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
  processingFiles: Record<string, boolean>;
  setProcessingFiles: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const DataContext = createContext<DataContextType>({
  data: emptyData,
  loading: false,
  error: null,
  refreshData: () => {},
  readDeadDocs: [],
  readEvents: [],
  readObligations: [],
  readThresholds: [],
  readDeadlines: [],
  readWarnings: [],
  markAsRead: () => {},
  isProcessing: false,
  setIsProcessing: () => {},
  processingFiles: {},
  setProcessingFiles: () => {},
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<any>(emptyData);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingFiles, setProcessingFiles] = useState<Record<string, boolean>>({});

  const [readDeadDocs, setReadDeadDocs] = useState<string[]>([]);
  const [readEvents, setReadEvents] = useState<string[]>([]);
  const [readObligations, setReadObligations] = useState<string[]>([]);
  const [readThresholds, setReadThresholds] = useState<string[]>([]);
  const [readDeadlines, setReadDeadlines] = useState<string[]>([]);
  const [readWarnings, setReadWarnings] = useState<string[]>([]);

  useEffect(() => {
    try {
      const storedDead = JSON.parse(localStorage.getItem('readDeadDocs') || '[]');
      const storedEvents = JSON.parse(localStorage.getItem('readEvents') || '[]');
      const storedObligations = JSON.parse(localStorage.getItem('readObligations') || '[]');
      const storedThresholds = JSON.parse(localStorage.getItem('readThresholds') || '[]');
      const storedDeadlines = JSON.parse(localStorage.getItem('readDeadlines') || '[]');
      const storedWarnings = JSON.parse(localStorage.getItem('readWarnings') || '[]');
      setReadDeadDocs(storedDead);
      setReadEvents(storedEvents);
      setReadObligations(storedObligations);
      setReadThresholds(storedThresholds);
      setReadDeadlines(storedDeadlines);
      setReadWarnings(storedWarnings);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const markAsRead = (type: 'dead' | 'event' | 'obligation' | 'threshold' | 'deadline' | 'warning', id: string) => {
    if (type === 'dead') {
      setReadDeadDocs(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readDeadDocs', JSON.stringify(next));
        return next;
      });
    } else if (type === 'event') {
      setReadEvents(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readEvents', JSON.stringify(next));
        return next;
      });
    } else if (type === 'obligation') {
      setReadObligations(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readObligations', JSON.stringify(next));
        return next;
      });
    } else if (type === 'threshold') {
      setReadThresholds(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readThresholds', JSON.stringify(next));
        return next;
      });
    } else if (type === 'deadline') {
      setReadDeadlines(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readDeadlines', JSON.stringify(next));
        return next;
      });
    } else if (type === 'warning') {
      setReadWarnings(prev => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id];
        localStorage.setItem('readWarnings', JSON.stringify(next));
        return next;
      });
    }
  };

  const fetchData = (isBackground = false) => {
    if (!isBackground) setLoading(true);
    Promise.all([
      axiosClient.get('/legal-data').then(res => res.data).catch(() => ({}) as any),
      axiosClient.get('/auditing/warnings').then(res => res.data).catch(() => ({}) as any),
      axiosClient.get('/analytics').then(res => res.data).catch(() => ({}) as any),
      axiosClient.get('/review/pending').then(res => res.data).catch(() => ({}) as any),
      axiosClient.get('/system/status').then(res => res.data).catch(() => ({}) as any)
    ])
      .then(([legalData, warningsData, analyticsData, reviewData, systemData]) => {
        
        const nghiaVuList = reviewData?.nghiaVu || [];
        const conSoChotList = reviewData?.conSoChot || [];
        const combinedReviewCount = nghiaVuList.length + conSoChotList.length;

        setData({
          ...emptyData,
          hasNewDocs: systemData?.has_new_docs || false,
          adminCount: systemData?.unprocessed_crawled_count || 0,
          pendingCount: combinedReviewCount,
          nghiaVu: legalData.nghiaVu || [],
          conSoChot: legalData.conSoChot || [],
          hanChot: legalData.hanChot || [],
          chuaHieuLuc: legalData.chuaHieuLuc || [],
          vbTuChet: legalData.vbTuChet || [],
          vbSapChet: legalData.vbSapChet || [],
          events: legalData.events || [],
          suKienHieuLuc: legalData.suKienHieuLuc || [],
          impact: legalData.impact || [],
          soCanhBao: (warningsData.warnings || []).length,
          soSuKien: (legalData.events || []).length,
          warnings: warningsData.warnings || [],
          insights: {
            ...emptyData.insights,
            ...(analyticsData.insights || {}),
            uuTien: warningsData.warnings || []
          }
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch legal data:', err);
        setError('Cannot connect to backend.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(); // Tải lần đầu
    
    // Mở kết nối SSE tới Backend
    const evtSource = new EventSource('/api/v1/system/stream');
    
    evtSource.onmessage = (event) => {
      if (event.data === 'update') {
        fetchData(true);
      } else if (event.data.startsWith('success:')) {
        const filename = event.data.substring(8);
        setProcessingFiles(prev => ({ ...prev, [filename]: false }));
        window.dispatchEvent(new CustomEvent('processing_success', { detail: filename }));
        fetchData(true);
      } else if (event.data.startsWith('error:')) {
        const msg = event.data.substring(6);
        const firstColon = msg.indexOf(':');
        const filename = firstColon > -1 ? msg.substring(0, firstColon) : msg;
        setProcessingFiles(prev => ({ ...prev, [filename]: false }));
        window.dispatchEvent(new CustomEvent('processing_error', { detail: msg }));
      }
    };
    
    evtSource.onerror = (err) => {
      console.error('SSE connection error:', err);
    };

    return () => {
      evtSource.close();
    };
  }, []);

  return (
    <DataContext.Provider value={{ data, loading, error, refreshData: fetchData, readDeadDocs, readEvents, readObligations, readThresholds, readDeadlines, readWarnings, markAsRead, isProcessing, setIsProcessing, processingFiles, setProcessingFiles }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);
