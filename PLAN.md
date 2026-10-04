# KẾ HOẠCH TRIỂN KHAI DỰ ÁN: ZALO AUTOMATION & AI PERSONAL ASSISTANT

> **Mô hình kiến trúc:** Monolithic Monorepo (NestJS Backend + Next.js Frontend)  
> **Mục tiêu:** Hệ thống tự động hóa Zalo Web qua Playwright, quản lý tin nhắn thời gian thực và tích hợp trợ lý AI (Gemini 3.8 Flash) tự động trả lời theo giọng điệu cá nhân (Persona).

---

## 📑 BẢNG THEO DÕI TIẾN ĐỘ TỔNG THỂ

| Phase | Nội dung công việc | Trạng thái |
| :--- | :--- | :---: |
| **Phase 1** | Khởi tạo cấu trúc Workspace Monorepo & Cấu hình cơ bản | 🟢 Hoàn thành |
| **Phase 2** | Xây dựng Playwright Worker (Lõi tự động hóa Zalo, Chống bot, Lưu session) | 🟢 Hoàn thành |
| **Phase 3** | Xây dựng Socket.io Gateway & Quản lý luồng dữ liệu Realtime | 🟢 Hoàn thành |
| **Phase 4** | Xây dựng Module Gemini 3.8 Flash & Persona Training Engine | 🟢 Hoàn thành |
| **Phase 5** | Nâng cấp Giao diện 3 Cột Chuẩn Zalo Web (Search, Danh sách, Khung chat, Info) | 🟢 Hoàn thành |
| **Phase 6** | Quản lý Đa Tài Khoản (Multi-Session Accounts), Bắt tin nhắn triệt để & Đăng xuất | 🟢 Hoàn thành |

---

## 🛠 CHI TIẾT CÁC HẠNG MỤC MỚI ĐÃ NÂNG CẤP

### 1. KHẮC PHỤC TRIỆT ĐỂ BẮT TIN NHẮN ĐẾN (✅ HOÀN THÀNH)
- [x] Sửa lỗi gốc rễ: Khi vừa đăng nhập Zalo Web, chưa có hội thoại nào được chọn khiến ô nhập liệu và khung chat chưa render.
- [x] Nâng cấp `PlaywrightService` với cơ chế lắng nghe đa tầng:
  - Global `MutationObserver` gắn vào `document.body` để bắt mọi biến động tin nhắn và danh sách hội thoại.
  - Tự động click vào cuộc trò chuyện đầu tiên nếu người dùng gửi tin khi chưa chọn hội thoại.
  - Cơ chế quét định kỳ (periodic sync) 2.5 giây/lần để đồng bộ danh sách cuộc trò chuyện và tin nhắn mới nhất.

### 2. GIAO DIỆN 3 CỘT CHUẨN ZALO WEB (✅ HOÀN THÀNH)
- [x] **Cột 1 (SidebarNav):** Thanh điều hướng dọc chứa Avatar tài khoản, Menu chuyển đổi Đa tài khoản (Multi-Account Switcher), tab Chat, tab Luyện giọng AI, và nút Đăng xuất.
- [x] **Cột 2 (ConversationList):**
  - Ô tìm kiếm Zalo (`searchZalo`) mô phỏng tìm kiếm danh bạ và tin nhắn như Zalo thật.
  - Bộ lọc Tab: "Tất cả" & "Chưa đọc".
  - Danh sách cuộc trò chuyện: Avatar, Tên, Đoạn xem trước tin nhắn cuối, Thời gian, Huy hiệu tin nhắn chưa đọc màu đỏ.
- [x] **Cột 3 (ChatArea):**
  - Header: Avatar người dùng, Tên, Trạng thái hoạt động, Công tắc gạt AI riêng cho đoạn chat, Nút "Xem thông tin" người dùng, Nút "Đăng xuất".
  - Khung tin nhắn: Phân loại bong bóng rõ ràng (Khách hàng, Bạn thủ công, Gemini AI tự động), chỉ báo gõ phím của AI.
  - Khung nhập tin: Gõ phím gửi trực tiếp qua Zalo với phím tắt Enter.
- [x] **Modal Thông Tin Người Dùng (ContactInfoModal):** Xem chi tiết avatar, trạng thái đồng bộ, tùy chỉnh AI và đăng xuất.

### 3. QUẢN LÝ ĐA TÀI KHOẢN (MULTI-ACCOUNT / MULTI-SESSION) (✅ HOÀN THÀNH)
- [x] Xây dựng `AccountService`: Lưu trữ danh sách tài khoản tại `storage/accounts.json` và file session độc lập tại `storage/sessions/[accountId].json`.
- [x] Cho phép người dùng chuyển đổi qua lại giữa các tài khoản (Tài khoản 1, Zalo bán hàng 2...) chỉ với 1 click.
- [x] Hỗ trợ thêm tài khoản mới và đăng xuất tài khoản hiện tại an toàn.
