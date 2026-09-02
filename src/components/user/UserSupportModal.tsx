import React, { useState, useEffect, useRef } from 'react';
import {
  X, Headphones, Send, Bot, ShieldCheck, User, Image, Video,
  AlertCircle, ArrowUpRight, CheckCheck, Loader2, Sparkles, RefreshCw,
  MessageCircle, Users, ExternalLink, Paperclip, FileText, Download
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { SupportTicket, SupportMessage } from '../../types.js';

interface UserSupportModalProps {
  onClose: () => void;
  supportTelegram?: string;
  supportWhatsapp?: string;
}

export const UserSupportModal: React.FC<UserSupportModalProps> = ({
  onClose,
  supportTelegram = '@ArowClubSupport',
  supportWhatsapp = '+91 98765 43210',
}) => {
  const { user, showToast } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'chat' | 'channels'>('chat');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'file';
    fileName?: string;
  } | null>(null);
  const [socialSettings, setSocialSettings] = useState<{
    whatsappSupport?: string;
    telegramSupport?: string;
    whatsappLink?: string;
    telegramChannel?: string;
    whatsappGroup?: string;
    supportBannerText?: string;
  }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch public settings for dynamic social links
  const loadPlatformSocial = async () => {
    try {
      const res = await api.getPublicPlatformSettings();
      if (res?.settings) {
        setSocialSettings({
          whatsappSupport: res.settings.whatsappSupport,
          telegramSupport: res.settings.telegramSupport,
          whatsappLink: res.settings.whatsappLink,
          telegramChannel: res.settings.telegramChannel,
          whatsappGroup: res.settings.whatsappGroup,
          supportBannerText: res.settings.supportBannerText,
        });
      }
    } catch (err) {
      console.error('Failed to load social settings:', err);
    }
  };

  // Fetch or create user chat ticket
  const loadChat = async () => {
    try {
      const res = await api.getMySupportChat();
      if (res?.ticket) {
        setTicket(res.ticket);
      }
    } catch (err) {
      console.error('Failed to load support chat:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlatformSocial();
    loadChat();
    const interval = setInterval(loadChat, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  // Handle file select (image, video, or document/file)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      showToast('File size must be less than 15MB', 'error');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    const type: 'image' | 'video' | 'file' = isVideo ? 'video' : isImage ? 'image' : 'file';

    const reader = new FileReader();
    reader.onload = () => {
      setMediaPreview({
        url: reader.result as string,
        type,
        fileName: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  // Send message to AI / Admin
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !mediaPreview) || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const payload: any = {
        message: inputText.trim(),
        mediaUrl: mediaPreview?.url,
        mediaType: mediaPreview?.type,
        fileName: mediaPreview?.fileName,
      };

      const res = await api.sendSupportMessage(payload);
      if (res?.ticket) {
        setTicket(res.ticket);
        setInputText('');
        setMediaPreview(null);
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setSendError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Connect directly to live admin
  const handleEscalateToAdmin = async () => {
    if (escalating) return;
    setEscalating(true);
    try {
      const res = await api.escalateSupportToAdmin();
      if (res?.ticket) {
        setTicket(res.ticket);
      }
    } catch (err) {
      console.error('Failed to escalate:', err);
    } finally {
      setEscalating(false);
    }
  };

  const currentWhatsappNumber = socialSettings.whatsappSupport || supportWhatsapp;
  const currentTelegramUsername = socialSettings.telegramSupport || supportTelegram;
  const directWhatsappLink = socialSettings.whatsappLink || `https://wa.me/${currentWhatsappNumber.replace(/[^0-9]/g, '')}`;
  const directTelegramLink = currentTelegramUsername.startsWith('http') 
    ? currentTelegramUsername 
    : `https://t.me/${currentTelegramUsername.replace('@', '')}`;

  const quickQuestions = language === 'hi' ? [
    'Recharge/Deposit कैसे करें?',
    'Withdrawal कब तक आएगा?',
    'Mines गेम कैसे खेलें?',
    'Live Admin से बात करनी है'
  ] : [
    'How to Recharge / Deposit?',
    'When will Withdrawal arrive?',
    'How to play Mines game?',
    'Connect to Live Admin'
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#121524] border border-[#f5c443]/30 rounded-2xl sm:rounded-3xl max-w-md w-full h-[90vh] max-h-[720px] flex flex-col text-white shadow-2xl overflow-hidden relative">
        {/* Top Header */}
        <div className="p-3.5 sm:p-4 border-b border-white/10 bg-[#161a2e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443]">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm text-white">{t('support_desk', '24/7 VIP Support')}</h3>
                {ticket?.escalatedToAdmin ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE ADMIN
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI AGENT
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400">
                {ticket?.escalatedToAdmin ? 'Connected to live officer' : 'AI Assistant Active • Instant Replies'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadChat}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-white/10 bg-[#121524] text-xs font-bold">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'chat' ? 'text-[#f5c443] border-b-2 border-[#f5c443] bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI & Live Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'channels' ? 'text-[#f5c443] border-b-2 border-[#f5c443] bg-white/5' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Official Links</span>
          </button>
        </div>

        {/* Content View */}
        {activeTab === 'channels' ? (
          <div className="p-4 overflow-y-auto space-y-3.5 text-xs flex-1">
            <div className="bg-[#181c33] p-3.5 rounded-2xl border border-white/10 text-center">
              <div className="w-11 h-11 rounded-full bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center mx-auto mb-2 text-[#f5c443]">
                <Headphones className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Official Social & Support Links</h4>
              <p className="text-zinc-400 text-[11px] mt-1">
                {socialSettings.supportBannerText || 'Direct hotline channels for deposits, withdrawal queries, and VIP community bonus codes.'}
              </p>
            </div>

            <div className="space-y-2.5">
              {/* WhatsApp Support */}
              <a
                href={directWhatsappLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl transition group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">WhatsApp Customer Care</div>
                    <div className="text-[11px] text-[#25D366] font-mono">{currentWhatsappNumber}</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition" />
              </a>

              {/* Telegram VIP Support */}
              <a
                href={directTelegramLink}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-[#0088cc]/20 hover:border-[#0088cc]/50 rounded-2xl transition group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0088cc]/20 border border-[#0088cc]/40 flex items-center justify-center text-[#0088cc]">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Telegram 24/7 Support</div>
                    <div className="text-[11px] text-[#0088cc] font-mono">{currentTelegramUsername}</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#0088cc] transition" />
              </a>

              {/* Telegram Channel */}
              {socialSettings.telegramChannel && (
                <a
                  href={socialSettings.telegramChannel.startsWith('http') ? socialSettings.telegramChannel : `https://${socialSettings.telegramChannel}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-purple-500/20 hover:border-purple-500/50 rounded-2xl transition group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">Official Telegram Channel</div>
                      <div className="text-[11px] text-purple-300 truncate max-w-[200px]">{socialSettings.telegramChannel}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition" />
                </a>
              )}

              {/* WhatsApp Group */}
              {socialSettings.whatsappGroup && (
                <a
                  href={socialSettings.whatsappGroup.startsWith('http') ? socialSettings.whatsappGroup : `https://${socialSettings.whatsappGroup}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-emerald-500/20 hover:border-emerald-500/50 rounded-2xl transition group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">VIP WhatsApp Community Group</div>
                      <div className="text-[11px] text-emerald-300 truncate max-w-[200px]">{socialSettings.whatsappGroup}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-emerald-400 transition" />
                </a>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d101c]">
            {/* Escalation bar */}
            {!ticket?.escalatedToAdmin && (
              <div className="px-3.5 py-2 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-b border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-[11px] text-amber-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Need human help?
                </span>
                <button
                  onClick={handleEscalateToAdmin}
                  disabled={escalating}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-[11px] hover:bg-amber-400 transition flex items-center gap-1 shadow-sm"
                >
                  {escalating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Talk to Live Admin'}
                </button>
              </div>
            )}

            {/* Chat message timeline */}
            <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-zinc-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#f5c443]" />
                  <span>Loading support chat...</span>
                </div>
              ) : (
                ticket?.messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  const isAi = msg.sender === 'ai';
                  const isAdmin = msg.sender === 'admin';
                  const isSystem = msg.sender === 'system';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400">
                        {isUser ? (
                          <span>You</span>
                        ) : isAi ? (
                          <span className="text-cyan-400 font-bold flex items-center gap-1">
                            <Bot className="w-3 h-3" /> AI Assistant
                          </span>
                        ) : isAdmin ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Admin Officer ({msg.username})
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold">System Notice</span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-md ${
                          isUser
                            ? 'bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-black font-semibold rounded-tr-sm'
                            : isAi
                            ? 'bg-[#181f3a] text-zinc-100 border border-cyan-500/20 rounded-tl-sm'
                            : isAdmin
                            ? 'bg-[#182a24] text-emerald-100 border border-emerald-500/30 rounded-tl-sm'
                            : 'bg-amber-500/15 text-amber-200 border border-amber-500/30 rounded-xl'
                        }`}
                      >
                        {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}

                        {/* Media rendering */}
                        {msg.mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/20 bg-black/40">
                            {msg.mediaType === 'video' ? (
                              <video
                                src={msg.mediaUrl}
                                controls
                                className="w-full max-h-48 rounded-lg object-contain"
                              />
                            ) : msg.mediaType === 'file' ? (
                              <div className="p-2.5 flex items-center justify-between gap-2 bg-[#121524] rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-5 h-5 text-[#f5c443] shrink-0" />
                                  <span className="text-xs text-zinc-200 font-mono truncate">
                                    {msg.fileName || 'Shared Document / Receipt'}
                                  </span>
                                </div>
                                <a
                                  href={msg.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={msg.fileName || 'document'}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-[#f5c443] hover:text-black text-zinc-300 transition shrink-0 flex items-center gap-1 text-[11px] font-bold"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </a>
                              </div>
                            ) : (
                              <img
                                src={msg.mediaUrl}
                                alt="Attachment"
                                className="w-full max-h-48 rounded-lg object-contain cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Question Chips */}
            <div className="px-3 py-1.5 bg-[#121524] border-t border-white/5 flex gap-1.5 overflow-x-auto no-scrollbar">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(q);
                  }}
                  className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-[#f5c443]/15 hover:text-[#f5c443] border border-white/10 text-[11px] text-zinc-300 whitespace-nowrap transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Error Notification */}
            {sendError && (
              <div className="px-3 py-1.5 bg-rose-500/15 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-[11px]">{sendError}</span>
                </div>
                <button
                  onClick={() => setSendError(null)}
                  className="text-rose-400 hover:text-rose-200 text-xs ml-2"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Media Attachment Preview */}
            {mediaPreview && (
              <div className="px-3 py-2 bg-[#161a2e] border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mediaPreview.type === 'video' ? (
                    <Video className="w-4 h-4 text-emerald-400" />
                  ) : mediaPreview.type === 'file' ? (
                    <FileText className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Image className="w-4 h-4 text-cyan-400" />
                  )}
                  <span className="text-[11px] text-zinc-200 truncate max-w-[200px]">
                    {mediaPreview.fileName || (mediaPreview.type === 'video' ? 'Video attached' : 'Photo attached')}
                  </span>
                </div>
                <button
                  onClick={() => setMediaPreview(null)}
                  className="text-zinc-400 hover:text-rose-400 text-xs"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-[#161a2e] border-t border-white/10 flex items-center gap-2"
            >
              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.zip"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-[#f5c443] transition shrink-0"
                title="Attach photo, video or receipt file"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  ticket?.escalatedToAdmin
                    ? 'Message Live Admin Desk...'
                    : 'Ask AI Assistant or type your issue...'
                }
                className="flex-1 h-10 px-3.5 bg-[#0d101c] border border-white/10 focus:border-[#f5c443] rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !mediaPreview) || sending}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d48b0c] hover:brightness-110 active:scale-95 text-black font-black flex items-center justify-center disabled:opacity-40 transition shrink-0 shadow-md"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
