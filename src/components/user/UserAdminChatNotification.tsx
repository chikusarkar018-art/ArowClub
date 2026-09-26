import React, { useEffect, useState, useRef } from 'react';
import { Headphones, MessageCircle, X, ChevronRight, Sparkles } from 'lucide-react';
import { api } from '../../services/api.js';
import { SupportTicket, SupportMessage } from '../../types.js';

interface UserAdminChatNotificationProps {
  isSupportOpen: boolean;
  onOpenSupport: () => void;
  userId?: string;
}

export const UserAdminChatNotification: React.FC<UserAdminChatNotificationProps> = ({
  isSupportOpen,
  onOpenSupport,
  userId,
}) => {
  const [notification, setNotification] = useState<{
    id: string;
    message: string;
    timestamp: string;
    sender: string;
  } | null>(null);

  const lastSeenMsgIdRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  // Play pleasant notification chime
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      
      // Tone 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: A5 (880 Hz) - delayed slightly for melody chime
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.12);
      gain2.gain.setValueAtTime(0, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.3, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.6);
    } catch {
      // Audio might be blocked by browser policy
    }
  };

  const checkForNewAdminMessages = async () => {
    if (!userId) return;
    try {
      const res = await api.getMySupportChat();
      if (res?.ticket && Array.isArray(res.ticket.messages) && res.ticket.messages.length > 0) {
        const messages: SupportMessage[] = res.ticket.messages;
        
        // Find latest message
        const latestMsg = messages[messages.length - 1];

        // On initial load, record the current latest ID so we don't alert old messages
        if (isInitialLoadRef.current) {
          isInitialLoadRef.current = false;
          lastSeenMsgIdRef.current = latestMsg.id;
          
          // Check if there are any unread messages from admin
          if (!isSupportOpen && (latestMsg.sender === 'admin' || latestMsg.sender === 'system') && res.ticket.unreadCountByUser > 0) {
            setNotification({
              id: latestMsg.id,
              message: latestMsg.message || 'Sent an attachment',
              timestamp: latestMsg.timestamp,
              sender: latestMsg.sender === 'admin' ? 'Customer Care / Admin' : 'Support Team',
            });
          }
          return;
        }

        // Subsequent checks: if a new message arrived that was sent by admin/system
        if (
          latestMsg &&
          latestMsg.id !== lastSeenMsgIdRef.current &&
          (latestMsg.sender === 'admin' || latestMsg.sender === 'system')
        ) {
          lastSeenMsgIdRef.current = latestMsg.id;

          // If user currently does not have the support modal open, notify them!
          if (!isSupportOpen) {
            playNotificationSound();
            setNotification({
              id: latestMsg.id,
              message: latestMsg.message || 'Sent an attachment',
              timestamp: latestMsg.timestamp,
              sender: latestMsg.sender === 'admin' ? 'Live Support / Admin' : 'Support Desk',
            });
          }
        }
      }
    } catch (err) {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    if (isSupportOpen) {
      // User opened chat, clear notification
      setNotification(null);
    }
  }, [isSupportOpen]);

  useEffect(() => {
    if (!userId) return;
    checkForNewAdminMessages();
    const interval = setInterval(checkForNewAdminMessages, 3500);
    return () => clearInterval(interval);
  }, [userId, isSupportOpen]);

  if (!notification || isSupportOpen) return null;

  return (
    <div className="fixed top-3 left-3 right-3 z-50 max-w-md mx-auto animate-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0f1320]/95 border-2 border-[#f5c443] rounded-2xl p-3 shadow-[0_10px_35px_rgba(245,196,67,0.45)] backdrop-blur-xl flex items-center justify-between gap-3">
        {/* Left Icon with pulsating ring */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f5c443] to-[#d99b26] flex items-center justify-center text-slate-950 shadow-md">
            <Headphones className="w-5 h-5" />
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#0f1320] animate-pulse" />
        </div>

        {/* Message Info */}
        <div
          onClick={() => {
            setNotification(null);
            onOpenSupport();
          }}
          className="flex-1 min-w-0 cursor-pointer text-left"
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-black text-[#f5c443] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#f5c443]" />
              {notification.sender}
            </span>
            <span className="text-[10px] text-zinc-400">New Reply</span>
          </div>
          <p className="text-xs text-white font-medium truncate leading-tight">
            {notification.message}
          </p>
          <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 mt-0.5">
            Tap to open chat & reply <ChevronRight className="w-3 h-3" />
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              setNotification(null);
              onOpenSupport();
            }}
            className="px-2.5 py-1.5 bg-gradient-to-r from-[#f5c443] to-[#eab308] text-slate-950 text-xs font-black rounded-xl shadow active:scale-95 transition"
          >
            Reply
          </button>
          <button
            onClick={() => setNotification(null)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 flex items-center justify-center active:scale-90 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
