from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
import os
import random
from ...db.session import get_db
from ...db.models import Document, Obligation, Threshold, DocumentRelation, AuditTrail
from ...services.nlp_pipeline import generate_rag_answer, extractor, classify_text, create_embedding
from ...services.pdf_parser import extract_text_from_pdf, chunk_document
from ...services.ingestion.crawl_documents import crawl_chinhphu, get_sync_status, BASE_OUTPUT_DIR
from ...services.vector_db import vector_db
from ...core.security import get_current_user
from ...db.models import User, ChatSession, ChatMessage
import datetime

class ExtractRequest(BaseModel):
    text: str

router = APIRouter()

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[int] = None

@router.get("/chat/sessions")
async def get_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = db.query(ChatSession).filter(ChatSession.user_id == current_user.id).order_by(ChatSession.updated_at.desc()).all()
    return {"sessions": sessions}

@router.get("/chat/sessions/{session_id}")
async def get_session_history(session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc()).all()
    return {"session": session, "messages": messages}

@router.post("/chat")
async def chat_rag(request: ChatRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    RAG Chatbot endpoint.
    """
    # 1. Truy xuất dữ liệu (Retrieval): Sử dụng FAISS Vector DB
    query_emb = create_embedding(request.query)
    
    # Tìm kiếm vector gần nhất, lấy top 5 kết quả với ngưỡng độ tương đồng > 0.2
    results = vector_db.search(query_emb, top_k=5, threshold=0.2)
    
    if not results:
        context_chunks = ["Không tìm thấy dữ liệu pháp lý liên quan trong hệ thống."]
        citations = []
    else:
        context_chunks = []
        citations = []
        for metadata, score in results:
            context_chunks.append(f"- Tài liệu: {metadata['vb']}, {metadata['dieu']}\n  Nội dung: {metadata['nguon']}")
            citations.append({
                "id": metadata["id"],
                "vb": metadata["vb"],
                "dieu": metadata["dieu"],
                "nguon": metadata["nguon"]
            })
    
    # 2. Sinh câu trả lời qua interface NLP
    answer = generate_rag_answer(request.query, context_chunks)
    
    # 3. Hậu xử lý (Post-processing)
    if "không tìm thấy" in answer.lower() or "tôi là" in answer.lower():
        citations = []
        
    # 4. Lưu vào DB
    session_id = request.session_id
    if not session_id:
        title = request.query[:40] + ("..." if len(request.query) > 40 else "")
        new_session = ChatSession(user_id=current_user.id, title=title)
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        session_id = new_session.id
    else:
        # Cập nhật updated_at của session cũ
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == current_user.id).first()
        if session:
            session.updated_at = datetime.datetime.now()
            db.commit()

    # Lưu câu hỏi User
    user_msg = ChatMessage(session_id=session_id, role="user", content=request.query)
    db.add(user_msg)
    
    # Lưu câu trả lời Assistant
    assistant_msg = ChatMessage(session_id=session_id, role="assistant", content=answer, citations=citations)
    db.add(assistant_msg)
    db.commit()

    return {
        "session_id": session_id,
        "query": request.query,
        "answer": answer,
        "citations": citations
    }


