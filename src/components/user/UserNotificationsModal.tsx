import React, { useState, useEffect } from 'react';
import { X, Bell, Gift, Crown, ShieldAlert, Check } from 'lucide-react';
import { api } from '../../services/api.js';

interface UserNotificationsModalProps {
  onClose: () => void;
}

export const UserNotificationsModal: React.FC<UserNotificationsModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.getNotifications();
        if (res?.notifications) {
          setNotifications(res.notifications);
        }
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifs();
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'bonus':
        return <Gift className="w-4 h-4 text-emerald-400" />;
      case 'vip':
        return <Crown className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-[#2b85ff]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121520] border border-[#f5c443]/30 rounded-2xl max-w-sm w-full max-h-[80vh] flex flex-col text-white shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="p-4 border-b border-[#f5c443]/20 flex items-center justify-between bg-[#161a28]">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#f5c443]" />
            <h3 className="font-bold text-base text-[#f5c443]">Notifications</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-1 bg-[#0e1017]">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">No notifications available</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className="bg-[#161a28] p-3 rounded-xl border border-white/5 hover:border-[#f5c443]/30 flex gap-3 items-start transition"
              >
                <div className="w-8 h-8 rounded-lg bg-[#f5c443]/15 border border-[#f5c443]/25 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xs text-[#fce08b] truncate">{n.title}</div>
                  <div className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">{n.content}</div>
                  <div className="text-[9px] text-zinc-500 mt-1 font-mono">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-[#161a28] border-t border-[#f5c443]/20 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gradient-to-r from-[#f5c443] to-[#d48b0c] hover:brightness-105 text-[#0d0f17] text-xs font-black rounded-xl transition shadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
