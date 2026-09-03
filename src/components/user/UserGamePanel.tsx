import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useTheme } from '../../context/ThemeContext.js';
import { GameType } from '../../types.js';
import { stopAllGameSounds } from '../../utils/audioMaster.js';
import { OfficialPortalLanding } from '../portal/OfficialPortalLanding.js';
import { UserLoginView } from './UserLoginView.js';
import { UserRegisterView } from './UserRegisterView.js';
import { UserHomeView } from './UserHomeView.js';
import { UserWingoGameView } from './UserWingoGameView.js';
import { UserAviatorGameView } from './UserAviatorGameView.js';
import { UserMinesGameView } from './UserMinesGameView.js';
import { UserChickenRoadGameView } from './UserChickenRoadGameView.js';
import { UserRouletteGameView } from './UserRouletteGameView.js';
import { UserPlinkoGameView } from './UserPlinkoGameView.js';
import { UserSevenUpDownGameView } from './UserSevenUpDownGameView.js';
import { UserTeenPattiGameView } from './UserTeenPattiGameView.js';
import { UserLudoGameView } from './UserLudoGameView.js';
import { UserChessGameView } from './UserChessGameView.js';
import { UserWalletView } from './UserWalletView.js';
import { UserTransactionHistoryView } from './UserTransactionHistoryView.js';
import { UserGameHistoryView } from './UserGameHistoryView.js';
import { UserVipView } from './UserVipView.js';
import { UserPromotionView } from './UserPromotionView.js';
import { UserReferralView } from './UserReferralView.js';
import { UserGet500BonusView } from './UserGet500BonusView.js';
import { UserProfileView } from './UserProfileView.js';
import { UserForgotPasswordModal } from './UserForgotPasswordModal.js';
import { UserHowToPlayModal } from './UserHowToPlayModal.js';
import { UserNotificationsModal } from './UserNotificationsModal.js';
import { UserSupportModal } from './UserSupportModal.js';
import { UserMaintenanceScreen } from './UserMaintenanceScreen.js';
import { UserAdminChatNotification } from './UserAdminChatNotification.js';
import { GiftRedeemModal } from './GiftRedeemModal.js';

import {
  Home, Flame, Gift, Wallet, User as UserIcon, Shield, Sparkles, Users,
  Clock, AlertTriangle, Headphones, RefreshCw, Lock, CheckCircle2, Globe
} from 'lucide-react';
import { api } from '../../services/api.js';

export const UserGamePanel: React.FC = () => {
  const { user, logoutUser, loginUser, registerUser, setActiveMode, showToast, concurrentKicked, setConcurrentKicked } = useAuth();
  const { isLight, isDark } = useTheme();
  
  // Maintenance State
  const [maintenance, setMaintenance] = useState<{
    isEnabled: boolean;
    title: string;
    message: string;
    imageUrl: string;
    startTime: string;
    endTime: string;
  } | null>(null);

  const checkMaintenance = async () => {
    try {
      const res: any = await api.getPublicMaintenanceStatus();
      if (res && res.isEnabled) {
        setMaintenance({
          isEnabled: true,
          title: res.title || 'Platform Under Maintenance',
          message: res.message || 'We are currently performing scheduled server upgrades to enhance performance. The platform will be back online shortly.',
          imageUrl: res.imageUrl || res.bannerUrl || 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
          startTime: res.startTime || '11:00 AM',
          endTime: res.endTime || '04:30 PM',
        });
      } else {
        setMaintenance(null);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 3000);
    return () => clearInterval(interval);
  }, []);

  // Helper to extract invite code from query or hash
  const extractInviteCodeFromUrl = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      let code = searchParams.get('invitationCode') || searchParams.get('inviteCode') || searchParams.get('ref') || searchParams.get('invite') || searchParams.get('code');
      if (!code && window.location.hash && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('invitationCode') || hashParams.get('inviteCode') || hashParams.get('ref') || hashParams.get('invite') || hashParams.get('code');
      }
      return code ? code.replace(/\D/g, '') : '';
    } catch {
      return '';
    }
  };

  const initialCode = extractInviteCodeFromUrl();
  const [activeInviteCode, setActiveInviteCode] = useState<string>(initialCode || '100001');

  // Check if initial URL is portal or register
  const [viewPortal, setViewPortal] = useState<boolean>(() => {
    try {
      const hash = window.location.hash;
      if (hash.includes('register') || hash.includes('login')) return false;
      if (initialCode && (hash.includes('register') || window.location.search.includes('invitationCode'))) return false;
      // When visiting pure root domain (.com) or #/portal, open Official Portal by default
      return true;
    } catch {
      return true;
    }
  });
  
  // Auth view mode if not logged in: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>(() => {
    try {
      const hash = window.location.hash;
      if (hash.includes('register') || initialCode) {
        return 'register';
      }
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('ref') || searchParams.get('invite') || searchParams.get('code') || searchParams.get('invitationCode')) {
        return 'register';
      }
    } catch {
      // ignore
    }
    return 'login';
  });
  const [registeredPhone, setRegisteredPhone] = useState('');

  // Hash listener for direct links like /#/register?invitationCode=... or /#/login or root /
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const extracted = extractInviteCodeFromUrl();
      if (extracted) {
        setActiveInviteCode(extracted);
      }
      if (hash.includes('register')) {
        setAuthMode('register');
        setViewPortal(false);
      } else if (hash.includes('login')) {
        setAuthMode('login');
        setViewPortal(false);
      } else if (hash.includes('portal') || hash.includes('official') || hash === '' || hash === '#' || hash === '#/') {
        setViewPortal(true);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Main active navigation page: home | activity | get500 | promotion | referral | profile (and games/wallet)
  type AppPage =
    | 'home' | 'activity' | 'get500' | 'promotion' | 'referral' | 'profile'
    | 'game' | 'teen_patti' | 'seven_up_down' | 'aviator' | 'mines' | 'chicken_road' | 'roulette' | 'plinko' | 'ludo' | 'chess'
    | 'wallet' | 'vip' | 'transaction_history' | 'game_history';

  const [activePage, setActivePage] = useState<AppPage>('home');
  const [navStack, setNavStack] = useState<AppPage[]>(['home']);
  const [walletInitialTab, setWalletInitialTab] = useState<'wallet' | 'deposit' | 'withdraw' | 'history' | 'withdraw_history' | 'deposit_history'>('wallet');
  const [txInitialFilter, setTxInitialFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bet' | 'win'>('all');

  // Navigate to target page while pushing to stack and browser history
  const navigateTo = (page: AppPage) => {
    setNavStack((prev) => {
      if (prev[prev.length - 1] === page) return prev;
      return [...prev, page];
    });
    setActivePage(page);
    try {
      window.history.pushState({ appPage: page }, '', '');
    } catch {
      // ignore
    }
  };

  // Back handler - pops previous page from stack
  const handleBack = () => {
    setNavStack((prev) => {
      if (prev.length > 1) {
        const nextStack = [...prev];
        nextStack.pop(); // remove current
        const prevPage = nextStack[nextStack.length - 1] || 'home';
        setActivePage(prevPage);
        return nextStack;
      } else {
        setActivePage('home');
        return ['home'];
      }
    });
  };

  // Browser / Mobile Hardware Back Button Synchronization
  useEffect(() => {
    // Set initial history state
    try {
      window.history.replaceState({ appPage: 'home' }, '', '');
    } catch {
      // ignore
    }

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.appPage) {
        const targetPage = e.state.appPage as AppPage;
        setActivePage(targetPage);
        setNavStack((prev) => {
          const idx = prev.lastIndexOf(targetPage);
          if (idx !== -1) {
            return prev.slice(0, idx + 1);
          }
          return [...prev, targetPage];
        });
      } else {
        handleBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Automatically silence/stop all active game audio when switching pages or closing games
  useEffect(() => {
    stopAllGameSounds();
    return () => {
      stopAllGameSounds();
    };
  }, [activePage]);

  // Global User Modals
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showHowToPlayModal, setShowHowToPlayModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showGiftRedeemModal, setShowGiftRedeemModal] = useState(false);

  // If maintenance mode is active, display the admin-configured maintenance screen
  if (maintenance && maintenance.isEnabled) {
    return (
      <>
        <UserMaintenanceScreen
          maintenance={maintenance}
          onRefresh={checkMaintenance}
          onOpenSupport={() => setShowSupportModal(true)}
        />
        {showSupportModal && (
          <UserSupportModal onClose={() => setShowSupportModal(false)} />
        )}
      </>
    );
  }

  // If viewing the Official Portal Landing Page
  if (viewPortal) {
    return (
      <OfficialPortalLanding
        defaultInviteCode={activeInviteCode}
        onNavigateRegister={(code) => {
          if (code) setActiveInviteCode(code);
          setAuthMode('register');
          setViewPortal(false);
          try {
            window.location.hash = `#/register?invitationCode=${code || activeInviteCode || '100001'}`;
          } catch {
            // ignore
          }
        }}
        onNavigateLogin={() => {
          setAuthMode('login');
          setViewPortal(false);
          try {
            window.location.hash = `#/login`;
          } catch {
            // ignore
          }
        }}
        onLaunchGame={(gameKey) => {
          setViewPortal(false);
          if (user) {
            if (gameKey) navigateTo(gameKey as AppPage);
            else navigateTo('home');
          } else {
            setAuthMode('login');
          }
        }}
      />
    );
  }

  // If user is not logged in, show the mobile Login/Register screen matching the design
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0c12] flex flex-col justify-center relative">
        {/* Concurrent Login Alert Banner/Modal */}
        {concurrentKicked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#141722] border border-[#f5c443]/40 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#f5c443]/20 border border-[#f5c443]/40 flex items-center justify-center text-[#f5c443]">
                <Shield className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Session Terminated</h3>
              <p className="text-sm text-zinc-300 mb-6 leading-relaxed">
                Aapka account kisi doosre device ya browser me login kiya gaya hai. <br/>
                <span className="text-[#f5c443] font-semibold">Ek ID ko ek samay me ek hi user login kar sakta hai.</span>
              </p>
              <button
                onClick={() => setConcurrentKicked(false)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#f5c443] to-[#d99b26] hover:brightness-105 font-bold text-black tracking-wide shadow-lg transition active:scale-98"
              >
                Got It / Login Again
              </button>
            </div>
          </div>
        )}

        {authMode === 'login' ? (
          <UserLoginView
            initialPhone={registeredPhone}
            onNavigateRegister={() => {
              setAuthMode('register');
              try {
                window.location.hash = `#/register?invitationCode=${activeInviteCode || '100001'}`;
              } catch {
                // ignore
              }
            }}
            onNavigateForgotPassword={() => setShowForgotModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
            onOpenPortal={() => {
              setViewPortal(true);
              try {
                window.location.hash = `#/portal`;
              } catch {
                // ignore
              }
            }}
            onLogin={loginUser}
          />
        ) : (
          <UserRegisterView
            initialInviteCode={activeInviteCode}
            onNavigateLogin={(phone?: string) => {
              if (phone) setRegisteredPhone(phone);
              setAuthMode('login');
              try {
                window.location.hash = `#/login`;
              } catch {
                // ignore
              }
            }}
            onOpenSupport={() => setShowSupportModal(true)}
            onOpenPortal={() => {
              setViewPortal(true);
              try {
                window.location.hash = `#/portal`;
              } catch {
                // ignore
              }
            }}
            onRegister={registerUser}
          />
        )}

        {/* Global Forgot Password Modal */}
        {showForgotModal && (
          <UserForgotPasswordModal
            onClose={() => setShowForgotModal(false)}
            onSuccess={(msg) => {
              showToast(msg, 'success');
              setAuthMode('login');
            }}
          />
        )}

        {/* Global Support Modal */}
        {showSupportModal && (
          <UserSupportModal onClose={() => setShowSupportModal(false)} />
        )}
      </div>
    );
  }

  // Navigation handlers
  const handleNavigateDeposit = () => {
    setWalletInitialTab('deposit');
    navigateTo('wallet');
  };

  const handleNavigateWithdraw = () => {
    setWalletInitialTab('withdraw');
    navigateTo('wallet');
  };

  const handleNavigateWallet = (tab?: 'wallet' | 'deposit' | 'withdraw' | 'history' | 'withdraw_history' | 'deposit_history') => {
    setWalletInitialTab(tab || 'deposit');
    navigateTo('wallet');
  };

  const handleNavigateTransactionHistory = (filter?: 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win') => {
    setTxInitialFilter(filter || 'all');
    navigateTo('transaction_history');
  };

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return (
          <UserHomeView
            onNavigateGame={() => navigateTo('game')}
            onNavigateTeenPatti={() => navigateTo('teen_patti')}
            onNavigateSevenUpDown={() => navigateTo('seven_up_down')}
            onNavigateChess={() => navigateTo('chess')}
            onNavigateAviator={() => navigateTo('aviator')}
            onNavigateMines={() => navigateTo('mines')}
            onNavigateChickenRoad={() => navigateTo('chicken_road')}
            onNavigateRoulette={() => navigateTo('roulette')}
            onNavigatePlinko={() => navigateTo('plinko')}
            onNavigateLudo={() => navigateTo('ludo')}
            onNavigateDeposit={handleNavigateDeposit}
            onNavigateWithdraw={handleNavigateWithdraw}
            onNavigateVip={() => navigateTo('vip')}
            onNavigatePromotion={() => navigateTo('promotion')}
            onNavigateReferral={() => navigateTo('referral')}
            onNavigateProfile={() => navigateTo('profile')}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
          />
        );

      case 'chess':
        return (
          <UserChessGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'ludo':
        return (
          <UserLudoGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'teen_patti':
        return (
          <UserTeenPattiGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'seven_up_down':
        return (
          <UserSevenUpDownGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'roulette':
        return (
          <UserRouletteGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'plinko':
        return (
          <UserPlinkoGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'game':
        return (
          <UserWingoGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
            onNavigateWithdraw={handleNavigateWithdraw}
            onOpenSupport={() => setShowSupportModal(true)}
            onOpenHowToPlay={() => setShowHowToPlayModal(true)}
          />
        );

      case 'aviator':
        return (
          <UserAviatorGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'mines':
        return (
          <UserMinesGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'chicken_road':
        return (
          <UserChickenRoadGameView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'wallet':
        return (
          <UserWalletView
            initialTab={walletInitialTab}
            onBack={handleBack}
            onOpenGiftRedeem={() => setShowGiftRedeemModal(true)}
          />
        );

      case 'transaction_history':
        return (
          <UserTransactionHistoryView
            initialFilter={txInitialFilter}
            onBack={handleBack}
          />
        );

      case 'game_history':
        return (
          <UserGameHistoryView
            onBack={handleBack}
          />
        );

      case 'vip':
        return (
          <UserVipView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'activity':
        return (
          <UserPromotionView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
            onNavigateGet500={() => navigateTo('get500')}
            onNavigateAgency={() => navigateTo('promotion')}
          />
        );

      case 'get500':
        return (
          <UserGet500BonusView
            onBack={handleBack}
            onNavigateDeposit={handleNavigateDeposit}
            onNavigatePromotion={() => navigateTo('promotion')}
            onNavigateVip={() => navigateTo('vip')}
          />
        );

      case 'promotion':
      case 'referral':
        return (
          <UserReferralView
            onBack={handleBack}
            onOpenSupport={() => setShowSupportModal(true)}
            onNavigateDeposit={handleNavigateDeposit}
          />
        );

      case 'profile':
        return (
          <UserProfileView
            onBack={handleBack}
            onNavigateWallet={handleNavigateWallet}
            onNavigateTransactionHistory={handleNavigateTransactionHistory}
            onNavigateGameHistory={() => navigateTo('game_history')}
            onNavigateVip={() => navigateTo('vip')}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
            onOpenHowToPlay={() => setShowHowToPlayModal(true)}
            onLogout={logoutUser}
          />
        );

      default:
        return (
          <UserHomeView
            onNavigateGame={() => navigateTo('game')}
            onNavigateDeposit={handleNavigateDeposit}
            onNavigateWithdraw={handleNavigateWithdraw}
            onNavigateVip={() => navigateTo('vip')}
            onNavigatePromotion={() => navigateTo('promotion')}
            onNavigateReferral={() => navigateTo('promotion')}
            onNavigateProfile={() => navigateTo('profile')}
            onOpenNotifications={() => setShowNotificationsModal(true)}
            onOpenSupport={() => setShowSupportModal(true)}
          />
        );
    }
  };

  const isStandaloneGame = ['teen_patti', 'seven_up_down', 'plinko', 'roulette', 'game', 'aviator', 'mines', 'chicken_road', 'ludo'].includes(activePage);

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#060709] text-white flex flex-col font-sans relative select-none">
      {/* Main Page Body */}
      <main className={`flex-1 w-full max-w-md mx-auto overflow-x-hidden ${isStandaloneGame ? 'p-0 pb-0' : 'pb-16'}`}>
        {renderActivePage()}
      </main>

      {/* Fixed Bottom Navigation Bar - HOME | activity | get500 | promotion | account */}
      {!isStandaloneGame && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0c0d12]/98 border-t border-[#f5c443]/25 shadow-[0_-5px_25px_rgba(0,0,0,0.95)] backdrop-blur-xl">
          <div className="max-w-md mx-auto grid grid-cols-5 h-16 px-1">
            {/* 1. HOME */}
            <button
              onClick={() => navigateTo('home')}
              className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activePage === 'home'
                  ? 'text-[#f5c443] font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Home className={`w-5 h-5 ${activePage === 'home' ? 'text-[#f5c443]' : 'text-zinc-400'}`} />
              <span className="text-[10px] uppercase font-bold tracking-tight">HOME</span>
              {activePage === 'home' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c443] shadow-[0_0_8px_#f5c443]" />
              )}
            </button>

            {/* 2. activity */}
            <button
              onClick={() => navigateTo('activity')}
              className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activePage === 'activity'
                  ? 'text-[#f5c443] font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Flame className={`w-5 h-5 ${activePage === 'activity' ? 'text-[#f5c443]' : 'text-zinc-400'}`} />
              <span className="text-[10px] font-bold">activity</span>
              {activePage === 'activity' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c443] shadow-[0_0_8px_#f5c443]" />
              )}
            </button>

            {/* 3. get500 */}
            <button
              onClick={() => navigateTo('get500')}
              className={`flex flex-col items-center justify-center gap-0.5 transition cursor-pointer relative ${
                activePage === 'get500'
                  ? 'text-[#f5c443] font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative -mt-1">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#d99b26] to-[#f5c443] flex items-center justify-center text-black shadow-[0_0_10px_rgba(245,196,67,0.4)]">
                  <Gift className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
              <span className="text-[9px] font-extrabold text-[#f5c443]">get500</span>
              {activePage === 'get500' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c443] shadow-[0_0_8px_#f5c443]" />
              )}
            </button>

            {/* 4. promotion */}
            <button
              onClick={() => navigateTo('promotion')}
              className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activePage === 'promotion' || activePage === 'referral'
                  ? 'text-[#f5c443] font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className={`w-5 h-5 ${activePage === 'promotion' || activePage === 'referral' ? 'text-[#f5c443]' : 'text-zinc-400'}`} />
              <span className="text-[10px] font-bold">promotion</span>
              {(activePage === 'promotion' || activePage === 'referral') && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c443] shadow-[0_0_8px_#f5c443]" />
              )}
            </button>

            {/* 5. account */}
            <button
              onClick={() => navigateTo('profile')}
              className={`flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                activePage === 'profile'
                  ? 'text-[#f5c443] font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <UserIcon className={`w-5 h-5 ${activePage === 'profile' ? 'text-[#f5c443]' : 'text-zinc-400'}`} />
              <span className="text-[10px] font-bold">account</span>
              {activePage === 'profile' && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f5c443] shadow-[0_0_8px_#f5c443]" />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Real-time Admin Chat Reply Toast Notification */}
      <UserAdminChatNotification
        isSupportOpen={showSupportModal}
        onOpenSupport={() => setShowSupportModal(true)}
        userId={user?.id || user?.uid}
      />

      {/* Global Modals */}
      {showHowToPlayModal && (
        <UserHowToPlayModal onClose={() => setShowHowToPlayModal(false)} />
      )}

      {showNotificationsModal && (
        <UserNotificationsModal onClose={() => setShowNotificationsModal(false)} />
      )}

      {showSupportModal && (
        <UserSupportModal onClose={() => setShowSupportModal(false)} />
      )}

      {showGiftRedeemModal && (
        <GiftRedeemModal
          isOpen={showGiftRedeemModal}
          onClose={() => setShowGiftRedeemModal(false)}
        />
      )}
    </div>
  );
};
