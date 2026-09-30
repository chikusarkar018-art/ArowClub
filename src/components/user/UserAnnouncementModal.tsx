import React, { useState } from 'react';
import { X, Megaphone, ArrowRight, Sparkles, AlertCircle } from 'lucide-react';

interface UserAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: {
    title?: string;
    message?: string;
    imageUrl?: string;
    buttonText?: string;
    actionUrl?: string;
  };
  onNavigateAction?: (url: string) => void;
}

export const UserAnnouncementModal: React.FC<UserAnnouncementModalProps> = ({
  isOpen,
  onClose,
  announcement,
  onNavigateAction,
}) => {
  const [noMoreToday, setNoMoreToday] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (noMoreToday) {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        localStorage.setItem('announcement_popup_dismissed_date', todayStr);
      } catch {}
    }
    onClose();
  };

  const handleAction = () => {
    handleClose();
    if (announcement.actionUrl && onNavigateAction) {
      onNavigateAction(announcement.actionUrl);
    }
  };

  return (
    <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[390px] bg-gradient-to-b from-[#181a28] via-[#0f111a] to-[#08090f] border border-[#f5c443]/45 rounded-3xl text-white shadow-[0_15px_50px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Ambient Golden Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-20 bg-gradient-to-b from-amber-400/20 via-[#f5c443]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="px-4 py-3 flex items-center justify-between border-b border-amber-500/20 relative z-10 bg-[#121422]/90 backdrop-blur-sm">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-amber-400 to-[#f5c443] flex items-center justify-center text-black shadow-md shrink-0">
              <Megaphone className="w-4 h-4 fill-black stroke-black" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#f5c443] to-yellow-300 truncate">
              {announcement.title || 'Official Announcement'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition shrink-0 ml-2 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Perfect Fixed-Ratio Banner Image Container (16:9 aspect ratio standard, max 195px height) */}
        {announcement.imageUrl && (
          <div className="w-full relative bg-black/60 border-b border-amber-500/20 shrink-0 aspect-[16/9] max-h-[195px] overflow-hidden flex items-center justify-center">
            <img
              src={announcement.imageUrl}
              alt={announcement.title || 'Announcement Banner'}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/banners/bonus_100.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f111a] via-transparent to-transparent opacity-60 pointer-events-none" />
          </div>
        )}

        {/* Message Content (Scrollable if lengthy) */}
        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {announcement.title && (
            <div className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{announcement.title}</span>
            </div>
          )}
          <p className="text-xs text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
            {announcement.message || 'Welcome to ArowClub! Enjoy thrilling games, fast deposits, and instant 24/7 withdrawals.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#0a0c14] border-t border-amber-500/25 flex items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noMoreToday}
              onChange={(e) => setNoMoreToday(e.target.checked)}
              className="w-4 h-4 rounded border-amber-500/50 text-[#f5c443] focus:ring-0 bg-[#121422] cursor-pointer accent-[#f5c443]"
            />
            <span className="text-[11px] text-zinc-300 font-medium hover:text-white transition">
              No more reminders today
            </span>
          </label>

          <button
            onClick={handleAction}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-[#f5c443] to-yellow-400 hover:brightness-110 active:scale-95 text-black font-black text-xs tracking-wide shadow-[0_2px_12px_rgba(245,196,67,0.3)] transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>{announcement.buttonText || 'Got It / Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Close Button */}
      <button
        onClick={handleClose}
        className="mt-3.5 w-9 h-9 rounded-full bg-black/80 hover:bg-black border border-[#f5c443]/80 text-[#f5c443] hover:text-white flex items-center justify-center shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer z-50"
        title="Close"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};

