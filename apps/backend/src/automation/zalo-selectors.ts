/**
 * Các DOM Selectors của Zalo Web (chat.zalo.me).
 * Bao gồm selectors cho thanh danh sách cuộc trò chuyện, tìm kiếm, khung chat và thông tin người dùng.
 */
export const ZaloSelectors = {
  // 1. Màn hình xác thực & QR Code
  QR_CONTAINER: '.qrcode-img, .qr-container, canvas, [data-translate-inner="STR_QR_CODE"]',
  QR_IMAGE: '.qrcode-img img, .qr-container img, canvas',
  LOGIN_SUCCESS_INDICATOR: '#chat-list-container, #main-tab, .nav__tabs, .conv-list, #contact-search-input',

  // 2. Ô tìm kiếm Zalo
  SEARCH_INPUT: '#contact-search-input, input[placeholder*="Tìm kiếm"], .input-search, [data-id="search-input"]',
  SEARCH_CLEAR_BTN: '.search-clear-btn, .btn-clear-search',

  // 3. Danh sách cuộc trò chuyện bên cột trái
  CONVERSATION_CONTAINER: '#chat-list-container, .conv-list, .virtualized-scroll',
  CONVERSATION_ITEM: '.conv-item, .chat-item, [id^="conv-item-"], div[tabindex="0"].conv-item',
  CONVERSATION_TITLE: '.conv-item-title, .truncate, .chat-item-title, .name',
  CONVERSATION_SUBTITLE: '.conv-item-subtitle, .desc, .chat-item-subtitle, .last-msg',
  CONVERSATION_AVATAR: 'img.avatar-img, .avatar img, img',
  CONVERSATION_TIME: '.time, .conv-item-time',
  CONVERSATION_BADGE: '.unread-badge, .badge, [class*="unread"]',

  // 4. Khung chat chính bên phải
  CHAT_VIEW_CONTAINER: '#chatViewContainer, .chat-view-container',
  CHAT_HEADER_NAME: '.header-title, .chat-info-name, .user-name, .header-user-name',
  MESSAGE_LIST: '#message-view, .chat-message-list, [data-id="chat-message-list"]',
  MESSAGE_ROW: '.msg-item, .chat-message-item, [id^="msg-"], .card--text',
  MESSAGE_TEXT: '.content-text, .msg-text, .bubble-text',
  SENDER_NAME: '.sender-name, .msg-sender, .user-name',

  // 5. Ô nhập liệu & Nút gửi
  CHAT_INPUT: '#chat-input-content, div[contenteditable="true"], .rich-input',
  SEND_BUTTON: '.btn-send, [data-translate-title="STR_SEND"]',
};
