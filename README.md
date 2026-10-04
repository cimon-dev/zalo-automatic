# Zalo AI Automation & Personal Assistant 🤖💬

Hệ thống Web App quản lý tin nhắn Zalo Web tự động hóa toàn diện bằng **Playwright**, tích hợp **Google Gemini AI** học theo giọng điệu cá nhân (**Persona Profile**) để tự động trả lời khách hàng/bạn bè theo thời gian thực với trải nghiệm trực quan như Zalo thật.

---

## ✨ Tính Năng Nổi Bật

### 1. Giao diện trực quan mô phỏng Zalo thật (Modern Dark Glassmorphism)
- **Cột trái - Danh sách hội thoại:**
  - Đồng bộ danh bạ và tin nhắn gần nhất theo thời gian thực từ Zalo Web.
  - Phân loại tab: **Tất cả** và **Chưa đọc**.
  - Nhận diện trạng thái **Tắt thông báo (🔕)** và số lượng tin nhắn chưa đọc (Badge).
  - Tìm kiếm thời gian thực (Real-time Search): Tìm nhanh theo tên hoặc tìm kiếm bất kỳ số điện thoại nào trên Zalo để mở chat trực tiếp.
  - Quản lý đa tài khoản (**Multi-session**): Thêm tài khoản mới qua QR, chuyển đổi linh hoạt giữa nhiều tài khoản, hoặc đăng xuất an toàn.
- **Khung chat trung tâm:**
  - Header hiển thị đầy đủ Avatar, Tên khách hàng, trạng thái hoạt động trên Zalo Web.
  - Phân biệt rõ ràng bong bóng tin nhắn: **Bạn (Thủ công)** màu xanh bên phải, **Khách hàng** bên trái, và **Gemini AI (Tự động)** với hiệu ứng tím độc quyền.
  - Hỗ trợ đầy đủ tin nhắn văn bản, tin nhắn thu hồi (*"Tin nhắn đã được thu hồi"*), nhãn dán (*`[Sticker]`*), và tệp tài liệu (*`[File: ...]`*).
  - Khung gõ tin nhắn trực tiếp với phím tắt `Enter` để gửi tin tức thì.

### 2. Chế độ AI Tự Động Trả Lời Thông Minh (AI Auto-Reply)
- **Master Toggle 100% Auto-Reply:** Công tắc trên cùng danh sách hội thoại cho phép kích hoạt chế độ tự động trả lời cho tất cả các tin nhắn mới gửi đến.
- **Quy tắc loại trừ thông minh:**
  - Tự động bỏ qua các cuộc hội thoại đã bật **Tắt thông báo 🔕** (tránh làm phiền các hội thoại gia đình, nhóm không liên quan).
  - Tự động bỏ qua các số điện thoại/tên người dùng trong danh sách chặn (**Blacklist**).
- **Cơ chế gõ phím mô phỏng con người (Human-like Typing):**
  - Tùy chỉnh độ trễ gõ phím ngẫu nhiên (Keystroke Delay Jitter: ví dụ 35ms - 75ms mỗi ký tự).
  - Độ trễ suy nghĩ tự nhiên trước khi trả lời (Reply Delay Seconds).
- **Hỗ trợ đa mô hình Gemini:** Tương thích với `gemini-2.5-flash`, `gemini-1.5-flash`, `gemini-1.5-pro` với cơ chế fallback tự động.

### 3. Huấn luyện giọng điệu AI (Persona Training)
- Phỏng vấn người dùng theo các câu hỏi tình huống thực tế để nhận diện phong cách xưng hô, câu từ quen thuộc, và văn phong riêng.
- Tự động phân tích và nhúng vào System Instruction của Gemini.

---

## 🏗 Kiến Trúc Kỹ Thuật (Tech Stack)

- **Mô hình:** Monolithic Monorepo (Gọn nhẹ, dễ bảo trì và triển khai).
- **Backend (NestJS + TypeScript):**
  - **Playwright Core:** Điều khiển Chromium ở chế độ Stealth chống bot, duy trì session đăng nhập (`storageState`), tự động lấy QR Code.
  - **DOM MutationObserver & DOM Scraper:** Bắt tin nhắn đến và trích xuất dữ liệu chat chính xác từ các selector chuẩn của Zalo Web.
  - **Socket.io Gateway:** Giao tiếp 2 chiều độ trễ thấp với Frontend.
  - **Google Gemini API:** Xử lý ngôn ngữ tự nhiên và tạo phản hồi theo Persona.
- **Frontend (Next.js 14 App Router + Tailwind CSS):**
  - Giao diện Dark Mode cao cấp, hiệu ứng chuyển cảnh mượt mà, thân thiện với người dùng.
  - Kết nối Socket.io duy trì liên tục và cập nhật tức thời khi có tin nhắn mới.

---

## 📂 Cấu Trúc Dự Án

```text
zalo-automatic/
├── apps/
│   ├── backend/                     # NestJS Backend (Port 4000)
│   │   ├── src/
│   │   │   ├── automation/          # Playwright Service, Account & Settings
│   │   │   ├── gateway/             # Socket.io Gateway
│   │   │   ├── ai/                  # Gemini & Persona Service
│   │   │   └── common/              # Types & Constants
│   │   └── storage/                 # Dữ liệu cục bộ (session, settings, history)
│   └── frontend/                    # Next.js 14 Frontend (Port 3000)
│       └── src/
│           ├── app/                 # Page chính & Layout
│           ├── components/          # ConversationList, ChatArea, SettingsModal, PersonaModal
│           └── hooks/               # useSocket (Realtime State Management)
├── package.json                     # Monorepo runner
└── README.md
```

---

## 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Cài đặt Dependencies
Mở Terminal tại thư mục gốc của dự án:
```bash
npm install
```

> **Cài đặt trình duyệt Playwright:**
> ```bash
> npx playwright install chromium
> ```

### 2. Cấu hình môi trường (.env)
Tạo file `apps/backend/.env` (tham khảo `apps/backend/.env.example`):
```env
PORT=4000
FRONTEND_URL=http://localhost:3000

# Khóa API Google Gemini (Lấy miễn phí tại https://aistudio.google.com/)
GEMINI_API_KEY=your_gemini_api_key_here

# Đặt false để hiển thị trình duyệt Chrome quan sát, hoặc true để chạy ngầm
HEADLESS=false
```

### 3. Khởi chạy dự án
Chạy 1 lệnh duy nhất tại thư mục gốc:
```bash
npm run dev
```

Hệ thống sẽ đồng thời khởi động:
- **Backend:** `http://localhost:4000`
- **Frontend Dashboard:** `http://localhost:3000`

---

## 💡 Hướng Dẫn Sử Dụng

1. **Đăng nhập Zalo:**
   - Mở trình duyệt vào `http://localhost:3000`.
   - Quét mã QR hiển thị trên màn hình bằng ứng dụng Zalo trên điện thoại.
   - Phiên đăng nhập sẽ được lưu trữ tự động; các lần khởi động tiếp theo không cần quét lại mã.
2. **Nhắn tin & Quản lý hội thoại:**
   - Chọn cuộc trò chuyện ở danh sách bên trái để đọc toàn bộ lịch sử tin nhắn.
   - Nhập nội dung vào khung chat và nhấn **Gửi** để trả lời thủ công.
3. **Bật AI Tự Động Trả Lời:**
   - Bật công tắc **"100% Tự động trả lời AI"** ở đầu danh sách chat hoặc bật cho từng cuộc trò chuyện riêng lẻ.
   - Vào mục **Cài đặt (biểu tượng bánh răng)** để cấu hình API Key, chọn mô hình AI, điều chỉnh tốc độ gõ phím và thiết lập danh sách loại trừ (Blacklist).
