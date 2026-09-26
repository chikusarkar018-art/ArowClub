import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Headphones, Clock, RefreshCw } from 'lucide-react';

interface UserMaintenanceScreenProps {
  maintenance: {
    isEnabled: boolean;
    title?: string;
    message?: string;
    startTime?: string;
    endTime?: string;
    imageUrl?: string;
    bannerUrl?: string;
  };
  onRefresh: () => void;
  onOpenSupport: () => void;
}

export const UserMaintenanceScreen: React.FC<UserMaintenanceScreenProps> = ({
  maintenance,
  onRefresh,
  onOpenSupport,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1200);
  };

  const openTime = maintenance.endTime || '06:18 PM';
  const startTime = maintenance.startTime || '06:16 PM';
  const bgImage = maintenance.imageUrl || maintenance.bannerUrl || '/maintenance_arowclub_bg.jpg';

  return (
    <div className="fixed inset-0 w-full h-full bg-black text-white flex flex-col justify-between overflow-hidden font-sans select-none z-50">
      {/* 1. Full-Page Visual Background Image (Edge to Edge, Perfectly Scaled for Mobile and PC) */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-[#0a0a0f]">
        <img
          src={bgImage}
          alt="ArowClub Website Maintenance"
          className="w-full h-full object-cover object-center sm:object-contain sm:bg-black"
          referrerPolicy="no-referrer"
        />

        {/* Subtle Bottom Vignette so Floating Controls are 100% Crisp & Visible */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/95 via-black/60 to-transparent pointer-events-none" />
      </div>

      {/* Top Floating Mini Refresh Icon */}
      <div className="relative z-10 p-4 flex justify-end">
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          aria-label="Refresh maintenance status"
          className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white hover:text-[#f5c443] hover:border-[#f5c443]/50 flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#f5c443]' : ''}`} />
        </button>
      </div>

      {/* 2. Bottom Floating Action Bar: ONLY Opening Time & Customer Support Button */}
      <div className="relative z-10 w-full max-w-md mx-auto p-4 pb-6 sm:pb-8 flex flex-col gap-3">
        {/* Opening Time Display Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full bg-black/85 backdrop-blur-md border border-[#f5c443]/40 rounded-2xl p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.85)] flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#f5c443]/15 border border-[#f5c443]/30 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-[#f5c443] animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Expected Opening Time
              </div>
              <div className="text-xs text-zinc-500 font-medium">
                Start: <span className="font-mono text-zinc-300">{startTime}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#181a24] border border-[#f5c443]/50 px-3.5 py-1.5 rounded-xl shadow-inner shrink-0">
            <span className="font-mono font-black text-sm sm:text-base text-[#f5c443] tracking-wide">
              {openTime}
            </span>
          </div>
        </motion.div>

        {/* 24/7 VIP Customer Support Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          type="button"
          onClick={onOpenSupport}
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#e5a01e] via-[#f5c443] to-[#ffd769] hover:brightness-110 active:scale-98 text-black font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_8px_25px_rgba(245,196,67,0.4)] flex items-center justify-center gap-2.5 transition cursor-pointer"
        >
          <Headphones className="w-5 h-5 text-black stroke-[2.5]" />
          <span>24/7 VIP Customer Support</span>
        </motion.button>
      </div>
    </div>
  );
};

