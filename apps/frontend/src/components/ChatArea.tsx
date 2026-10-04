'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ConversationItem, MessageItem } from '../hooks/useSocket';
import { Send, Bot, User, Sparkles, Info, LogOut, MessageSquare, ShieldCheck } from 'lucide-react';

interface ChatAreaProps {
  activeConversation: ConversationItem | null;
  messages: MessageItem[];
  isAiEnabled: boolean;
  isAiTyping: boolean;
  onSendMessage: (text: string) => void;
  onToggleAi: (enabled: boolean) => void;
  onOpenInfo: () => void;
  onLogout: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  activeConversation,
  messages,
  isAiEnabled,
  isAiTyping,
  onSendMessage,
  onToggleAi,
  onOpenInfo,
  onLogout,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const safeMessages = Array.isArray(messages) ? messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [safeMessages.length, isAiTyping]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d1117] p-8 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 shadow-xl">
          <MessageSquare className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-lg font-bold text-white">Chào mừng bạn đến với Zalo AI Assistant</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-sm">
          Hãy chọn một cuộc trò chuyện ở danh sách bên trái để xem tin nhắn và điều khiển AI tự động trả lời.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d1117]">
      {/* Header cuộc trò chuyện */}
      <div className="h-16 px-6 border-b border-white/10 glass-panel flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            {activeConversation.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeConversation.avatar}
                alt={activeConversation.name}
                className="w-10 h-10 rounded-full object-cover border border-white/10"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white text-sm">
                {activeConversation.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d1117]" />
          </div>

          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              {activeConversation.name}
            </h3>
            <p className="text-[11px] text-slate-400">
              Đang hoạt động trên Zalo Web
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex items-center gap-3">
          {/* Toggle AI Auto-Reply */}
          <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/10">
            <Sparkles className={`w-3.5 h-3.5 ${isAiEnabled ? 'text-indigo-400' : 'text-slate-500'}`} />
            <span className="text-xs font-medium text-slate-300 hidden md:inline">
              {isAiEnabled ? 'AI Tự Động' : 'Thủ Công'}
            </span>
            <button
              type="button"
              onClick={() => onToggleAi(!isAiEnabled)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isAiEnabled ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAiEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Nút Xem thông tin người dùng */}
          <button
            onClick={onOpenInfo}
            title="Xem thông tin người dùng"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Nút Đăng xuất tài khoản này */}
          <button
            onClick={onLogout}
            title="Đăng xuất tài khoản Zalo này"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng xuất</span>
          </button>
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
        {safeMessages.length === 0 ? (
          <div className="m-auto flex flex-col items-center justify-center text-center text-slate-500 max-w-sm">
            <ShieldCheck className="w-8 h-8 text-blue-400 mb-2 opacity-60" />
            <p className="text-xs font-semibold text-slate-300">Cuộc trò chuyện đã sẵn sàng</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Gõ tin nhắn bên dưới để nhắn trực tiếp tới khách hàng, hoặc chờ tin nhắn mới để AI tự động phản hồi.
            </p>
          </div>
        ) : (
          safeMessages.map((msg, idx) => {
            const isAi = msg.senderName.includes('AI') || msg.senderName.includes('Gemini');

            return (
              <div
                key={msg.id ? `${msg.id}_${idx}` : `msg_${idx}`}
                className={`flex flex-col max-w-[75%] ${
                  msg.isSelf ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {isAi ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <Sparkles className="w-3 h-3" /> Gemini AI (Tự động)
                    </span>
                  ) : msg.isSelf ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      <User className="w-3 h-3" /> Bạn (Thủ công)
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-300">
                      {msg.senderName}
                    </span>
                  )}
                  <span className="text-[10px] text-slate-500">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isAi
                      ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 text-indigo-100'
                      : msg.isSelf
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}

        {isAiTyping && (
          <div className="self-start flex items-center gap-2 bg-indigo-950/40 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs text-indigo-300 animate-pulse">
            <Bot className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>AI đang gõ phím trả lời theo phong cách của bạn...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/10 glass-panel flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Nhắn tin tới ${activeConversation.name}... (Enter để gửi)`}
          className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
};
