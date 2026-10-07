#!/bin/bash

# ==============================================================================
# Script Backup Database PostgreSQL hàng ngày
# Lưu trữ 7 bản sao gần nhất (tự động xóa bản cũ hơn 7 ngày)
# ==============================================================================

# 1. Cấu hình
DB_NAME="dau_second_brain_mine"
DB_USER="postgres" # Trên Production nên đổi thành dau_app_user
BACKUP_DIR="/var/backups/postgresql/dau_second_brain"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
FILE_NAME="${DB_NAME}_backup_${DATE}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILE_NAME}"

# Tạo thư mục chứa backup nếu chưa có
mkdir -p "$BACKUP_DIR"

# 2. Thực thi pg_dump 
# Chú ý: Cần cấu hình .pgpass ở tài khoản root hoặc crontab user để không bị hỏi mật khẩu
echo "Đang tiến hành backup database '${DB_NAME}'..."
pg_dump -U "$DB_USER" -h localhost -F p "$DB_NAME" | gzip > "$BACKUP_PATH"

if [ $? -eq 0 ]; then
    echo "Backup thành công: $BACKUP_PATH"
else
    echo "LỖI: Quá trình backup thất bại!"
    exit 1
fi

# 3. Dọn dẹp các bản backup cũ (Giữ lại 7 ngày)
echo "Đang dọn dẹp các bản backup cũ hơn 7 ngày..."
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +7 -exec rm {} \;
echo "Hoàn tất bảo trì."
