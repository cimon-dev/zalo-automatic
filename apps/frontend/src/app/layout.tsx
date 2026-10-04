import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zalo AI Assistant - Trợ Lý Cá Nhân Thông Minh',
  description: 'Hệ thống tự động hóa Zalo Web và Trả lời tự động bằng Gemini AI nhái giọng điệu',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
