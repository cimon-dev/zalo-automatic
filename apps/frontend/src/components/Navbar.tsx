'use client';

import React from 'react';
import { PlaywrightStatus } from '../hooks/useSocket';
import { Bot, Wifi, WifiOff, Sparkles, MessageSquare, QrCode } from 'lucide-react';

interface NavbarProps {
  isConnected: boolean;
  status: PlaywrightStatus;
  isAiEnabled: boolean;
  activeTab: 'chat' | 'persona';
  onToggleAi: (enabled: boolean) => void;
  onTabChange: (tab: 'chat' | 'persona') => void;
  onOpenQr: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isConnected,
  status,
  isAiEnabled,
  activeTab,
  onToggleAi,
  onTabChange,
  onOpenQr,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'READY':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Zalo: Đã kết nối
          </span>
        );
      case 'WAITING_QR':
        return (
          <button
            onClick={onOpenQr}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            Cần quét QR đăng nhập
          </button>
        );
      case 'INITIALIZING':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            Đang khởi tạo trình duyệt...
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Mất kết nối Zalo
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
      {/* Brand & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
              Zalo AI Auto-Pilot
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                Pro
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-emerald-400 inline" /> Socket: Sẵn sàng
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-400 inline" /> Socket: Ngắt kết nối
                </>
              )}
            </p>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-white/10" />
        <div className="hidden sm:block">{getStatusBadge()}</div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
        <button
          onClick={() => onTabChange('chat')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'chat'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Hộp thư Zalo
        </button>
        <button
          onClick={() => onTabChange('persona')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'persona'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          Luyện Giọng AI (Persona)
        </button>
      </div>

      {/* AI Mode Toggle */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-xs font-semibold text-slate-200">
            {isAiEnabled ? 'AI Tự động trả lời' : 'Trả lời thủ công'}
          </p>
          <p className="text-[11px] text-slate-400">
            {isAiEnabled ? 'Gemini đang trực tin nhắn' : 'Bạn tự trả lời tin nhắn'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleAi(!isAiEnabled)}
          className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isAiEnabled ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-700'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isAiEnabled ? 'translate-x-6' : 'translate-x-0'
            }`}
          >
            {isAiEnabled ? (
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            )}
          </span>
        </button>
      </div>
    </header>
  );
};
