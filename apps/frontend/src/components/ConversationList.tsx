'use client';

import React, { useState, useEffect } from 'react';
import { ConversationItem } from '../hooks/useSocket';
import {
  Search,
  X,
  Users,
  Zap,
  BellOff,
  Phone,
  RotateCcw,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface ConversationListProps {
  conversations: ConversationItem[];
  activeConversation: ConversationItem | null;
  isGlobalAutoReply: boolean;
  onToggleGlobalAi: (enabled: boolean) => void;
  onScanRecentUnread: () => void;
  onSelectConversation: (conv: ConversationItem, index?: number) => void;
  onSearch: (query: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversation,
  isGlobalAutoReply,
  onToggleGlobalAi,
  onScanRecentUnread,
  onSelectConversation,
  onSearch,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [isSearching, setIsSearching] = useState(false);

  // Realtime search với Debounce 250ms
  useEffect(() => {
    setIsSearching(true);
    const handler = setTimeout(() => {
      onSearch(searchQuery);
      setIsSearching(false);
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, onSearch]);

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch('');
  };

  const filtered = conversations.filter((c) => {
    if (filterTab === 'unread' && (!c.unreadCount || c.unreadCount === 0)) return false;
    return true;
  });

  return (
    <div className="w-80 md:w-92 border-r border-white/10 bg-[#090d16] flex flex-col h-full select-none">
      {/* 1. Master Auto-Reply Banner Ở TRÊN CÙNG DANH SÁCH */}
      <div className={`p-3.5 border-b transition-all duration-300 ${
        isGlobalAutoReply
          ? 'bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-blue-500/15 border-amber-500/30'
          : 'bg-slate-900/50 border-white/10'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${
              isGlobalAutoReply ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-white/5 text-slate-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                Tự động trả lời 100%
                {isGlobalAutoReply && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-ping" />
                )}
              </h3>
              <p className="text-[10px] text-slate-400">
                {isGlobalAutoReply
                  ? '🟢 Đang chạy (Trừ hội thoại tắt chuông 🔕)'
                  : 'Phản hồi tất cả tin nhắn mới đến'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onToggleGlobalAi(!isGlobalAutoReply)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isGlobalAutoReply ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isGlobalAutoReply ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isGlobalAutoReply && (
          <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="text-amber-300 font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Auto-Reply 100% Bật
            </span>
            <button
              onClick={onScanRecentUnread}
              title="Quét & trả lời tất cả các tin nhắn chưa đọc gần đây"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Quét tin chưa đọc
            </button>
          </div>
        )}
      </div>

      {/* 2. Thanh Tìm kiếm Zalo theo thời gian thực (Tên & Số điện thoại) */}
      <div className="p-3 border-b border-white/10 flex flex-col gap-2 bg-[#080b13]">
        <div className="relative flex items-center">
          {isSearching ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute left-3 pointer-events-none" />
          ) : (
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          )}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Tên hoặc Số điện thoại..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 p-1 rounded-full text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterTab('all')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'all'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả ({conversations.length})
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filterTab === 'unread'
                ? 'bg-white/10 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Chưa đọc ({conversations.filter((c) => (c.unreadCount || 0) > 0).length})
          </button>
        </div>
      </div>

      {/* 3. Danh sách cuộc trò chuyện */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <Users className="w-8 h-8 mb-2 opacity-50 text-blue-400" />
            <p className="text-xs font-medium">
              {searchQuery ? 'Không tìm thấy kết quả nào' : 'Đang đồng bộ danh sách từ Zalo Web...'}
            </p>
            <p className="text-[11px] text-slate-600 mt-1">
              (Gõ số điện thoại để tìm kiếm người dùng mới trên Zalo)
            </p>
          </div>
        ) : (
          filtered.map((conv, idx) => {
            const isSelected = activeConversation?.id === conv.id || activeConversation?.name === conv.name;
            const isPhoneSearchItem = conv.isGlobalSearch || conv.id.startsWith('phone_');

            return (
              <div
                key={conv.id || idx}
                onClick={() => onSelectConversation(conv, conv.index ?? idx)}
                className={`p-3 flex items-center gap-3 cursor-pointer transition-all ${
                  isPhoneSearchItem
                    ? 'bg-blue-600/10 hover:bg-blue-600/20 border-l-4 border-blue-400'
                    : isSelected
                    ? 'bg-blue-600/20 border-l-4 border-blue-500'
                    : 'hover:bg-white/5'
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {isPhoneSearchItem ? (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                      <Phone className="w-5 h-5" />
                    </div>
                  ) : conv.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={conv.avatar}
                      alt={conv.name}
                      className="w-11 h-11 rounded-full object-cover border border-white/10"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-white font-bold text-sm border border-white/10">
                      {conv.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {conv.isActive && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#090d16]" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-semibold text-white truncate max-w-[130px] flex items-center gap-1">
                      {conv.name}
                    </h4>

                    <div className="flex items-center gap-1">
                      {/* Icon Tắt thông báo 🔕 */}
                      {conv.isMuted && (
                        <span title="Hội thoại này đã tắt thông báo (AI sẽ tự động bỏ qua)">
                          <BellOff className="w-3 h-3 text-slate-500" />
                        </span>
                      )}

                      {conv.time && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {conv.time}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className={`text-xs truncate max-w-[160px] font-normal ${
                      isPhoneSearchItem ? 'text-blue-300 font-medium' : 'text-slate-400'
                    }`}>
                      {conv.lastMessage || 'Chưa có tin nhắn'}
                    </p>

                    {conv.unreadCount && conv.unreadCount > 0 ? (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white min-w-4 text-center">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
