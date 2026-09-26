import React, { useState, useEffect, useRef } from 'react';
import {
  X, Headphones, Send, Bot, ShieldCheck, User, Image, Video,
  AlertCircle, ArrowUpRight, CheckCheck, Loader2, Sparkles, RefreshCw,
  ExternalLink, Paperclip, FileText, Download, CheckCircle2, History, PlusCircle
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
}) => {
  const { user, showToast } = useAuth();
  const { t, language } = useLanguage();

  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'channels'>('chat');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [historyTickets, setHistoryTickets] = useState<SupportTicket[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryTicket, setSelectedHistoryTicket] = useState<SupportTicket | null>(null);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'file';
    fileName?: string;
  } | null>(null);
  const [socialSettings, setSocialSettings] = useState<{
    telegramSupport?: string;
    telegramChannel?: string;
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
          telegramSupport: res.settings.telegramSupport,
          telegramChannel: res.settings.telegramChannel,
          supportBannerText: res.settings.supportBannerText,
        });
      }
    } catch (err) {
      console.error('Failed to load social settings:', err);
    }
  };

  // Fetch or create user active chat ticket
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

  // Fetch completed / resolved history
  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.getMySupportHistory();
      if (res?.tickets) {
        setHistoryTickets(res.tickets);
        if (res.tickets.length > 0 && !selectedHistoryTicket) {
          setSelectedHistoryTicket(res.tickets[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load support history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadPlatformSocial();
    loadChat();
    const interval = setInterval(() => {
      if (activeTab === 'chat') {
        loadChat();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  // Handle file select (image, video, or document/file)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

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

  // Send message or file to support
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !mediaPreview) || sending) return;

    setSending(true);
    setSendError(null);

    try {
      const res = await api.sendSupportMessage({
        message: inputText.trim() || undefined,
        mediaUrl: mediaPreview?.url,
        mediaType: mediaPreview?.type,
        fileName: mediaPreview?.fileName,
      });

      if (res?.success && res.ticket) {
        setTicket(res.ticket);
        setInputText('');
        setMediaPreview(null);
      } else {
        setSendError(res?.error || 'Failed to send message');
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error while sending');
    } finally {
      setSending(false);
    }
  };

  // Escalate to human admin desk
  const handleEscalateToAdmin = async () => {
    setEscalating(true);
    try {
      const res = await api.escalateSupportToAdmin();
      if (res?.success && res.ticket) {
        setTicket(res.ticket);
        showToast('Connected to 24/7 Live Admin Desk!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to connect to human agent', 'error');
    } finally {
      setEscalating(false);
    }
  };

  // Mark Chat as Done / Resolved
  const handleDoneTicket = async () => {
    if (!ticket) return;
    setClosing(true);
    try {
      const res = await api.resolveUserSupportTicket(ticket.id);
      if (res?.success) {
        showToast('चैट सफलतापूर्वक समाप्त (Done) हो गई है और हिस्ट्री में सहेज ली गई है!', 'success');
        setTicket(res.ticket);
        loadHistory();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to complete chat', 'error');
    } finally {
      setClosing(false);
    }
  };

  // Start fresh chat session
  const handleStartNewChat = async () => {
    setStartingNew(true);
    try {
      const res = await api.startNewUserSupportChat();
      if (res?.success && res.ticket) {
        setTicket(res.ticket);
        setActiveTab('chat');
        showToast('नया सहायता सत्र शुरू किया गया है!', 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to start new chat', 'error');
    } finally {
      setStartingNew(false);
    }
  };

  const directTelegramLink =
    socialSettings.telegramSupport ||
    (supportTelegram.startsWith('http') ? supportTelegram : `https://t.me/${supportTelegram.replace('@', '')}`);

  const quickQuestions = [
    'Recharge (Deposit) help',
    'Withdrawal status query',
    'Bank account change',
    'Game rules & multiplier',
    'VIP Level & bonus inquiry',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg h-[90vh] max-h-[720px] bg-[#0f1220] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-[#161a2e] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#f5c443] to-[#d48b0c] flex items-center justify-center text-black font-black shadow-lg">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white tracking-wide">
                  24/7 VIP Helpdesk
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-zinc-400">
                AI Assistant & 24/7 Live Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                if (activeTab === 'history') loadHistory();
                else loadChat();
              }}
              className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
              title="Refresh Chat"
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
              activeTab === 'chat'
                ? 'text-[#f5c443] border-b-2 border-[#f5c443] bg-white/5'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>सक्रिय चैट (Active Chat)</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'text-[#f5c443] border-b-2 border-[#f5c443] bg-white/5'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>चैट हिस्ट्री (History)</span>
          </button>

          <button
            onClick={() => setActiveTab('channels')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
              activeTab === 'channels'
                ? 'text-[#f5c443] border-b-2 border-[#f5c443] bg-white/5'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>आधिकारिक लिंक (Channels)</span>
          </button>
        </div>

        {/* ====================== TAB: OFFICIAL CHANNELS ====================== */}
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
              {/* In-App Live Support Desk */}
              <button
                onClick={() => setActiveTab('chat')}
                className="w-full text-left flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-amber-500/20 hover:border-amber-500/50 rounded-2xl transition group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#f5c443]/20 border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443]">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">24/7 In-App Live Desk</div>
                    <div className="text-[11px] text-amber-300 font-mono">Instant Support & Human Escalation</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-amber-400 transition" />
              </button>

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
                    <div className="font-bold text-white text-xs">Telegram VIP 24/7 Support</div>
                    <div className="text-[11px] text-[#0088cc] font-mono">@ArowClubSupport</div>
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
                      <div className="font-bold text-white text-xs">Official Telegram Broadcast</div>
                      <div className="text-[11px] text-purple-300 truncate max-w-[200px]">{socialSettings.telegramChannel}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-purple-400 transition" />
                </a>
              )}

              {/* Official Email */}
              <a
                href="mailto:support@arowclub.pro"
                className="flex items-center justify-between p-3.5 bg-[#161a2e] hover:bg-[#1f2542] border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition group shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Official Support Email</div>
                    <div className="text-[11px] text-blue-300 font-mono">support@arowclub.pro</div>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition" />
              </a>
            </div>
          </div>
        ) : activeTab === 'history' ? (
          /* ====================== TAB: CHAT HISTORY ====================== */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d101c]">
            <div className="p-3 bg-[#161a2e] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#f5c443]" />
                <span className="text-xs font-bold text-white">पूर्व चैट हिस्ट्री (Past Resolved Tickets)</span>
              </div>
              <button
                onClick={handleStartNewChat}
                disabled={startingNew}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-black font-bold text-xs flex items-center gap-1.5 hover:brightness-110 transition shadow-sm"
              >
                {startingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                <span>नई चैट (Start New Chat)</span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="flex-1 flex items-center justify-center text-zinc-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#f5c443]" />
                <span>Loading chat history...</span>
              </div>
            ) : historyTickets.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-400">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-zinc-500">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">कोई पूर्व चैट हिस्ट्री नहीं है</h4>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  जब भी आप किसी चैट को &apos;Done&apos; चिह्नित करेंगे, वह यहाँ आपकी हिस्ट्री में सुरक्षित रहेगी।
                </p>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="mt-4 px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition"
                >
                  सक्रिय चैट पर जाएं
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Tickets list sidebar */}
                <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto p-2 space-y-1.5 bg-[#121524]">
                  {historyTickets.map((ht) => (
                    <button
                      key={ht.id}
                      onClick={() => setSelectedHistoryTicket(ht)}
                      className={`w-full text-left p-2.5 rounded-xl border transition text-xs ${
                        selectedHistoryTicket?.id === ht.id
                          ? 'bg-[#f5c443]/15 border-[#f5c443]/40 text-white'
                          : 'bg-[#181c33] border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-[11px] truncate">Ticket #{ht.id.slice(-6)}</span>
                        <span className="text-[10px] text-emerald-400 font-mono">Done</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate">{ht.lastMessage}</p>
                      <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                        {new Date(ht.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Selected ticket messages */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#0d101c]">
                  {selectedHistoryTicket?.messages.map((msg) => {
                    const isUser = msg.sender === 'user';
                    const isAi = msg.sender === 'ai';
                    const isAdmin = msg.sender === 'admin';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-zinc-400">
                          {isUser ? <span>You</span> : isAi ? <span className="text-cyan-400 font-bold">AI</span> : isAdmin ? <span className="text-emerald-400 font-bold">Admin</span> : <span className="text-amber-400 font-bold">System</span>}
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            isUser
                              ? 'bg-amber-500/20 text-amber-100 border border-amber-500/30'
                              : 'bg-[#181f3a] text-zinc-200 border border-white/10'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.message}</p>
                          {msg.mediaUrl && (
                            <div className="mt-2 rounded-xl overflow-hidden border border-black/20 bg-black/40">
                              <img src={msg.mediaUrl} alt="Attachment" className="w-full max-h-40 rounded-lg object-contain" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ====================== TAB: ACTIVE CHAT ====================== */
          <div className="flex-1 flex flex-col overflow-hidden bg-[#0d101c]">
            {/* Top Status & Done Bar */}
            <div className="px-3.5 py-2 bg-gradient-to-r from-[#181c33] to-[#121524] border-b border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {ticket?.status === 'resolved' ? (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> चैट समाप्त (Resolved)
                  </span>
                ) : ticket?.escalatedToAdmin ? (
                  <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold animate-pulse flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Live Admin Desk
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold flex items-center gap-1">
                    <Bot className="w-3 h-3" /> 24/7 AI Desk
                  </span>
                )}

                {!ticket?.escalatedToAdmin && ticket?.status !== 'resolved' && (
                  <button
                    onClick={handleEscalateToAdmin}
                    disabled={escalating}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline transition"
                  >
                    {escalating ? 'Connecting...' : 'Talk to Live Admin'}
                  </button>
                )}
              </div>

              {/* Done Button */}
              {ticket && ticket.status !== 'resolved' ? (
                <button
                  onClick={handleDoneTicket}
                  disabled={closing}
                  className="px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/40 text-emerald-300 hover:text-black font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                  title="इस चैट को समाप्त करें और हिस्ट्री में भेजें"
                >
                  {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Done (समाप्त करें)</span>
                </button>
              ) : (
                <button
                  onClick={handleStartNewChat}
                  disabled={startingNew}
                  className="px-3 py-1 rounded-xl bg-[#f5c443] hover:bg-[#f5c443]/90 text-black font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  {startingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>नई चैट शुरू करें</span>
                </button>
              )}
            </div>

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
                                onClick={() => {
                                  try {
                                    const a = document.createElement('a');
                                    a.href = msg.mediaUrl;
                                    a.target = '_blank';
                                    a.rel = 'noopener noreferrer';
                                    a.click();
                                  } catch {}
                                }}
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
            {ticket?.status !== 'resolved' && (
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
            )}

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

            {/* Chat Input Bar or Resolved Notice */}
            {ticket?.status === 'resolved' ? (
              <div className="p-3 bg-[#161a2e] border-t border-white/10 flex items-center justify-between gap-2">
                <div className="text-xs text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>यह चैट सत्र समाप्त हो चुका है।</span>
                </div>
                <button
                  onClick={handleStartNewChat}
                  disabled={startingNew}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d48b0c] text-black font-bold text-xs hover:brightness-110 transition shadow-md flex items-center gap-1.5"
                >
                  {startingNew ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                  <span>नई चैट शुरू करें</span>
                </button>
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
};
