import React, { useState } from 'react';
import { X, Megaphone, ArrowRight, Sparkles, ExternalLink } from 'lucide-react';

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
    <div className="fixed inset-0 z-[99998] flex flex-col items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-[390px] bg-gradient-to-b from-[#141622] via-[#0d0f17] to-[#07080e] border border-[#f5c443]/40 rounded-3xl text-white shadow-2xl flex flex-col overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-gradient-to-b from-[#f5c443]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

        {/* Top Header */}
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[#f5c443]">
              <Megaphone className="w-4 h-4 animate-bounce" />
            </div>
            <h3 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-[#f5c443] to-amber-400">
              {announcement.title || 'Official Announcement'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Banner Image if available */}
        {announcement.imageUrl && (
          <div className="w-full h-44 bg-black/40 overflow-hidden relative border-b border-white/5">
            <img
              src={announcement.imageUrl}
              alt={announcement.title || 'Announcement'}
              className="w-full h-full object-cover"
              onError={(e) => {
                // fallback if image fails to load
                (e.target as HTMLImageElement).src = '/banners/bonus_100.jpg';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0f17] via-transparent to-transparent opacity-80" />
          </div>
        )}

        {/* Message Content */}
        <div className="p-4 space-y-3">
          <p className="text-xs text-zinc-200 leading-relaxed font-normal whitespace-pre-line">
            {announcement.message || 'Welcome to ArowClub! Enjoy thrilling games, fast deposits, and instant 24/7 withdrawals.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#080910] border-t border-white/10 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={noMoreToday}
              onChange={(e) => setNoMoreToday(e.target.checked)}
              className="w-4 h-4 rounded-full border-zinc-600 text-[#f5c443] focus:ring-0 bg-[#07090e] cursor-pointer accent-[#f5c443]"
            />
            <span className="text-[11px] text-zinc-400">
              Don't show today
            </span>
          </label>

          <button
            onClick={handleAction}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-[#f5c443] hover:brightness-105 active:scale-95 text-black font-black text-xs tracking-wide shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>{announcement.buttonText || 'Got It / Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Floating Bottom Close Button */}
      <button
        onClick={handleClose}
        className="mt-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border-2 border-white/80 text-white flex items-center justify-center shadow-2xl transition hover:scale-110 active:scale-95 cursor-pointer z-50"
        title="Close"
      >
        <X className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
};
