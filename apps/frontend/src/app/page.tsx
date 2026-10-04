'use client';

import React, { useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { SidebarNav } from '../components/SidebarNav';
import { ConversationList } from '../components/ConversationList';
import { ChatArea } from '../components/ChatArea';
import { PersonaTrainer } from '../components/PersonaTrainer';
import { QrModal } from '../components/QrModal';
import { ContactInfoModal } from '../components/ContactInfoModal';
import { SettingsModal } from '../components/SettingsModal';

export default function ZaloApp() {
  const {
    isConnected,
    status,
    qrCode,
    isAiEnabled,
    isGlobalAutoReply,
    settings,
    isAiTyping,
    messages,
    conversations,
    activeConversation,
    accounts,
    activeAccount,
    toggleAi,
    toggleGlobalAi,
    updateSettings,
    scanRecentUnread,
    sendManualMessage,
    selectConversation,
    searchZalo,
    switchAccount,
    addAccount,
    logoutCurrentAccount,
    refreshQr,
    getPersonaData,
    submitInterview,
  } = useSocket();

  const [activeTab, setActiveTab] = useState<'chat' | 'persona'>('chat');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Hiển thị modal QR khi trạng thái là WAITING_QR hoặc khi người dùng chủ động mở
  const shouldShowQr = isQrModalOpen || status === 'WAITING_QR';

  return (
    <div className="h-screen w-screen flex bg-[#060911] text-slate-100 overflow-hidden font-sans">
      {/* Cột 1: Thanh điều hướng dọc & Multi-Account Switcher & Cài đặt */}
      <SidebarNav
        accounts={accounts}
        activeAccount={activeAccount}
        status={status}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSwitchAccount={switchAccount}
        onAddAccount={addAccount}
        onLogout={logoutCurrentAccount}
        onOpenQr={() => setIsQrModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Nội dung chính */}
      <div className="flex-1 flex h-full overflow-hidden">
        {activeTab === 'chat' ? (
          <>
            {/* Cột 2: Danh sách hội thoại & Tìm kiếm kiểu Zalo & Tự động trả lời 100% */}
            <ConversationList
              conversations={conversations}
              activeConversation={activeConversation}
              isGlobalAutoReply={isGlobalAutoReply}
              onToggleGlobalAi={toggleGlobalAi}
              onScanRecentUnread={scanRecentUnread}
              onSelectConversation={selectConversation}
              onSearch={searchZalo}
            />

            {/* Cột 3: Khung chat chính, thông tin người dùng & Ô nhập liệu */}
            <ChatArea
              activeConversation={activeConversation}
              messages={messages}
              isAiEnabled={isAiEnabled}
              isAiTyping={isAiTyping}
              onSendMessage={sendManualMessage}
              onToggleAi={toggleAi}
              onOpenInfo={() => setIsContactInfoOpen(true)}
              onLogout={logoutCurrentAccount}
            />
          </>
        ) : (
          /* Tab Huấn luyện Giọng điệu AI (Persona) */
          <div className="flex-1 overflow-y-auto p-6 bg-[#090d16]">
            <PersonaTrainer
              onGetPersonaData={getPersonaData}
              onSubmitInterview={submitInterview}
            />
          </div>
        )}
      </div>

      {/* Modal Quét Mã QR */}
      <QrModal
        isOpen={shouldShowQr}
        qrCode={qrCode}
        onClose={() => setIsQrModalOpen(false)}
        onRefresh={refreshQr}
      />

      {/* Modal Thông Tin Người Dùng & Đăng Xuất */}
      <ContactInfoModal
        isOpen={isContactInfoOpen}
        conversation={activeConversation}
        isAiEnabled={isAiEnabled}
        onClose={() => setIsContactInfoOpen(false)}
        onToggleAi={toggleAi}
        onLogout={logoutCurrentAccount}
      />

      {/* Modal Cài Đặt Hệ Thống & Tự Động Trả Lời 100% */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateSettings}
        onScanRecentUnread={scanRecentUnread}
      />
    </div>
  );
}
