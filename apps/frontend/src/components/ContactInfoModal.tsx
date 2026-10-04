'use client';

import React from 'react';
import { ConversationItem } from '../hooks/useSocket';
import { X, User, Bell, Sparkles, LogOut, CheckCircle } from 'lucide-react';

interface ContactInfoModalProps {
  isOpen: boolean;
  conversation: ConversationItem | null;
  isAiEnabled: boolean;
  onClose: () => void;
  onToggleAi: (enabled: boolean) => void;
  onLogout: () => void;
}

export const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  isOpen,
  conversation,
  isAiEnabled,
  onClose,
  onToggleAi,
  onLogout,
}) => {
  if (!isOpen || !conversation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-sm rounded-2xl glass-panel border border-white/10 p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Avatar & Tên */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="relative mb-3">
            {conversation.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={conversation.avatar}
                alt={conversation.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 shadow-xl"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-2xl shadow-xl">
                {conversation.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#090d16]" />
          </div>

          <h3 className="text-base font-bold text-white">{conversation.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Tài khoản Zalo cá nhân</p>
        </div>

        {/* Thông tin & Tùy chọn */}
        <div className="flex flex-col gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              AI Tự Động Trả Lời:
            </span>
            <button
              onClick={() => onToggleAi(!isAiEnabled)}
              className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                isAiEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAiEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
            </button>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Trạng thái đồng bộ:
            </span>
            <span className="text-emerald-400 font-medium">Đang kết nối</span>
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold border border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất tài khoản Zalo này
          </button>
        </div>
      </div>
    </div>
  );
};
