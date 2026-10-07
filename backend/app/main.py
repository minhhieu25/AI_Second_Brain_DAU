from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import logging
from .core.config import settings
from .api import endpoints

from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from app.services.ingestion.crawl_documents import crawl_chinhphu, check_new_chinhphu
from app.db.session import engine, SessionLocal
from app.db.models import Base, User
from app.core.security import get_password_hash
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.limiter import limiter

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo DB
    Base.metadata.create_all(bind=engine)
    
    # Tạo users mặc định
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.email == "admin@dau.edu.vn").first()
        if not admin_user:
            admin = User(email="admin@dau.edu.vn", hashed_password=get_password_hash("admin123"), role="admin")
            db.add(admin)
            
        lecturer_user = db.query(User).filter(User.email == "giangvien@dau.edu.vn").first()
        if not lecturer_user:
            lecturer = User(email="giangvien@dau.edu.vn", hashed_password=get_password_hash("giangvien123"), role="lecturer")
            db.add(lecturer)
            
        db.commit()
    except Exception as e:
        print("Lỗi tạo user mặc định:", e)
        db.rollback()
    finally:
        db.close()

    # Khởi động Cron Job khi app start
    scheduler = BackgroundScheduler()
    # Hàng đêm lúc 2:00 sáng, chạy crawler tải tối đa 10 văn bản
    scheduler.add_job(crawl_chinhphu, 'cron', hour=2, minute=0, args=[10], id="nightly_crawler")
    # Cứ mỗi 30 phút, chạy ping kiểm tra văn bản mới cực nhẹ
    scheduler.add_job(check_new_chinhphu, 'interval', minutes=30, id="ping_chinhphu")
    scheduler.start()
    print("Đã khởi động Cron Job ngầm (APScheduler) cho luồng Theo dõi & Cào văn bản.")
    yield
    # Dọn dẹp khi app shutdown
    scheduler.shutdown()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Lỗi hệ thống nội bộ. Vui lòng thử lại sau."}
    )

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME}"}
