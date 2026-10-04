'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageItem } from '../hooks/useSocket';
import { Send, Bot, User, Sparkles, MessageCircle } from 'lucide-react';

interface ChatBoxProps {
  messages: MessageItem[];
  isAiTyping: boolean;
  isAiEnabled: boolean;
  onSendMessage: (text: string) => void;
}

export const ChatBox: React.FC<ChatBoxProps> = ({
  messages,
  isAiTyping,
  isAiEnabled,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiTyping]);

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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto p-4 gap-4">
      {/* Khung tin nhắn */}
      <div className="flex-1 glass-panel rounded-2xl p-5 overflow-y-auto flex flex-col gap-4 shadow-xl border border-white/5">
        {messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center justify-center text-center max-w-sm text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-white">Chưa có tin nhắn mới</h3>
            <p className="text-xs text-slate-400 mt-1">
              Hệ thống đang chạy ngầm và lắng nghe tin nhắn từ Zalo Web. Tin nhắn đến và phản hồi sẽ hiển thị trực tiếp tại đây theo thời gian thực.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isAi = msg.senderName.includes('AI');
            const isManualSelf = msg.isSelf && !isAi;

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[80%] ${
                  msg.isSelf ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                {/* Header người gửi */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  {isAi ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      <Sparkles className="w-3 h-3" /> Trợ lý Gemini (Auto)
                    </span>
                  ) : msg.isSelf ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
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

                {/* Bong bóng tin nhắn */}
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                    isAi
                      ? 'bg-gradient-to-r from-indigo-900/60 to-purple-900/60 border border-indigo-500/30 text-indigo-100 shadow-md'
                      : msg.isSelf
                      ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20'
                      : 'bg-slate-800 text-slate-100 rounded-bl-none border border-white/5'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isAiTyping && (
          <div className="self-start flex items-center gap-2 bg-indigo-950/40 border border-indigo-500/30 px-3.5 py-2 rounded-2xl text-xs text-indigo-300 animate-pulse">
            <Bot className="w-4 h-4 text-indigo-400 animate-spin" />
            <span>AI đang soạn tin nhắn phản hồi theo phong cách của bạn...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Thanh gõ tin nhắn */}
      <form onSubmit={handleSend} className="glass-panel p-2 rounded-2xl flex items-center gap-2 border border-white/10">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isAiEnabled
              ? 'AI đang bật chế độ tự động (bạn vẫn có thể gõ để gửi thủ công)...'
              : 'Nhập tin nhắn để gửi trực tiếp qua Zalo (Enter để gửi)...'
          }
          className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
};
