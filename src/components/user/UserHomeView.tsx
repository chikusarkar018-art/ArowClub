import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { api } from '../../services/api.js';
import { GameType } from '../../types.js';
import { UserLogo } from './UserLogo.js';
import { RouletteGamePoster, PlinkoGamePoster, SevenUpDownGamePoster, TeenPattiGamePoster, ChessGamePoster, LudoGamePoster } from './GamePosters.js';
import {
  Bell, User, Wallet, Sparkles, Trophy, Gift, Users,
  ChevronRight, Flame, Clock, Play, Shield, ArrowRight, Zap, Crown, Moon, Sun
} from 'lucide-react';

interface UserHomeViewProps {
  onNavigateGame: (type?: GameType) => void;
  onNavigateSevenUpDown?: () => void;
  onNavigateTeenPatti?: () => void;
  onNavigateChess?: () => void;
  onNavigateAviator?: () => void;
  onNavigateMines?: () => void;
  onNavigateChickenRoad?: () => void;
  onNavigateRoulette?: () => void;
  onNavigatePlinko?: () => void;
  onNavigateLudo?: () => void;
  onNavigateDeposit: () => void;
  onNavigateWithdraw: () => void;
  onNavigateVip: () => void;
  onNavigatePromotion: () => void;
  onNavigateReferral: () => void;
  onNavigateProfile: () => void;
  onOpenNotifications: () => void;
  onOpenSupport: () => void;
}

export const UserHomeView: React.FC<UserHomeViewProps> = ({
  onNavigateGame,
  onNavigateSevenUpDown,
  onNavigateTeenPatti,
  onNavigateChess,
  onNavigateAviator,
  onNavigateMines,
  onNavigateChickenRoad,
  onNavigateRoulette,
  onNavigatePlinko,
  onNavigateLudo,
  onNavigateDeposit,
  onNavigateWithdraw,
  onNavigateVip,
  onNavigatePromotion,
  onNavigateReferral,
  onNavigateProfile,
  onOpenNotifications,
  onOpenSupport,
}) => {
  const { user } = useAuth();
  const { themeMode, toggleTheme } = useTheme();
  // Home page permanently strictly stays in luxury Dark mode per user requirement
  const isLight = false;
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);
  const [selectedGameModal, setSelectedGameModal] = useState<any>(null);
  const [dynamicBanners, setDynamicBanners] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [showAllGames, setShowAllGames] = useState(false);

  // Fetch notifications count
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.getNotifications();
        if (res?.notifications) {
          setUnreadNotifsCount(res.notifications.length);
        }
      } catch {
        // ignore
      }
    };
    fetchNotifs();
  }, []);

  // Default fallback promotional banners
  const defaultBanners = [
    {
      id: 'wingo-promo',
      title: 'Win Go 30s Speed Lottery',
      subtitle: 'Instant 30-second color predictions with 9X payout multipliers!',
      tag: 'HOT FLAGSHIP',
      gradient: 'from-[#141208] via-[#26200a] to-[#0a0904]',
      textColor: 'text-[#fce08b]',
      imageUrl: '',
    },
    {
      id: 'teen-patti-promo',
      title: 'Live Dealer Teen Patti',
      subtitle: 'Real live video dealer tables with Player A vs B 1.98x & 4.5x A-Plus!',
      tag: 'LIVE CASINO',
      gradient: 'from-[#161408] via-[#2a220a] to-[#0d0b04]',
      textColor: 'text-[#fef08a]',
      imageUrl: '',
    },
    {
      id: 'seven-up-promo',
      title: '7 Up 7 Down Live Casino Tables',
      subtitle: 'Real Live Dealer tables with 12X Exact 7 payouts!',
      tag: 'HOT LIVE GAME',
      gradient: 'from-[#1a170a] via-[#32280d] to-[#0e0c05]',
      textColor: 'text-[#fef08a]',
      imageUrl: '',
    },
    {
      id: 'vip-promo',
      title: 'VIP Level Upgrade Rewards',
      subtitle: 'Climb VIP tiers for daily free payouts & luxury cash gifts',
      tag: 'VIP EXCLUSIVE',
      gradient: 'from-[#221c0b] via-[#3d300e] to-[#120f06]',
      textColor: 'text-[#fce08b]',
      imageUrl: '',
    },
  ];

  // Fetch admin uploaded banners dynamically
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await api.getPublicBanners();
        if (res?.banners && res.banners.length > 0) {
          setDynamicBanners(res.banners);
        }
      } catch (err) {
        console.log('Using default banners', err);
      }
    };
    fetchBanners();
  }, []);

  const banners = dynamicBanners.length > 0 ? dynamicBanners : defaultBanners;

  // Game Cards Grid: WinGo is strictly 1st, Teen Patti & 7 Up Down placed at the bottom
  const gamesGrid = [
    {
      id: 'wingo',
      name: 'WINGO',
      rtp: '97.33%',
      category: 'Lottery',
      badge: '9X RETURN',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-black border-amber-300',
      imageUrl: 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/ARLottery/WinGo_30S_20250816160742406.png',
      isLottery: true,
      isAviator: false,
    },
    {
      id: 'aviator',
      name: 'AVIATOR',
      rtp: '97.76%',
      category: 'Crash',
      badge: 'SPRIBE',
      badgeBg: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 font-black border-yellow-200',
      imageUrl: 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/800_20250816154723597.jpeg',
      isLottery: false,
      isAviator: true,
    },
    {
      id: 'roulette',
      name: 'ROULETTE',
      rtp: '97.30%',
      category: 'Casino',
      badge: '36X RETURN',
      badgeBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black border-amber-300',
      imageUrl: 'https://ossimg.tirangaagent.com/TB_Chess/124.png',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'mines',
      name: 'MINES',
      rtp: '96.31%',
      category: 'JILI',
      badge: 'JILI',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-black border-amber-300',
      imageUrl: 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'chicken_road',
      name: 'CHICKEN ROAD 2',
      rtp: '96.08%',
      category: 'In-House',
      badge: 'HOT',
      badgeBg: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-zinc-950 font-black border-yellow-300',
      imageUrl: 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/TB_Chess/121.png',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'plinko',
      name: 'PLINKO',
      rtp: '98.90%',
      category: 'Arcade',
      badge: '50X WIN',
      badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-black border-yellow-300',
      imageUrl: 'https://ossimg.tirangaagent.com/Tiranga/gamelogo/JILI/229.png',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'teen_patti',
      name: 'TEEN PATTI',
      rtp: '98.50%',
      category: 'Live Casino',
      badge: 'LIVE DEMO',
      badgeBg: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black border-yellow-300',
      imageUrl: '',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'seven_up_down',
      name: '7 UP 7 DOWN',
      rtp: '97.50%',
      category: 'Live Casino',
      badge: 'LIVE 12X',
      badgeBg: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black border-amber-300',
      imageUrl: '',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'ludo',
      name: 'LUDO SUPREME',
      rtp: '98.00%',
      category: 'Board',
      badge: 'MULTIPLAYER',
      badgeBg: 'bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 text-black font-black border-yellow-200',
      imageUrl: '/assets/ludo_poster.jpg',
      isLottery: false,
      isAviator: false,
    },
    {
      id: 'chess',
      name: 'CHESS MASTER',
      rtp: '98.50%',
      category: 'PvP & Bot',
      badge: '90% WIN',
      badgeBg: 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-black border-yellow-300',
      imageUrl: '',
      isLottery: false,
      isAviator: false,
    },
  ];

  // Auto banner carousel
  useEffect(() => {
    if (!banners || banners.length <= 1) return;
    const timer = setInterval(() => {
      setActiveBannerIdx((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const handleGameClick = (game: typeof gamesGrid[0]) => {
    if (game.id === 'chess' && onNavigateChess) {
      onNavigateChess();
    } else if (game.id === 'ludo' && onNavigateLudo) {
      onNavigateLudo();
    } else if (game.id === 'teen_patti' && onNavigateTeenPatti) {
      onNavigateTeenPatti();
    } else if (game.id === 'seven_up_down' && onNavigateSevenUpDown) {
      onNavigateSevenUpDown();
    } else if (game.id === 'roulette' && onNavigateRoulette) {
      onNavigateRoulette();
    } else if (game.id === 'plinko' && onNavigatePlinko) {
      onNavigatePlinko();
    } else if (game.id === 'aviator' && onNavigateAviator) {
      onNavigateAviator();
    } else if (game.id === 'mines' && onNavigateMines) {
      onNavigateMines();
    } else if (game.id === 'chicken_road' && onNavigateChickenRoad) {
      onNavigateChickenRoad();
    } else if (game.isLottery) {
      onNavigateGame('wingo_30s');
    } else {
      setSelectedGameModal(game);
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#060709] text-white flex flex-col font-sans pb-20 select-none">
      {/* Top Header: Fixed pinned at top in permanent Luxury Gold & Black */}
      <header className="fixed top-0 left-0 right-0 z-40 px-4 py-3 flex items-center justify-between bg-[#0c0d12]/98 border-b border-[#f5c443]/25 shadow-[0_4px_20px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="max-w-md mx-auto w-full flex items-center justify-between">
          <UserLogo size="md" />

          <div className="flex items-center gap-2">
            {/* Notification Icon */}
            <button
              onClick={() => {
                setUnreadNotifsCount(0);
                onOpenNotifications();
              }}
              className="w-8 h-8 rounded-full bg-[#14151c] border border-[#f5c443]/25 flex items-center justify-center text-zinc-300 hover:text-[#f5c443] transition relative active:scale-95"
            >
              <Bell className="w-4 h-4 text-amber-300" />
              {unreadNotifsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#f5c443] absolute top-1.5 right-1.5 animate-pulse shadow-[0_0_6px_#f5c443]" />
              )}
            </button>

            {/* Wallet Balance Chip */}
            <div
              onClick={onNavigateDeposit}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#16171f] to-[#20222c] border border-[#f5c443]/40 hover:border-[#f5c443] px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition shadow-[0_0_12px_rgba(245,196,67,0.15)] active:scale-95"
            >
              <Wallet className="w-3.5 h-3.5 text-[#f5c443]" />
              <span className="text-[#fce08b] font-mono">₹{(user?.walletBalance ?? 0).toFixed(2)}</span>
            </div>

            {/* Profile Icon */}
            <button
              onClick={onNavigateProfile}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#f5c443] via-[#ffb703] to-[#d48b0c] p-[1.5px] shadow-md flex items-center justify-center active:scale-95"
            >
              <div className="w-full h-full bg-[#0c0d12] rounded-full flex items-center justify-center text-[#f5c443]">
                <User className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Top spacer for fixed header */}
      <div className="h-14 w-full shrink-0" />

      {/* Main Home Content */}
      <div className="flex-1 px-3.5 pt-3 max-w-md mx-auto w-full space-y-4">
        
        {/* Promotional Banner Slider */}
        <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#f5c443]/25">
          <div className="relative h-36">
            {banners.map((b, idx) => (
              <div
                key={b.id || idx}
                className={`absolute inset-0 transition-opacity duration-700 ${
                  idx === activeBannerIdx ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                {b.imageUrl ? (
                  <div
                    className="relative w-full h-full cursor-pointer"
                    onClick={onNavigatePromotion}
                  >
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-black/75 text-[#f5c443] border border-[#f5c443]/40 text-[9px] font-black rounded-full uppercase tracking-wider backdrop-blur-sm shadow-sm">
                          {b.tag || 'PROMOTION'}
                        </span>
                      </div>
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-[#fef08a] drop-shadow-md truncate">
                            {b.title}
                          </h3>
                          {b.subtitle && (
                            <p className="text-[10px] text-zinc-200 line-clamp-1 opacity-90">
                              {b.subtitle}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigatePromotion();
                          }}
                          className="px-3 py-1 bg-gradient-to-r from-[#e5a823] to-[#f5c443] text-black text-[10px] font-black rounded-full shadow-lg hover:from-amber-400 hover:to-yellow-300 transition active:scale-95 flex items-center gap-0.5 shrink-0"
                        >
                          <span>Claim</span>
                          <ChevronRight className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`w-full h-full p-4 bg-gradient-to-r ${b.gradient || 'from-[#141208] via-[#26200a] to-[#0a0904]'} border border-[#f5c443]/20 flex flex-col justify-between`}>
                    <div>
                      <span className="px-2 py-0.5 bg-black/75 text-[#f5c443] border border-[#f5c443]/40 text-[9px] font-black rounded-full uppercase tracking-wider backdrop-blur-sm">
                        {b.tag || 'EXCLUSIVE'}
                      </span>
                      <h3 className={`text-base font-extrabold mt-1.5 drop-shadow ${b.textColor || 'text-[#fce08b]'}`}>
                        {b.title}
                      </h3>
                      <p className={`text-xs mt-0.5 line-clamp-2 opacity-90 ${b.textColor || 'text-zinc-200'}`}>
                        {b.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        onClick={onNavigatePromotion}
                        className="px-3.5 py-1 bg-[#0c0d12] text-[#f5c443] border border-[#f5c443]/50 text-xs font-black rounded-full shadow-lg hover:bg-black transition active:scale-95 flex items-center gap-1"
                      >
                        <span>Claim Now</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex gap-1.5">
                        {banners.map((_, i) => (
                          <span
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              i === activeBannerIdx ? 'w-4 bg-[#f5c443] shadow-[0_0_6px_#f5c443]' : 'bg-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Category Shortcuts */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => onNavigateGame('wingo_30s')}
            className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' : 'bg-gradient-to-b from-[#14151c] to-[#0b0c10] border-[#f5c443]/20 text-zinc-200'} hover:border-amber-400 border rounded-2xl flex flex-col items-center gap-1 text-center transition group shadow-md active:scale-95`}
          >
            <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-gradient-to-tr from-[#f5c443]/20 to-amber-500/10 border-[#f5c443]/35 text-[#f5c443]'} border flex items-center justify-center group-hover:scale-110 transition shadow-inner`}>
              <Flame className={`w-5 h-5 ${isLight ? 'fill-amber-500 text-amber-500' : 'fill-[#f5c443] text-[#f5c443]'}`} />
            </div>
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800 group-hover:text-amber-600' : 'text-zinc-200 group-hover:text-[#f5c443]'}`}>Win Go</span>
          </button>

          <button
            onClick={onNavigateVip}
            className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' : 'bg-gradient-to-b from-[#14151c] to-[#0b0c10] border-[#f5c443]/20 text-zinc-200'} hover:border-amber-400 border rounded-2xl flex flex-col items-center gap-1 text-center transition group shadow-md active:scale-95`}
          >
            <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-[#f5c443]/15 border-[#f5c443]/35 text-[#f5c443]'} border flex items-center justify-center group-hover:scale-110 transition shadow-inner`}>
              <Crown className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800 group-hover:text-amber-600' : 'text-zinc-200 group-hover:text-[#f5c443]'}`}>VIP Club</span>
          </button>

          <button
            onClick={onNavigatePromotion}
            className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' : 'bg-gradient-to-b from-[#14151c] to-[#0b0c10] border-[#f5c443]/20 text-zinc-200'} hover:border-amber-400 border rounded-2xl flex flex-col items-center gap-1 text-center transition group shadow-md active:scale-95`}
          >
            <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-[#f5c443]/15 border-[#f5c443]/35 text-[#f5c443]'} border flex items-center justify-center group-hover:scale-110 transition shadow-inner`}>
              <Gift className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800 group-hover:text-amber-600' : 'text-zinc-200 group-hover:text-[#f5c443]'}`}>Promotions</span>
          </button>

          <button
            onClick={onNavigateReferral}
            className={`p-2.5 ${isLight ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800' : 'bg-gradient-to-b from-[#14151c] to-[#0b0c10] border-[#f5c443]/20 text-zinc-200'} hover:border-amber-400 border rounded-2xl flex flex-col items-center gap-1 text-center transition group shadow-md active:scale-95`}
          >
            <div className={`w-10 h-10 rounded-xl ${isLight ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-[#f5c443]/15 border-[#f5c443]/35 text-[#f5c443]'} border flex items-center justify-center group-hover:scale-110 transition shadow-inner`}>
              <Users className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-bold ${isLight ? 'text-slate-800 group-hover:text-amber-600' : 'text-zinc-200 group-hover:text-[#f5c443]'}`}>Agency</span>
          </button>
        </div>

        {/* Popular Games Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`font-extrabold text-sm ${isLight ? 'text-slate-800' : 'text-zinc-200'} flex items-center gap-1.5`}>
              <Sparkles className={`w-4 h-4 ${isLight ? 'text-amber-500' : 'text-[#f5c443]'}`} />
              <span>Popular Games</span>
            </h3>
            <button
              id="home-view-all-games-btn"
              onClick={() => setShowAllGames(prev => !prev)}
              className={`text-[11px] ${isLight ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-[#f5c443] bg-[#f5c443]/10 border-[#f5c443]/30'} font-bold px-2.5 py-1 rounded-full border cursor-pointer hover:brightness-110 transition flex items-center gap-1`}
            >
              <span>{showAllGames ? 'Show Less' : 'View All'}</span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showAllGames ? 'rotate-90' : ''}`} />
            </button>
          </div>

          {/* Games Grid (3 Games initially, expands to full grid on View All) */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {(showAllGames ? gamesGrid : gamesGrid.slice(0, 3)).map((game) => (
              <div
                key={game.id}
                onClick={() => handleGameClick(game)}
                className="group flex flex-col cursor-pointer transition transform hover:-translate-y-1 active:scale-[0.98]"
              >
                {/* Main Game Poster Card */}
                <div className={`${isLight ? 'bg-white border-slate-200 group-hover:border-amber-400 shadow-md group-hover:shadow-lg' : 'bg-[#0f1016] border-[#f5c443]/20 group-hover:border-[#f5c443]/70 shadow-xl group-hover:shadow-[0_0_18px_rgba(245,196,67,0.35)]'} border rounded-xl sm:rounded-2xl overflow-hidden transition flex flex-col justify-between relative`}>
                  
                  {/* Floating Badge (Top Right) */}
                  {game.badge && (
                    <div className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 z-10">
                      <span
                        className={`px-1.5 py-0.5 border text-[7px] sm:text-[9px] font-black uppercase tracking-tight rounded-full shadow-md backdrop-blur-md ${game.badgeBg}`}
                      >
                        {game.badge}
                      </span>
                    </div>
                  )}

                  {/* Original Game Image Container */}
                  <div className={`w-full aspect-square relative overflow-hidden ${isLight ? 'bg-slate-100' : 'bg-[#07080b]'} flex items-center justify-center`}>
                    {game.id === 'chess' ? (
                      <ChessGamePoster />
                    ) : game.id === 'ludo' ? (
                      <LudoGamePoster />
                    ) : game.id === 'teen_patti' ? (
                      <TeenPattiGamePoster />
                    ) : game.id === 'seven_up_down' ? (
                      <SevenUpDownGamePoster />
                    ) : game.id === 'roulette' ? (
                      <RouletteGamePoster />
                    ) : game.id === 'plinko' ? (
                      <PlinkoGamePoster />
                    ) : (
                      <>
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 block"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />
                      </>
                    )}
                  </div>

                  {/* Game Name */}
                  <div className={`px-1 py-1.5 ${isLight ? 'bg-slate-50 border-t border-slate-200' : 'bg-[#0a0b0e] border-t border-[#f5c443]/15'} text-center`}>
                    <span className={`font-black text-[10px] sm:text-xs ${isLight ? 'text-slate-800' : 'text-[#fef08a]'} uppercase tracking-tight truncate block drop-shadow-sm`}>
                      {game.name}
                    </span>
                  </div>
                </div>

                {/* RTP Bar */}
                <div className={`mt-1 px-1.5 sm:px-2.5 py-0.5 sm:py-1 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#15161f] border-[#f5c443]/30 text-[#fce08b]'} group-hover:border-amber-400 border rounded-md sm:rounded-lg flex items-center justify-between font-black text-[8px] sm:text-[10px] shadow-sm transition`}>
                  <span className={`opacity-90 font-bold tracking-tight ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>RTP</span>
                  <span className={`font-mono font-bold tracking-tight ${isLight ? 'text-amber-600' : 'text-[#f5c443]'}`}>{game.rtp}</span>
                </div>
              </div>
            ))}
          </div>

          {!showAllGames && (
            <button
              onClick={() => setShowAllGames(true)}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#14151f] to-[#0e0f16] border border-[#f5c443]/25 hover:border-[#f5c443]/60 text-zinc-300 hover:text-[#f5c443] text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-[0.99] shadow-md"
            >
              <span>View All Games ({gamesGrid.length})</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-90 text-[#f5c443]" />
            </button>
          )}
        </div>

        {/* Live Big Winners Leaderboard */}
        <div className={`${isLight ? 'bg-slate-50 border-slate-200 shadow-md text-slate-800' : 'bg-[#0f1016] border-[#f5c443]/20 shadow-xl text-white'} border rounded-2xl p-3.5 space-y-2.5`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold ${isLight ? 'text-slate-800' : 'text-zinc-200'} flex items-center gap-1.5`}>
              <Trophy className={`w-3.5 h-3.5 ${isLight ? 'text-amber-500' : 'text-[#f5c443]'}`} />
              <span>Winning Leaderboard</span>
            </span>
            <span className={`text-[10px] ${isLight ? 'text-amber-600' : 'text-[#f5c443]'} font-bold flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-amber-500' : 'bg-[#f5c443]'} animate-ping`} />
              Realtime
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            {[
              { user: 'Member 108***42', win: '₹4,950.00', game: 'WinGo 30s' },
              { user: 'Member 109***18', win: '₹12,400.00', game: 'WinGo 1Min' },
              { user: 'Member 107***99', win: '₹2,700.00', game: 'WinGo 3Min' },
            ].map((w, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 ${isLight ? 'bg-white border-slate-200' : 'bg-[#060709] border-[#f5c443]/10'} rounded-xl border`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full ${isLight ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-[#f5c443]/20 text-[#f5c443] border-[#f5c443]/30'} text-[10px] font-black flex items-center justify-center border`}>
                    {i + 1}
                  </div>
                  <span className={`${isLight ? 'text-slate-700' : 'text-zinc-300'} font-medium text-[11px]`}>{w.user}</span>
                </div>
                <div className="text-right">
                  <div className={`${isLight ? 'text-amber-600' : 'text-[#fce08b]'} font-extrabold text-xs font-mono`}>{w.win}</div>
                  <div className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}>{w.game}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Non-Lottery Game Launch Modal */}
      {selectedGameModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0f15] border border-[#f5c443]/40 rounded-3xl max-w-xs w-full p-5 text-center text-white shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f5c443] to-[#d48b0c] flex items-center justify-center mx-auto text-[#060709] font-black text-2xl shadow-lg">
              🎮
            </div>
            <div>
              <h3 className="text-lg font-black text-[#fce08b] uppercase tracking-wide">
                {selectedGameModal.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Certified RTP: <strong className="text-[#f5c443]">{selectedGameModal.rtp}</strong>
              </p>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-[#060709] p-3 rounded-xl border border-[#f5c443]/15">
              {selectedGameModal.note || (
                <>For color lottery rounds, play our flagship <strong>Win Go</strong> with instant 30s payouts!</>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGameModal(null)}
                className="flex-1 py-2.5 bg-zinc-900 border border-zinc-700 text-zinc-300 font-bold text-xs rounded-xl hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedGameModal(null);
                  onNavigateGame('wingo_30s');
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#e5a823] to-[#f5c443] text-black font-black text-xs rounded-xl shadow-md hover:from-amber-400 hover:to-yellow-300"
              >
                Play Win Go
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
