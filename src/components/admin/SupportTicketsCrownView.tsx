import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.js';
import {
  MessageSquare, Send, User, Bot, ShieldCheck, RefreshCw,
  Search, Clock, CheckCircle2, AlertCircle, Image, Video, Sparkles, X, Loader2,
  Paperclip, FileText, Download, Check
} from 'lucide-react';
import { SupportTicket } from '../../types.js';

export const SupportTicketsCrownView: React.FC = () => {
  const { admin, showToast } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'escalated' | 'ai'>('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaPreview, setMediaPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'file';
    fileName?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      const res = await api.getAdminSupportTickets();
      if (res?.tickets) {
        setTickets(res.tickets);
        if (!selectedTicketId && res.tickets.length > 0) {
          setSelectedTicketId(res.tickets[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const interval = setInterval(fetchTickets, 3000);
    return () => clearInterval(interval);
  }, [selectedTicketId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tickets, selectedTicketId]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert('File size must be less than 15MB');
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

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || (!replyText.trim() && !mediaPreview) || sending) return;

    setSending(true);
    try {
      const res = await api.replyAdminSupportTicket(
        selectedTicketId,
        replyText.trim(),
        admin?.username || 'SuperAdmin',
        mediaPreview?.url,
        mediaPreview?.type,
        mediaPreview?.fileName
      );
      if (res?.success) {
        setReplyText('');
        setMediaPreview(null);
        fetchTickets();
      }
    } catch (err: any) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicketId) return;
    try {
      await api.closeAdminSupportTicket(selectedTicketId, admin?.username || 'SuperAdmin');
      showToast?.('Ticket marked as resolved', 'success');
      fetchTickets();
    } catch (err: any) {
      console.error('Failed to resolve ticket:', err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (t.uid && String(t.uid).includes(q)) ||
      (t.username && t.username.toLowerCase().includes(q)) ||
      (t.lastMessage && t.lastMessage.toLowerCase().includes(q));

    if (!matchSearch) return false;
    if (statusFilter === 'escalated') return t.escalatedToAdmin;
    if (statusFilter === 'ai') return !t.escalatedToAdmin;
    return true;
  });

  const unreadEscalatedCount = tickets.filter(t => t.escalatedToAdmin && (t.unreadCountByAdmin || 0) > 0).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-[#121215] border border-[#26262a] rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 relative">
              <MessageSquare className="w-6 h-6" />
              {unreadEscalatedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-[#121215] animate-ping" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                24/7 Live Customer Support & AI Desk
                {unreadEscalatedCount > 0 && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                    🚨 {unreadEscalatedCount} ESCALATED
                  </span>
                )}
              </h1>
              <p className="text-xs text-[#a1a1aa]">
                Reply to customer queries, inspect screenshots/videos, and manage Gemini AI assistant chats in real-time.
              </p>
            </div>
          </div>

          <button
            onClick={fetchTickets}
            className="px-3 py-2 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-xs font-semibold text-[#e0e0e0] hover:border-amber-500/40 hover:text-white flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Desk
          </button>
        </div>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[680px]">
        {/* Tickets List */}
        <div className="lg:col-span-4 bg-[#121215] border border-[#26262a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#26262a] space-y-2.5 bg-[#16161a]">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search UID, username, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 bg-[#1a1a1e] p-1 rounded-xl border border-[#26262a] text-[11px] font-semibold">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-1 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-amber-500 text-black font-black' : 'text-[#a1a1aa] hover:text-white'
                }`}
              >
                All ({tickets.length})
              </button>
              <button
                onClick={() => setStatusFilter('escalated')}
                className={`flex-1 py-1 rounded-lg transition flex items-center justify-center gap-1 ${
                  statusFilter === 'escalated' ? 'bg-rose-500 text-white font-black' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <span>Live Admin</span>
                {unreadEscalatedCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setStatusFilter('ai')}
                className={`flex-1 py-1 rounded-lg transition ${
                  statusFilter === 'ai' ? 'bg-cyan-500 text-black font-black' : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                AI Handled
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#1e1e22]">
            {loading ? (
              <div className="p-8 text-center text-xs text-[#71717a] flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                Loading conversations...
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#71717a]">
                No support tickets found
              </div>
            ) : (
              filteredTickets.map((t) => {
                const isSelected = t.id === selectedTicketId;
                const hasUnread = (t.unreadCountByAdmin || 0) > 0 || t.escalatedToAdmin;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/10 border-l-4 border-amber-500'
                        : 'hover:bg-[#18181c]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#26262a] flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
                          {t.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                            <span>{t.username}</span>
                            <span className="text-[10px] text-[#71717a] font-mono">({t.uid})</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {t.escalatedToAdmin ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" title="Needs Human Support" />
                        ) : (
                          <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" /> AI
                          </span>
                        )}
                        <span className="text-[10px] text-[#71717a] font-mono">
                          {new Date(t.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-[#a1a1aa] truncate mt-1">
                      {t.lastMessage}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-8 bg-[#121215] border border-[#26262a] rounded-2xl flex flex-col overflow-hidden shadow-lg">
          {selectedTicket ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-[#26262a] bg-[#16161a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                    {selectedTicket.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">{selectedTicket.username}</h3>
                      <span className="text-xs text-[#71717a] font-mono">UID: {selectedTicket.uid}</span>
                      {selectedTicket.escalatedToAdmin ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                          🚨 Live Admin Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Handled by Gemini AI
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#a1a1aa] flex items-center gap-2 mt-0.5">
                      <span>Messages: {selectedTicket.messages.length}</span>
                      <span>•</span>
                      <span>Started: {new Date(selectedTicket.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseTicket}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500 hover:text-black text-xs font-bold transition flex items-center gap-1.5"
                    title="Mark ticket as resolved"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0e0e11]">
                {selectedTicket.messages.map((m) => {
                  const isUser = m.sender === 'user';
                  const isAi = m.sender === 'ai';
                  const isAdmin = m.sender === 'admin';
                  const isSys = m.sender === 'system';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] text-[#71717a]">
                        {isUser ? (
                          <span className="text-amber-400 font-semibold">{m.username} (Client)</span>
                        ) : isAi ? (
                          <span className="text-cyan-400 font-semibold flex items-center gap-1">
                            <Bot className="w-3 h-3" /> Gemini AI Agent
                          </span>
                        ) : isAdmin ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Admin Desk ({m.username})
                          </span>
                        ) : (
                          <span className="text-purple-400 font-semibold">System Bot</span>
                        )}
                        <span>•</span>
                        <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-[#1a1a1e] text-[#f4f4f5] border border-[#26262a] rounded-tl-sm'
                            : isAi
                            ? 'bg-[#121c2e] text-cyan-100 border border-cyan-500/30 rounded-tr-sm'
                            : isAdmin
                            ? 'bg-emerald-950/70 text-emerald-100 border border-emerald-500/30 rounded-tr-sm'
                            : 'bg-purple-950/50 text-purple-200 border border-purple-500/30 rounded-xl'
                        }`}
                      >
                        {m.message && <p className="whitespace-pre-wrap">{m.message}</p>}

                        {/* Media rendering in admin view */}
                        {m.mediaUrl && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/30 bg-black/40">
                            {m.mediaType === 'video' ? (
                              <video
                                src={m.mediaUrl}
                                controls
                                className="w-full max-h-56 rounded-lg object-contain"
                              />
                            ) : m.mediaType === 'file' ? (
                              <div className="p-2.5 flex items-center justify-between gap-2 bg-[#16161a] rounded-lg">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                                  <span className="text-xs text-white font-mono truncate">
                                    {m.fileName || 'Shared Document / Receipt'}
                                  </span>
                                </div>
                                <a
                                  href={m.mediaUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  download={m.fileName || 'document'}
                                  className="p-1.5 rounded-lg bg-white/10 hover:bg-amber-500 hover:text-black text-zinc-200 transition shrink-0 flex items-center gap-1 text-[11px] font-bold"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download</span>
                                </a>
                              </div>
                            ) : (
                              <img
                                src={m.mediaUrl}
                                alt="Attachment"
                                className="w-full max-h-56 rounded-lg object-contain cursor-pointer hover:opacity-95"
                                onClick={() => window.open(m.mediaUrl, '_blank')}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {/* Media Preview before send */}
              {mediaPreview && (
                <div className="px-4 py-2 bg-[#1a1a1e] border-t border-[#26262a] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-amber-400">
                    {mediaPreview.type === 'video' ? (
                      <Video className="w-4 h-4" />
                    ) : mediaPreview.type === 'file' ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                    <span className="truncate max-w-[250px]">
                      {mediaPreview.fileName || (mediaPreview.type === 'video' ? 'Video attachment ready' : 'Photo attachment ready')}
                    </span>
                  </div>
                  <button
                    onClick={() => setMediaPreview(null)}
                    className="text-[#71717a] hover:text-rose-400 text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="p-3.5 bg-[#16161a] border-t border-[#26262a] flex items-center gap-2">
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
                  className="p-2.5 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-[#a1a1aa] hover:text-amber-400 hover:border-amber-500/40 transition shrink-0"
                  title="Attach Photo, Video or Document"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder="Type an official admin reply to customer..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 h-10 px-3.5 rounded-xl bg-[#1a1a1e] border border-[#26262a] text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-amber-500/50 transition-colors"
                />

                <button
                  type="submit"
                  disabled={(!replyText.trim() && !mediaPreview) || sending}
                  className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send Reply
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#71717a]">
              <MessageSquare className="w-12 h-12 text-[#26262a] mb-3" />
              <p className="text-sm font-semibold text-[#a1a1aa]">No Conversation Selected</p>
              <p className="text-xs mt-1">Select a ticket from the left panel to reply or view chat history</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
