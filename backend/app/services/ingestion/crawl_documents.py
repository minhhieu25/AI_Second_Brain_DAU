import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import logging
from datetime import datetime
import json
import re

# Lấy đường dẫn tuyệt đối đến thư mục gốc của project backend
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
LOG_DIR = os.path.join(BASE_DIR, "logs")
os.makedirs(LOG_DIR, exist_ok=True)

logging.basicConfig(
    filename=os.path.join(LOG_DIR, "ingestion_errors.log"),
    level=logging.ERROR,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

BASE_OUTPUT_DIR = os.path.join(BASE_DIR, "data", "vanban_caotudong")
os.makedirs(BASE_OUTPUT_DIR, exist_ok=True)
STATUS_FILE = os.path.join(BASE_DIR, "data", "sync_status.json")

def set_sync_status(has_new: bool):
    with open(STATUS_FILE, "w") as f:
        json.dump({"has_new_docs": has_new}, f)

def get_sync_status() -> bool:
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE, "r") as f:
            data = json.load(f)
            return data.get("has_new_docs", False)
    return False

DOMAIN_KEYWORDS = {
    "Giao_duc": ["giáo dục", "đào tạo", "nhà trường", "trường học", "cơ sở giáo dục", "học sinh", "sinh viên", "giảng viên", "đại học", "cao đẳng"],
    "Tai_chinh": ["tài chính", "kế toán", "học phí", "đấu thầu", "tài sản công", "thuế", "ngân sách"],
    "Nhan_su": ["viên chức", "công chức", "lao động", "bảo hiểm xã hội", "tiền lương", "khen thưởng", "kỷ luật"],
    "Khoa_hoc": ["nghiên cứu khoa học", "sở hữu trí tuệ", "đề tài", "khoa học công nghệ"],
    "Hanh_chinh": ["văn thư", "lưu trữ", "hành chính", "chuyển đổi số", "an toàn thông tin", "an ninh mạng"],
    "Phap_luat_khung": ["tổ chức", "quy phạm", "ban hành", "quốc hội"]
}

def extract_domain(text_lower):
    for domain, kws in DOMAIN_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            return domain
    return "Khac"

def extract_pdf_links(soup, url):
    pdf_links = [] # list of (url, domain)
    for a_tag in soup.find_all('a', href=True):
        href = a_tag['href']
        if href.lower().endswith('.pdf'):
            parent_tr = a_tag.find_parent('tr')
            if parent_tr and len(parent_tr.text) < 1000:
                text_lower = parent_tr.text.lower()
                # Thêm lọc năm 2018 trở đi
                year_match = re.search(r'(201[8-9]|20[2-9][0-9])', text_lower)
                if not year_match:
                    continue # Bỏ qua văn bản cũ hơn 2018
                    
                domain = extract_domain(text_lower)
                if domain != "Khac": # Lọc các lĩnh vực quan trọng
                    full_url = urljoin(url, href)
                    if not any(u == full_url for u, d in pdf_links):
                        pdf_links.append((full_url, domain))
    return pdf_links

def check_new_chinhphu():
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] PING: Theo dõi văn bản mới...")
    url = "https://vanban.chinhphu.vn/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        html_text = response.text
        soup = BeautifulSoup(html_text, 'html.parser')
        
        pdf_links = extract_pdf_links(soup, url)
        if not pdf_links:
            print("Không có văn bản PDF nào trên trang.")
            return
            
        from app.db.session import SessionLocal
        from app.db.models import Document
        
        with SessionLocal() as db:
            processed_docs = db.query(Document.filename).all()
            processed_filenames = [doc[0] for doc in processed_docs]

        has_new = False
        scanned_count = len(pdf_links)
        skipped_count = 0
        
        for link, domain in pdf_links:
            filename = link.split('/')[-1].lower()
            if not filename.endswith('.pdf'):
                filename = "vanban_crawl_0.pdf"
                
            category = "Khac"
            if re.search(r'[-_]tt[-_.]|thong-tu', filename):
                category = "ThongTu"
            elif re.search(r'[-_]nd[-_.]|nghi-dinh', filename):
                category = "NghiDinh"
            elif re.search(r'[-_]qd[-_.]|quyet-dinh', filename):
                category = "QuyetDinh"
            elif "luat" in filename:
                category = "Luat"
                
            filepath = os.path.join(BASE_OUTPUT_DIR, domain, category, filename)
            
            if filename in processed_filenames:
                print(f"=> Bỏ qua {filename} vì đã được xử lý trong CSDL.")
                skipped_count += 1
                continue

            if not os.path.exists(filepath):
                has_new = True
                break
                
        if has_new:
            print("=> PHÁT HIỆN VĂN BẢN MỚI! Kích hoạt cờ hiệu.")
            set_sync_status(True)
        else:
            print("=> Không có văn bản mới.")
            
        return {"has_new": has_new, "skipped": skipped_count, "scanned": scanned_count}
            
    except Exception as e:
        print(f"Lỗi PING: {e}")
        return {"has_new": False, "skipped": 0, "scanned": 0}

def crawl_chinhphu(max_files=5):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Bắt đầu cào văn bản...")
    url = "https://vanban.chinhphu.vn/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        html_text = response.text
    except Exception as e:
        error_msg = f"Lỗi truy cập {url}: {e}"
        print(error_msg)
        logging.error(error_msg)
        return
        
    soup = BeautifulSoup(html_text, 'html.parser')
    pdf_links = extract_pdf_links(soup, url)
    
    if not pdf_links:
        print("Không tìm thấy link PDF public nào.")
        return
        
    from app.db.session import SessionLocal
    from app.db.models import Document
    
    with SessionLocal() as db:
        processed_docs = db.query(Document.filename).all()
        processed_filenames = [doc[0] for doc in processed_docs]

    count = 0
    for link, domain in pdf_links:
        if count >= max_files:
            break
            
        try:
            filename = link.split('/')[-1]
            if not filename.endswith('.pdf'):
                filename = f"vanban_crawl_{count}.pdf"
                
            filename_lower = filename.lower()
            
            if filename in processed_filenames or filename_lower in processed_filenames:
                print(f"=> Bỏ qua {filename} vì đã được xử lý trong CSDL.")
                continue
            
            category = "Khac"
            if re.search(r'[-_]tt[-_.]|thong-tu', filename_lower):
                category = "ThongTu"
            elif re.search(r'[-_]nd[-_.]|nghi-dinh', filename_lower):
                category = "NghiDinh"
            elif re.search(r'[-_]qd[-_.]|quyet-dinh', filename_lower):
                category = "QuyetDinh"
            elif "luat" in filename_lower:
                category = "Luat"
                
            cat_dir = os.path.join(BASE_OUTPUT_DIR, domain, category)
            os.makedirs(cat_dir, exist_ok=True)
            filepath = os.path.join(cat_dir, filename)
            
            if os.path.exists(filepath):
                continue
                
            print(f"Đang tải: {filename} ({domain})...")
            
            pdf_resp = requests.get(link, headers=headers, stream=True, timeout=30)
            pdf_resp.raise_for_status()
            
            with open(filepath, 'wb') as f:
                for chunk in pdf_resp.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
                        
            print(f"Lưu thành công: {filepath}")
            count += 1
            
        except Exception as e:
            error_msg = f"Lỗi tải file từ {link}: {e}"
            print(error_msg)
            logging.error(error_msg)
            
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Hoàn tất cào {count} văn bản.")
    set_sync_status(False)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--max_files", type=int, default=5)
    args = parser.parse_args()
    crawl_chinhphu(args.max_files)
