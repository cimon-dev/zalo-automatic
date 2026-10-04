'use client';

import React, { useState } from 'react';
import { AccountSession, PlaywrightStatus } from '../hooks/useSocket';
import { MessageSquare, Sparkles, LogOut, Plus, ChevronDown, User, ShieldAlert, Settings } from 'lucide-react';

interface SidebarNavProps {
  accounts: AccountSession[];
  activeAccount: AccountSession | null;
  status: PlaywrightStatus;
  activeTab: 'chat' | 'persona';
  onTabChange: (tab: 'chat' | 'persona') => void;
  onSwitchAccount: (id: string) => void;
  onAddAccount: (name?: string) => void;
  onLogout: () => void;
  onOpenQr: () => void;
  onOpenSettings: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  accounts,
  activeAccount,
  status,
  activeTab,
  onTabChange,
  onSwitchAccount,
  onAddAccount,
  onLogout,
  onOpenQr,
  onOpenSettings,
}) => {
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showNewAccountInput, setShowNewAccountInput] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    onAddAccount(newAccountName.trim());
    setNewAccountName('');
    setShowNewAccountInput(false);
    setShowAccountMenu(false);
  };

  return (
    <aside className="w-16 bg-[#060911] border-r border-white/10 flex flex-col items-center py-4 justify-between z-30 select-none">
      {/* Top: Avatar & Account Switcher */}
      <div className="flex flex-col items-center gap-6 w-full">
        {/* Account Avatar with Menu */}
        <div className="relative">
          <button
            onClick={() => setShowAccountMenu(!showAccountMenu)}
            title="Đổi tài khoản Zalo"
            className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-blue-500/30 hover:ring-blue-500 transition-all cursor-pointer"
          >
            {activeAccount?.name ? activeAccount.name.charAt(0).toUpperCase() : 'Z'}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#060911] ${
                status === 'READY' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
          </button>

          {/* Account Dropdown */}
          {showAccountMenu && (
            <div className="absolute left-14 top-0 w-64 rounded-2xl glass-panel border border-white/15 p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                <span className="text-xs font-semibold text-slate-300">Tài khoản Zalo ({accounts.length})</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-medium">Multi-Session</span>
              </div>

              {/* Danh sách các tài khoản */}
              <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                {accounts.map((acc) => {
                  const isCurrent = acc.id === activeAccount?.id;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => {
                        onSwitchAccount(acc.id);
                        setShowAccountMenu(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all ${
                        isCurrent
                          ? 'bg-blue-600/30 border border-blue-500/40 text-white'
                          : 'hover:bg-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-200">
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate max-w-[120px]">
                          <p className="font-medium truncate">{acc.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {acc.status === 'READY' ? '🟢 Sẵn sàng' : '🟡 Cần quét QR'}
                          </p>
                        </div>
                      </div>
                      {isCurrent && <span className="text-[10px] text-blue-400 font-bold">Đang dùng</span>}
                    </button>
                  );
                })}
              </div>

              {/* Form thêm tài khoản mới */}
              <div className="mt-3 pt-2 border-t border-white/10">
                {showNewAccountInput ? (
                  <form onSubmit={handleAddSubmit} className="flex flex-col gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      placeholder="Tên tài khoản (VD: Zalo Bán Hàng)..."
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="submit"
                        className="flex-1 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                      >
                        Tạo & Quét QR
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAccountInput(false)}
                        className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-xs"
                      >
                        Hủy
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowNewAccountInput(true)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-blue-400 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm tài khoản mới
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => onTabChange('chat')}
            title="Hộp thư Zalo"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'chat'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <button
            onClick={() => onTabChange('persona')}
            title="Luyện giọng AI (Persona)"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === 'persona'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom: Settings & Logout */}
      <div className="flex flex-col items-center gap-3">
        {status === 'WAITING_QR' && (
          <button
            onClick={onOpenQr}
            title="Mở mã QR"
            className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center hover:bg-amber-500/20 transition-all cursor-pointer"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={onOpenSettings}
          title="Cài đặt hệ thống & Tự động trả lời 100%"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={onLogout}
          title="Đăng xuất tài khoản này"
          className="w-10 h-10 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
};
