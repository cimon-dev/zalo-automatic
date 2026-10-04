'use client';

import React, { useState, useEffect } from 'react';
import { AppSettings } from '../hooks/useSocket';
import {
  X,
  Sliders,
  Sparkles,
  BellOff,
  Clock,
  Keyboard,
  Key,
  Shield,
  Check,
  RotateCcw,
  Zap,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings | null;
  onClose: () => void;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onScanRecentUnread: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onSave,
  onScanRecentUnread,
}) => {
  const [form, setForm] = useState<AppSettings>({
    isGlobalAutoReply: false,
    ignoreMutedChats: true,
    minKeystrokeDelay: 35,
    maxKeystrokeDelay: 75,
    replyDelaySeconds: 2,
    geminiApiKey: '',
    geminiModel: 'gemini-3.8-flash',
    systemPromptOverride: '',
    blacklist: [],
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [blacklistInput, setBlacklistInput] = useState('');
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    setIsSavedNotice(true);
    setTimeout(() => {
      setIsSavedNotice(false);
      onClose();
    }, 800);
  };

  const handleAddBlacklist = () => {
    const val = blacklistInput.trim();
    if (val && !form.blacklist.includes(val)) {
      setForm((prev) => ({
        ...prev,
        blacklist: [...prev.blacklist, val],
      }));
      setBlacklistInput('');
    }
  };

  const handleRemoveBlacklist = (item: string) => {
    setForm((prev) => ({
      ...prev,
      blacklist: prev.blacklist.filter((b) => b !== item),
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel border border-white/15 p-6 shadow-2xl flex flex-col max-h-[90vh] bg-[#0c101c]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Cài đặt Hệ Thống & Tự Động Trả Lời</h3>
              <p className="text-xs text-slate-400">Tùy chỉnh AI, độ trễ và quy tắc tự động trả lời 100%</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* Section 1: Tự động trả lời 100% */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Zap className={`w-4 h-4 ${form.isGlobalAutoReply ? 'text-amber-400' : 'text-slate-500'}`} />
                <div>
                  <h4 className="text-xs font-semibold text-white">Tự động trả lời 100% (Tất cả hội thoại)</h4>
                  <p className="text-[11px] text-slate-400">AI tự động trả lời mọi tin nhắn đến theo thời gian thực</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, isGlobalAutoReply: !prev.isGlobalAutoReply }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  form.isGlobalAutoReply ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.isGlobalAutoReply ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Mute rule exclusion */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <div className="flex items-center gap-2">
                <BellOff className="w-4 h-4 text-rose-400" />
                <div>
                  <span className="text-xs font-medium text-slate-200">Bỏ qua hội thoại Tắt thông báo</span>
                  <p className="text-[10px] text-slate-400">Không trả lời các cuộc trò chuyện có icon chuông gạch chéo 🔕</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={form.ignoreMutedChats}
                onChange={(e) => setForm((prev) => ({ ...prev, ignoreMutedChats: e.target.checked }))}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-slate-800 border-white/20"
              />
            </div>

            {/* Quét nhanh tin nhắn chưa đọc */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  onScanRecentUnread();
                  alert('Đang kích hoạt quét và tự động trả lời tất cả các tin nhắn chưa đọc...');
                }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold border border-blue-500/30 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Quét & trả lời tất cả tin nhắn chưa đọc ngay bây giờ
              </button>
            </div>
          </div>

          {/* Section 2: Thời gian & Giả lập người thật */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Độ trễ & Giả lập thao tác người thật
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Thời gian suy nghĩ trước khi gõ (Giây)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={form.replyDelaySeconds}
                  onChange={(e) => setForm((prev) => ({ ...prev, replyDelaySeconds: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Tốc độ gõ phím mỗi ký tự (ms)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={10}
                    max={200}
                    value={form.minKeystrokeDelay}
                    onChange={(e) => setForm((prev) => ({ ...prev, minKeystrokeDelay: parseInt(e.target.value, 10) || 25 }))}
                    className="w-1/2 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                    placeholder="Min"
                  />
                  <span className="text-slate-500">-</span>
                  <input
                    type="number"
                    min={20}
                    max={400}
                    value={form.maxKeystrokeDelay}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxKeystrokeDelay: parseInt(e.target.value, 10) || 75 }))}
                    className="w-1/2 bg-slate-950 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Cấu hình Gemini AI */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Cấu hình Google Gemini AI
            </h4>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Mô hình AI (Model)</label>
              <select
                value={form.geminiModel}
                onChange={(e) => setForm((prev) => ({ ...prev, geminiModel: e.target.value }))}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="gemini-3.8-flash">Google Gemini 3.8 Flash (Mới nhất, siêu nhanh & thông minh)</option>
                <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Tốc độ cao, ổn định)</option>
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Phản hồi nhanh)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Gemini API Key</label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.geminiApiKey}
                  onChange={(e) => setForm((prev) => ({ ...prev, geminiApiKey: e.target.value }))}
                  placeholder="Nhập API Key của bạn..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 text-slate-400 hover:text-white"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Hướng dẫn bổ sung cho AI (Prompt bổ sung)</label>
              <textarea
                rows={2}
                value={form.systemPromptOverride || ''}
                onChange={(e) => setForm((prev) => ({ ...prev, systemPromptOverride: e.target.value }))}
                placeholder="VD: Không nhận đặt hàng trước 8h sáng, luôn khuyên khách gọi hotline..."
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Section 4: Danh sách Loại trừ (Blacklist) */}
          <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              Danh sách Loại trừ (Không bao giờ tự động trả lời)
            </h4>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddBlacklist();
                  }
                }}
                placeholder="Nhập tên hoặc số điện thoại cần loại trừ..."
                className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleAddBlacklist}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Thêm
              </button>
            </div>

            {form.blacklist && form.blacklist.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.blacklist.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => handleRemoveBlacklist(item)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">Cài đặt được lưu vĩnh viễn trên máy chủ</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              {isSavedNotice ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{isSavedNotice ? 'Đã lưu!' : 'Lưu Cài Đặt'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
