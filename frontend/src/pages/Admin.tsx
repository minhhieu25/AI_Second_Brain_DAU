import React, { useState, useRef, useEffect, useMemo } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, FileSearch, PlayCircle, Search, Filter, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import ConfirmModal from '../components/shared/ConfirmModal';

const Admin: React.FC = () => {
  const { data, refreshData, setIsProcessing, processingFiles, setProcessingFiles } = useData();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error' | 'crawling'>('idle');
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [crawledFiles, setCrawledFiles] = useState<{filename: string, domain: string}[]>([]);
  // Đã đưa processingFiles vào DataContext
  const [isPinging, setIsPinging] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('All');
  const isAnyFileProcessing = Object.values(processingFiles).some(isProcessing => isProcessing) || status === 'uploading';
  
  const filteredCrawledFiles = useMemo(() => {
    return crawledFiles.filter(f => {
      const matchSearch = f.filename.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDomain = domainFilter === 'All' || f.domain === domainFilter;
      return matchSearch && matchDomain;
    });
  }, [crawledFiles, searchQuery, domainFilter]);
  
  const uniqueDomains = useMemo(() => {
    const domains = new Set(crawledFiles.map(f => f.domain));
    return Array.from(domains);
  }, [crawledFiles]);

  const handlePing = async () => {
    setIsPinging(true);
    try {
      const response = await fetch('/api/v1/system/ping', { method: 'POST' });
      const data = await response.json();
      if (data.has_new_docs) {
        setStatus('success');
        setMessage(`Đã phát hiện văn bản mới trên chinhphu.vn! (Quét ${data.scanned} VB, bỏ qua ${data.skipped} VB đã xử lý)`);
        refreshData();
      } else {
        setStatus('success');
        setMessage(`Không có văn bản mới nào vào lúc này. Đã quét ${data.scanned} VB và bỏ qua ${data.skipped} VB đã xử lý từ trước.`);
      }
    } catch (e) {
      setStatus('error');
      setMessage('Lỗi khi rà soát văn bản mới.');
    } finally {
      setIsPinging(false);
    }
  };

  useEffect(() => {
    fetchCrawledFiles();
  }, []);

  const fetchCrawledFiles = async () => {
    try {
      const response = await fetch('/api/v1/system/crawled_files');
      const result = await response.json();
      setCrawledFiles(result.unprocessed_files || []);
    } catch (error) {
      console.error("Lỗi khi fetch danh sách file cào:", error);
    }
  };

  useEffect(() => {
    const onSuccess = (e: any) => {
      const filename = e.detail;
      // Đã set processingFiles ở DataContext
      setCrawledFiles(prev => prev.filter(f => f.filename !== filename));
      setStatus('success');
      setMessage(`Xử lý thành công: ${filename}`);
      refreshData();
    };
    const onError = (e: any) => {
      const msg = e.detail;
      const firstColon = msg.indexOf(':');
      const filename = firstColon > -1 ? msg.substring(0, firstColon) : msg;
      const errText = firstColon > -1 ? msg.substring(firstColon + 1) : "Lỗi không xác định";
      
      // Đã set processingFiles ở DataContext
      setStatus('error');
      setMessage(`Lỗi xử lý ${filename}: ${errText}`);
    };
    
    window.addEventListener('processing_success', onSuccess);
    window.addEventListener('processing_error', onError);
    
    return () => {
      window.removeEventListener('processing_success', onSuccess);
      window.removeEventListener('processing_error', onError);
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      setStatus('error');
      setMessage('Vui lòng chọn file định dạng PDF.');
      return;
    }
    setFile(selectedFile);
    setStatus('idle');
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setStatus('uploading');
    setMessage('Đang đưa văn bản vào hàng đợi xử lý bằng AI... Bạn có thể tiếp tục công việc.');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('/api/v1/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Xử lý thành công!');
        setFile(null); // Clear file sau khi xong
      } else {
        setStatus('error');
        setMessage(data.detail || 'Lỗi khi xử lý file.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Không thể kết nối đến máy chủ.');
      console.error(error);
    }
  };

  const handleCrawl = async () => {
    setIsProcessing(true);
    setStatus('crawling');
    setMessage('Đang kết nối Chinhphu.vn và tải văn bản về...');
    try {
      const response = await fetch('/api/v1/system/crawl', { method: 'POST' });
      if (response.ok) {
        setStatus('success');
        setMessage('Đã cào xong văn bản mới! Vui lòng kiểm tra danh sách bên dưới để bắt đầu xử lý.');
        refreshData(); // To hide the hasNewDocs banner since API clears it
        fetchCrawledFiles(); // Tải lại danh sách
      } else {
        setStatus('error');
        setMessage('Lỗi khi cào dữ liệu.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Lỗi khi gọi API đồng bộ.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessCrawled = async (filename: string) => {
    setProcessingFiles(prev => ({ ...prev, [filename]: true }));
    setStatus('processing');
    setMessage(`Đang đưa ${filename} vào hàng đợi xử lý bằng AI... Bạn có thể tiếp tục công việc.`);
    try {
      const response = await fetch('/api/v1/documents/process_crawled', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const result = await response.json();
      if (response.ok) {
        setStatus('success');
        setMessage(result.message || `Đã đưa ${filename} vào hàng đợi xử lý ngầm. Vui lòng đợi trong giây lát...`);
      } else {
        setStatus('error');
        setMessage(`Lỗi khi đưa ${filename} vào hàng đợi: ${result.detail}`);
        setProcessingFiles(prev => ({ ...prev, [filename]: false }));
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Không thể kết nối đến máy chủ để xử lý ${filename}`);
      setProcessingFiles(prev => ({ ...prev, [filename]: false }));
    }
  };

  const [confirmDeleteState, setConfirmDeleteState] = useState({
    isOpen: false,
    filename: '',
  });

  const handleDeleteCrawled = (filename: string) => {
    setConfirmDeleteState({ isOpen: true, filename });
  };

  const confirmDelete = async () => {
    const { filename } = confirmDeleteState;
    setConfirmDeleteState({ isOpen: false, filename: '' });
    
    setProcessingFiles(prev => ({ ...prev, [filename]: true }));
    try {
      const response = await fetch(`/api/v1/documents/crawled/${encodeURIComponent(filename)}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (response.ok) {
        setCrawledFiles(prev => prev.filter(f => f.filename !== filename));
        setStatus('success');
        setMessage(`Xoá thành công: ${filename}`);
      } else {
        setStatus('error');
        setMessage(`Lỗi khi xoá ${filename}: ${data.detail}`);
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Không thể kết nối đến máy chủ để xoá ${filename}`);
    } finally {
      setProcessingFiles(prev => ({ ...prev, [filename]: false }));
    }
  };

  return (
    <section id="admin-upload" style={{ background: 'var(--soft)', minHeight: '100vh', paddingBottom: '40px' }}>
      <div className="wrap" style={{ margin: '0 auto', paddingTop: '32px' }}>
        
        {/* Nút Rà soát văn bản mới (Ping) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handlePing} 
            disabled={isPinging}
            style={{
              background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', padding: '10px 20px', 
              borderRadius: '8px', fontWeight: 600, cursor: isPinging ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
            {isPinging ? <RefreshCw size={18} className="spin" /> : <FileSearch size={18} />}
            {isPinging ? 'Đang rà soát...' : 'Rà soát văn bản mới'}
          </button>
        </div>

        {/* Banner phát hiện văn bản mới */}
        {data.hasNewDocs && (
          <div style={{
            background: 'linear-gradient(90deg, #fffbe6, #fff)', border: '1px solid #ffe58f',
            padding: '24px', borderRadius: '16px', marginBottom: '24px',
            boxShadow: '0 4px 12px rgba(250, 173, 20, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <h3 style={{ color: 'var(--amber)', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={20} /> Phát hiện văn bản mới trên Chinhphu.vn!
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--muted)' }}>
                Hệ thống phát hiện có văn bản pháp luật mới vừa được ban hành. Bấm Đồng bộ để tải các văn bản này về máy chủ (Quá trình có thể mất vài giây).
              </p>
            </div>
            <button className="btn" onClick={handleCrawl} disabled={status === 'crawling'} style={{
              background: 'var(--amber)', color: '#fff', border: 'none', padding: '10px 20px', 
              borderRadius: '8px', fontWeight: 600, cursor: status === 'crawling' ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              {status === 'crawling' ? <RefreshCw size={16} className="spin" /> : null}
              {status === 'crawling' ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
          </div>
        )}

        {/* Global Status Message */}
        {status !== 'idle' && (
          <div style={{ 
            marginBottom: '24px',
            padding: '16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: status === 'error' ? 'var(--red-50)' : status === 'success' ? 'var(--green-50)' : 'var(--amber-50)',
            color: status === 'error' ? 'var(--red)' : status === 'success' ? 'var(--green)' : 'var(--amber)',
            border: `1px solid ${status === 'error' ? 'var(--red-200)' : status === 'success' ? 'var(--green-200)' : 'var(--amber-200)'}`
          }}>
            {status === 'error' && <AlertCircle size={20} />}
            {status === 'success' && <CheckCircle2 size={20} />}
            {(status === 'uploading' || status === 'crawling') && <div className="spinner" style={{ width: '20px', height: '20px', borderTopColor: 'currentColor', borderRightColor: 'currentColor', borderRadius: '50%', border: '2px solid transparent' }}></div>}
            
            <span style={{ fontWeight: 500, fontSize: '14px' }}>{message}</span>
          </div>
        )}

        {/* Khu vực file cào tự động chờ xử lý */}
        {crawledFiles.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <FileSearch size={28} /> Văn bản chờ bóc tách ({crawledFiles.length})
            </h2>
            
            <div style={{ 
              display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap',
              background: 'var(--surface)', padding: '16px', borderRadius: '12px', border: '1px solid var(--amber-200)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
            }}>
              <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', background: 'var(--soft)' }}>
                <Search size={18} color="var(--muted)" />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên văn bản..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px', width: '100%', fontSize: '14px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--line)', borderRadius: '8px', padding: '0 12px', background: 'var(--soft)' }}>
                <Filter size={18} color="var(--muted)" />
                <select 
                  value={domainFilter} 
                  onChange={(e) => setDomainFilter(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', padding: '10px 0', fontSize: '14px', cursor: 'pointer' }}
                >
                  <option value="All">Tất cả nguồn</option>
                  {uniqueDomains.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
              {filteredCrawledFiles.map((fileObj) => (
                <div key={fileObj.filename} style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1px solid var(--amber-200)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--surface)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
                  transition: 'transform 0.2s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ padding: '10px', background: 'var(--amber-50)', borderRadius: '10px', color: 'var(--amber)' }}>
                      <FileText size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '6px', fontSize: '15px' }}>{fileObj.filename}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                        <span style={{ padding: '3px 10px', background: '#e0e7ff', color: '#4338ca', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>{fileObj.domain}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleProcessCrawled(fileObj.filename)}
                      disabled={isAnyFileProcessing || processingFiles[fileObj.filename]}
                      style={{
                        background: 'var(--blue)', color: 'white', border: 'none', padding: '10px 16px',
                        borderRadius: '8px', fontWeight: 600, fontSize: '14px', cursor: (isAnyFileProcessing || processingFiles[fileObj.filename]) ? 'not-allowed' : 'pointer',
                        opacity: (isAnyFileProcessing || processingFiles[fileObj.filename]) ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '8px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {processingFiles[fileObj.filename] ? <RefreshCw size={16} className="spin" /> : <PlayCircle size={16} />}
                      {processingFiles[fileObj.filename] ? 'Đang bóc tách...' : 'Bắt đầu xử lý'}
                    </button>
                    
                    <button
                      className="btn"
                      onClick={() => handleDeleteCrawled(fileObj.filename)}
                      disabled={isAnyFileProcessing || processingFiles[fileObj.filename]}
                      title="Xoá file"
                      style={{
                        background: '#fee2e2', color: '#ef4444', border: '1px solid #f87171', padding: '10px',
                        borderRadius: '8px', cursor: (isAnyFileProcessing || processingFiles[fileObj.filename]) ? 'not-allowed' : 'pointer',
                        opacity: (isAnyFileProcessing || processingFiles[fileObj.filename]) ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {filteredCrawledFiles.length === 0 && (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--muted)', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--amber-200)' }}>
                  Không tìm thấy văn bản phù hợp với bộ lọc.
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Khu vực Upload thủ công */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)' }}>Tải tài liệu thủ công</h2>
          <p className="sub" style={{ color: 'var(--muted)', marginTop: '4px' }}>
            Tải file PDF từ máy tính của bạn &rarr; Chạy OCR &rarr; Gọi AI bóc tách &rarr; Đẩy vào hàng đợi duyệt.
          </p>
        </div>

        <div 
          style={{
            background: 'var(--card-bg)',
            border: `2px dashed ${dragActive ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: '16px',
            padding: '40px',
            textAlign: 'center',
            transition: 'all 0.2s',
            cursor: isAnyFileProcessing ? 'not-allowed' : 'pointer',
            boxShadow: dragActive ? '0 0 0 4px var(--blue-50)' : 'none',
            opacity: isAnyFileProcessing ? 0.5 : 1,
            pointerEvents: isAnyFileProcessing ? 'none' : 'auto'
          }}
          onDragEnter={!isAnyFileProcessing ? handleDrag : undefined}
          onDragLeave={!isAnyFileProcessing ? handleDrag : undefined}
          onDragOver={!isAnyFileProcessing ? handleDrag : undefined}
          onDrop={!isAnyFileProcessing ? handleDrop : undefined}
          onClick={() => { if (!isAnyFileProcessing) inputRef.current?.click(); }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple={false}
            onChange={handleChange}
            style={{ display: 'none' }}
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: dragActive ? 'var(--blue-50)' : 'var(--app-bg)',
              padding: '20px',
              borderRadius: '50%',
              color: dragActive ? 'var(--blue)' : 'var(--muted)',
              transition: 'all 0.2s'
            }}>
              <UploadCloud size={48} />
            </div>
            
            <div>
              <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)' }}>
                Kéo thả file PDF vào đây
              </p>
              <p style={{ fontSize: '14px', color: 'var(--muted)', marginTop: '8px' }}>
                hoặc click để chọn file từ máy tính của bạn (tối đa 50MB)
              </p>
              {isAnyFileProcessing && (
                <p style={{ fontSize: '14px', color: 'var(--amber)', fontWeight: 600, marginTop: '12px' }}>
                  (Hệ thống đang bận xử lý một văn bản, vui lòng đợi...)
                </p>
              )}
            </div>
          </div>
        </div>

        {file && (
          <div style={{ 
            marginTop: '24px',
            background: 'var(--card-bg)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ background: 'var(--blue-50)', padding: '12px', borderRadius: '8px', color: 'var(--blue)' }}>
                <FileText size={24} />
              </div>
              <div>
                <p style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '15px' }}>{file.name}</p>
                <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '4px' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            
            <button 
              className="btn btn-primary"
              onClick={handleUpload}
              disabled={status === 'uploading'}
              style={{
                background: 'var(--blue)',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
                opacity: status === 'uploading' ? 0.7 : 1
              }}
            >
              {status === 'uploading' ? 'Đang xử lý...' : 'Bắt đầu Xử lý'}
            </button>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDeleteState.isOpen}
        title="Xác nhận xoá file"
        message={`Bạn có chắc chắn muốn xoá file "${confirmDeleteState.filename}" không? Hành động này không thể hoàn tác.`}
        confirmText="Xoá"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteState({ isOpen: false, filename: '' })}
      />
    </section>
  );
};

export default Admin;
