from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, Boolean, Float, DateTime
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.dialects.postgresql import JSONB
import datetime
# from pgvector.sqlalchemy import Vector

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="lecturer") # 'admin' or 'lecturer'
    is_active = Column(Boolean, default=True)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True, nullable=False)
    source_folder = Column(String, nullable=False)
    linh_vuc = Column(String, nullable=True, default="Giáo dục") # Nhóm lĩnh vực chuyên ngành
    chu_de = Column(String, nullable=True) # Phân loại chủ đề AI
    status = Column(String, default="draft") # draft, in_review, published
    
    # Metadata bổ sung
    co_quan_ban_hanh = Column(String, nullable=True)
    nguoi_ky = Column(String, nullable=True)
    ngay_ky = Column(String, nullable=True)
    hieu_luc_tu = Column(String, nullable=True)
    hieu_luc_den = Column(String, nullable=True) 
    trang_thai_hieu_luc = Column(String, nullable=True, default="Còn hiệu lực")
    ocr = Column(Boolean, default=True)
    conf = Column(Float, default=0.98)
    tags = Column(String, nullable=True)
    tom_tat = Column(Text, nullable=True)
    ghi_chu = Column(Text, nullable=True) # Lưu "Ghi chú khi bóc tách"
    dieu_khoan_hieu_luc_nguyen_van = Column(Text, nullable=True) # Lưu "Nguyên văn điều khoản hiệu lực"
    muc_luc_dieu_khoan = Column(JSONB, nullable=True) # Mảng object lưu cấu trúc chương/điều
    created_at = Column(DateTime, default=datetime.datetime.now)
    
    # Relationships``
    obligations = relationship("Obligation", back_populates="document", cascade="all, delete-orphan")
    thresholds = relationship("Threshold", back_populates="document", cascade="all, delete-orphan")

class Obligation(Base):
    __tablename__ = "obligations"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    vb = Column(String, nullable=False)
    dieu = Column(String)
    loai = Column(String)
    chu_the = Column(String)
    noi_dung = Column(Text)
    han_chot = Column(String)
    nguon = Column(Text)
    status = Column(String, default="draft") # draft, published
    tom_tat = Column(Text, nullable=True)
    nli_label = Column(String, nullable=True) # entailment, contradiction, neutral
    created_at = Column(DateTime, default=datetime.datetime.now)

    document = relationship("Document", back_populates="obligations")

class Threshold(Base):
    __tablename__ = "thresholds"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    vb = Column(String, nullable=False)
    dieu = Column(String)
    gia_tri = Column(String)
    y_nghia = Column(Text)
    nguon = Column(Text)
    status = Column(String, default="draft") # draft, published
    created_at = Column(DateTime, default=datetime.datetime.now)
    tom_tat = Column(Text, nullable=True)
    nli_label = Column(String, nullable=True) # entailment, contradiction, neutral

    document = relationship("Document", back_populates="thresholds")

class DocumentEmbedding(Base):
    __tablename__ = "document_embeddings"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    content = Column(Text, nullable=False)
    # Tạm dùng JSONB để lưu mảng [0.1, 0.2, ...] vì máy user chưa cài đặt pgvector extension
    embedding = Column(JSONB) 
    
    document = relationship("Document")

class DocumentRelation(Base):
    __tablename__ = "document_relations"

    id = Column(Integer, primary_key=True, index=True)
    source_doc = Column(String, nullable=False) # VD: TT 08/2021
    target_doc = Column(String, nullable=False) # VD: TT 17/2021
    relation_type = Column(String, nullable=False) # can_cu, thay_the, sua_doi, bai_bo
    status = Column(String, default="published")
    nguyen_van = Column(String, nullable=True)

class AuditTrail(Base):
    __tablename__ = "audit_trails"

    id = Column(Integer, primary_key=True, index=True)
    item_type = Column(String, nullable=False) # nghiaVu, conSoChot
    item_id = Column(Integer, nullable=False)
    vb = Column(String, nullable=True) # Tên văn bản
    dieu = Column(String, nullable=True) # Tên điều
    original_text = Column(Text, nullable=True) # Bản gốc
    original_summary = Column(Text, nullable=False)
    edited_summary = Column(Text, nullable=True)
    action = Column(String, nullable=False)
    author = Column(String, default="Admin")
    timestamp = Column(String, nullable=False)

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.now)
    updated_at = Column(DateTime, default=datetime.datetime.now, onupdate=datetime.datetime.now)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("chat_sessions.id"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    citations = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.now)
