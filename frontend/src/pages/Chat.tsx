import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, FileText, Loader, History, Plus } from 'lucide-react';
import { useDetail } from '../context/DetailContext';
import axiosClient from '../api/axiosClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
}

interface ChatSession {
  id: number;
  title: string;
  updated_at: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Xin chào! Tôi là Trợ lý AI của DAU Second Brain. Bạn có thể hỏi tôi bất kỳ thông tin nào về các Thông tư, Quy chế đã được duyệt (Published). Ví dụ: "Chuẩn chương trình đào tạo quy định thế nào?"'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { openDetail } = useDetail();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const loadSessions = async () => {
    try {
      const res = await axiosClient.get('/chat/sessions');
      setSessions(res.data.sessions);
    } catch (e) {
      console.error("Lỗi tải danh sách session:", e);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Xin chào! Tôi là Trợ lý AI của DAU Second Brain. Bạn có thể hỏi tôi bất kỳ thông tin nào về các Thông tư, Quy chế đã được duyệt (Published). Ví dụ: "Chuẩn chương trình đào tạo quy định thế nào?"'
      }
    ]);
    setShowHistory(false);
  };

  const loadSessionHistory = async (sessionId: number) => {
    try {
      setIsLoading(true);
      const res = await axiosClient.get(`/chat/sessions/${sessionId}`);
      const historyMsgs = res.data.messages.map((m: any) => ({
        id: m.id.toString(),
        role: m.role,
        content: m.content,
        citations: m.citations
      }));
      setMessages(historyMsgs);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
    } catch (e) {
      console.error("Lỗi tải tin nhắn cũ:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      const payload: any = { query: userMessage.content };
      if (currentSessionId) {
        payload.session_id = currentSessionId;
      }

      const response = await axiosClient.post('/chat', payload);
      const data = response.data;
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        citations: data.citations
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      if (!currentSessionId && data.session_id) {
        setCurrentSessionId(data.session_id);
        loadSessions();
      }
    } catch (error) {
      console.error("Lỗi khi chat:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Xin lỗi, đã có lỗi kết nối đến máy chủ. Vui lòng kiểm tra lại đăng nhập hoặc mạng."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section id="tra-cuu-ai" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', padding: '20px', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Tra cứu AI (RAG Chatbot)</h2>
          <p className="sub">Hỏi đáp dựa trên CSDL Vector. Lịch sử được lưu riêng theo từng tài khoản.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn" onClick={startNewChat} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--blue)', color: 'white', borderRadius: '8px' }}>
            <Plus size={16} /> Đoạn chat mới
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn" onClick={() => setShowHistory(!showHistory)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px' }}>
              <History size={16} /> Lịch sử chat
            </button>
            
            {showHistory && (
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', width: '300px', background: 'white', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 10, maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>Lịch sử trò chuyện</div>
                {sessions.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)' }}>Chưa có đoạn chat nào.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {sessions.map(s => (
                      <div key={s.id} onClick={() => loadSessionHistory(s.id)} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px' }} className="hover-bg-gray">
                        <span style={{ fontSize: '14px', fontWeight: currentSessionId === s.id ? 600 : 400, color: currentSessionId === s.id ? 'var(--blue)' : 'var(--text)' }}>
                          {s.title}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{new Date(s.updated_at).toLocaleString('vi-VN')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, backgroundColor: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Chat History */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ display: 'flex', gap: '16px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                backgroundColor: msg.role === 'user' ? 'var(--blue)' : 'var(--amber-bg)',
                color: msg.role === 'user' ? 'white' : 'var(--amber)'
              }}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ 
                  padding: '12px 16px', borderRadius: '16px',
                  backgroundColor: msg.role === 'user' ? 'var(--blue)' : '#f8fafc',
                  color: msg.role === 'user' ? 'white' : 'var(--text)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  lineHeight: '1.6', fontSize: '15px'
                }}>
                  {msg.content}
                </div>
                
                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', alignSelf: 'center' }}>Nguồn:</span>
                    {msg.citations.map((cit, idx) => (
                      <span 
                        key={idx} 
                        className="badge" 
                        style={{ background: 'var(--green-bg)', color: 'var(--green)', borderColor: '#bbf7d0', cursor: 'pointer' }}
                        onClick={() => openDetail(cit.vb)}
                        title={cit.nguon}
                      >
                        <FileText size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }}/>
                        {cit.vb} ({cit.dieu})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--amber-bg)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={20} />
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader size={16} className="spin" style={{ color: 'var(--amber)' }} />
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>Đang tìm kiếm thông tin...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border)', backgroundColor: '#f8fafc' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <input 
              type="text" 
              className="inp" 
              placeholder="Bạn muốn hỏi gì về văn bản quy phạm pháp luật?" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', fontSize: '15px' }}
              disabled={isLoading}
            />
            <button 
              className="btn" 
              style={{ width: '48px', height: '48px', borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: input.trim() ? 'var(--blue)' : 'var(--muted)', color: 'white' }}
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
      
      {/* CSS cho hiệu ứng xoay và hover */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .hover-bg-gray:hover { background-color: #f8fafc; }
      `}</style>
    </section>
  );
};

export default Chat;
