# Hướng dẫn Hạ tầng & Cấu hình DevOps (Phase 5)

Dưới đây là các bước thao tác trên Server Linux / Production để đảm bảo hệ thống đạt mức bảo mật tuyệt đối. 

## 1. Bảo vệ cổng kết nối Database (Mục 17)
Mặc định, nếu bạn không cấu hình cẩn thận, cổng `5432` của PostgreSQL có thể bị mở ra Internet (Public). Kẻ xấu có thể dùng công cụ rà quét và liên tục thử mật khẩu.

**Cách làm:**
- **Trong file `postgresql.conf`** trên Server (thường ở `/etc/postgresql/14/main/postgresql.conf`):
  Tìm dòng `listen_addresses = '*'` và sửa thành:
  ```ini
  listen_addresses = 'localhost'
  ```
- **Lưu ý**: Khởi động lại PostgreSQL (`sudo systemctl restart postgresql`). 
- Sau bước này, chỉ có mã Backend (chạy trên cùng một máy chủ nội bộ) mới có thể kết nối vào DB. Không ai có thể ping hay kết nối tới cổng 5432 từ xa.

## 2. Giới hạn quyền User Database (Mục 18)
Tuyệt đối không dùng tài khoản gốc `postgres` (như trong file `.env` hiện tại) để chạy ứng dụng thực tế. Nếu hacker tìm thấy lỗ hổng SQL Injection (dù khả năng thấp do ta dùng ORM), tài khoản `postgres` có thể xóa toàn bộ CSDL hoặc cài cắm mã độc lên máy chủ.

**Cách làm:**
Mở Terminal, truy cập vào `psql` dưới quyền postgres gốc:
```sql
-- Tạo một user chỉ dành cho ứng dụng này
CREATE USER dau_app_user WITH PASSWORD 'MatKhauMoiCuaBan_ĐủMạnh!';

-- Chỉ cấp quyền CRUD trên database `dau_second_brain_mine`
GRANT CONNECT ON DATABASE dau_second_brain_mine TO dau_app_user;
\c dau_second_brain_mine
GRANT USAGE ON SCHEMA public TO dau_app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO dau_app_user;
-- Chú ý: Cấp quyền tự động cho các bảng mới tạo sau này
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dau_app_user;
```
Sau đó, trong file `.env` trên Production, hãy cập nhật thành:
`DATABASE_URL="postgresql://dau_app_user:MatKhauMoiCuaBan_ĐủMạnh!@localhost:5432/dau_second_brain_mine"`

## 3. Đưa Web qua Cloudflare & Bắt buộc HTTPS (Mục 19 & 13)
Hiện tại Web chưa có HTTPS (ổ khóa xanh) nên mật khẩu khi gửi đi vẫn là chữ thô. Hãy dùng gói miễn phí của Cloudflare.

**Cách làm:**
- Tạo tài khoản Cloudflare, thêm Domain của bạn vào.
- Trỏ bản ghi DNS loại A (hoặc CNAME) từ Domain của bạn về IP của Server.
- **BẬT ĐÁM MÂY MÀU CAM (Proxied)**. Điều này giúp Cloudflare ẩn IP thật của Server đi, mọi cuộc tấn công DDOS đều bị Cloudflare cản lại.
- Vào mục **SSL/TLS** -> Chọn chế độ **Full** (hoặc Flexible nếu Backend chưa cài Let's Encrypt).
- Bật **"Always Use HTTPS"** để ép người dùng phải dùng kết nối mã hóa.

## 4. Thiết lập Backup tự động hàng ngày (Mục 20)
Dữ liệu là tài sản quý nhất. Bạn cần tự động Backup. Tôi đã viết sẵn một script `backup_db.sh` tại thư mục `scripts` của dự án. 

**Cách cài tự động (Cronjob):**
1. Đăng nhập vào Server Linux, cấp quyền chạy cho script:
   ```bash
   chmod +x /path/to/AI_Second_Brain_DAU/scripts/backup_db.sh
   ```
2. Mở trình soạn thảo cron bằng lệnh:
   ```bash
   crontab -e
   ```
3. Thêm dòng sau vào cuối file để hệ thống tự động backup lúc **2h sáng mỗi ngày**:
   ```cron
   0 2 * * * /path/to/AI_Second_Brain_DAU/scripts/backup_db.sh >> /var/log/dau_backup.log 2>&1
   ```
*(Hãy mở thư mục dự án của bạn để xem file `scripts/backup_db.sh` tôi vừa tạo)*
