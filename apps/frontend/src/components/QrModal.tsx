'use client';

import React from 'react';
import { RefreshCw, Smartphone, X, ShieldCheck } from 'lucide-react';

interface QrModalProps {
  isOpen: boolean;
  qrCode: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const QrModal: React.FC<QrModalProps> = ({
  isOpen,
  qrCode,
  onClose,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
            <Smartphone className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Quét Mã Đăng Nhập Zalo</h3>
          <p className="text-xs text-slate-400 mt-1">
            Mở ứng dụng Zalo trên điện thoại, chọn biểu tượng QR để quét mã kết nối
          </p>
        </div>

        {/* Khung chứa ảnh mã QR */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner my-2">
          {qrCode ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrCode}
              alt="Mã QR Zalo"
              className="w-64 h-64 object-contain rounded-lg shadow-sm"
            />
          ) : (
            <div className="w-64 h-64 flex flex-col items-center justify-center text-slate-500 gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Đang tải mã QR từ Zalo Web...</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Phiên đăng nhập được bảo mật cục bộ
          </span>

          <button
            onClick={onRefresh}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-medium transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm mới
          </button>
        </div>
      </div>
    </div>
  );
};
