import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LanguageProvider } from './context/LanguageContext.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { AdminLogin } from './components/admin/AdminLogin.js';
import { AdminLayout } from './components/admin/AdminLayout.js';
import { DashboardView } from './components/admin/DashboardView.js';
import { GameManagementView } from './components/admin/GameManagementView.js';
import { UserManagementView } from './components/admin/UserManagementView.js';
import { UserDetailsView } from './components/admin/UserDetailsView.js';
import { BetManagementView } from './components/admin/BetManagementView.js';
import { DepositManagementView } from './components/admin/DepositManagementView.js';
import { WithdrawalManagementView } from './components/admin/WithdrawalManagementView.js';
import { TransactionsView } from './components/admin/TransactionsView.js';
import { ResultManagementView } from './components/admin/ResultManagementView.js';
import { ReportsAnalyticsView } from './components/admin/ReportsAnalyticsView.js';
import { NotificationView } from './components/admin/NotificationView.js';
import { BannerManagementView } from './components/admin/BannerManagementView.js';
import { SupportLinksView } from './components/admin/SupportLinksView.js';
import { SettingsView } from './components/admin/SettingsView.js';
import { AdminManagementView } from './components/admin/AdminManagementView.js';
import { MaintenanceModeView } from './components/admin/MaintenanceModeView.js';
import { WingoGameDashboardView } from './components/admin/WingoGameDashboardView.js';
import { ResultControlView } from './components/admin/ResultControlView.js';
import { GameSettingsView } from './components/admin/GameSettingsView.js';
import { PromotionsView } from './components/admin/PromotionsView.js';
import { ReportsView } from './components/admin/ReportsView.js';
import { SystemManagementView } from './components/admin/SystemManagementView.js';
import { SupportTicketsCrownView } from './components/admin/SupportTicketsCrownView.js';
import { PaymentMethodsCrownView } from './components/admin/PaymentMethodsCrownView.js';
import { BonusCommissionCrownView } from './components/admin/BonusCommissionCrownView.js';
import { GameControlCrownView } from './components/admin/GameControlCrownView.js';
import { WingoControlCenterMobileView } from './components/admin/WingoControlCenterMobileView.js';
import { GameWinningCutSettingsView } from './components/admin/GameWinningCutSettingsView.js';
import { GameControlCenterView } from './components/admin/GameControlCenterView.js';
import { VipBonusManagementView } from './components/admin/VipBonusManagementView.js';
import { PredictionBigSmallView } from './components/admin/PredictionBigSmallView.js';
import { GiftCodeManagementView } from './components/admin/GiftCodeManagementView.js';
import { UserGamePanel } from './components/user/UserGamePanel.js';

const MainApp: React.FC = () => {
  const { activeMode, admin } = useAuth();
  const [adminTab, setAdminTab] = useState<string>('dashboard');
  const [selectedUserDetailsUid, setSelectedUserDetailsUid] = useState<string | null>(null);

  // If user mode is active, show the User Mobile Gaming Application
  if (activeMode === 'user') {
    return <UserGamePanel />;
  }

  // If in admin mode but not authenticated, render Admin Login screen
  if (!admin) {
    return <AdminLogin />;
  }

  // Handle detailed user view navigation
  const handleViewUserDetails = (uid: string) => {
    setSelectedUserDetailsUid(uid);
    setAdminTab('user_details_view');
  };

  const handleBackToUsers = () => {
    setSelectedUserDetailsUid(null);
    setAdminTab('users_management');
  };

  const renderAdminContent = () => {
    if (adminTab === 'user_details_view' && selectedUserDetailsUid) {
      return (
        <UserDetailsView
          uid={selectedUserDetailsUid}
          onBack={handleBackToUsers}
        />
      );
    }

    switch (adminTab) {
      // 16 Main Sidebar Menu Items
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setAdminTab(tab)} />;
      case 'game_management':
        return <GameManagementView />;
      case 'users_management':
        return <UserManagementView initialStatusFilter="all" onViewUserDetails={handleViewUserDetails} />;
      case 'bets_management':
        return <BetManagementView />;
      case 'deposit_requests':
        return <DepositManagementView />;
      case 'withdrawal_requests':
        return <WithdrawalManagementView />;
      case 'transactions':
        return <TransactionsView />;
      case 'result_management':
        return <ResultManagementView />;
      case 'reports_analytics':
        return <ReportsAnalyticsView />;
      case 'referral_management':
        return <PromotionsView defaultSubTab="promotions_referrals" />;
      case 'notification':
        return <NotificationView />;
      case 'banner_management':
        return <BannerManagementView />;
      case 'support_links':
        return <SupportLinksView />;
      case 'settings':
        return <SettingsView />;
      case 'admin_management':
        return <AdminManagementView />;
      case 'maintenance_mode':
        return <MaintenanceModeView />;

      // Sub-routes & Action Redirections
      case 'support_desk':
        return <SupportTicketsCrownView />;
      case 'users_all':
        return <UserManagementView initialStatusFilter="all" onViewUserDetails={handleViewUserDetails} />;
      case 'users_active':
        return <UserManagementView initialStatusFilter="active" onViewUserDetails={handleViewUserDetails} />;
      case 'users_blocked':
        return <UserManagementView initialStatusFilter="blocked" onViewUserDetails={handleViewUserDetails} />;

      case 'deposits':
        return <DepositManagementView />;
      case 'withdrawals':
        return <WithdrawalManagementView />;
      case 'payment_methods':
        return <PaymentMethodsCrownView />;

      case 'wingo_live_control':
        return <WingoControlCenterMobileView onNavigateTab={(tab) => setAdminTab(tab)} />;
      case 'game_winning_cut':
        return <GameWinningCutSettingsView />;
      case 'wingo_dashboard':
        return <WingoGameDashboardView onNavigateToControl={() => setAdminTab('wingo_result_control')} />;
      case 'wingo_result_control':
        return <ResultControlView />;
      case 'wingo_results':
        return <ResultManagementView />;
      case 'wingo_bets':
        return <BetManagementView />;
      case 'wingo_settings':
        return <GameSettingsView />;
      case 'game_control':
        return <GameControlCenterView />;
      case 'prediction_chat':
        return <PredictionBigSmallView />;
      case 'vip_bonus_management':
        return <VipBonusManagementView />;
      case 'gift_codes':
        return <GiftCodeManagementView />;
      case 'mines_control':
        return <GameControlCrownView defaultActiveTab="mines" />;
      case 'roulette_control':
        return <GameControlCrownView defaultActiveTab="roulette" />;
      case 'aviator_control':
        return <GameControlCrownView defaultActiveTab="aviator" />;

      case 'promotions_bonus':
        return <VipBonusManagementView />;
      case 'bonus_commission':
        return <VipBonusManagementView />;
      case 'promotions_vip':
        return <VipBonusManagementView />;
      case 'promotions_referrals':
        return <PromotionsView defaultSubTab="promotions_referrals" />;

      case 'reports_daily':
        return <ReportsView defaultReportType="reports_daily" />;
      case 'reports_betting':
        return <ReportsView defaultReportType="reports_betting" />;
      case 'reports_deposit':
        return <ReportsView defaultReportType="reports_deposit" />;
      case 'reports_withdrawal':
        return <ReportsView defaultReportType="reports_withdrawal" />;
      case 'reports_user':
        return <ReportsView defaultReportType="reports_user" />;
      case 'reports_profit_loss':
        return <ReportsView defaultReportType="reports_profit_loss" />;

      case 'system_social':
        return <SystemManagementView defaultSubTab="system_social" />;
      case 'system_admins':
        return <SystemManagementView defaultSubTab="system_admins" />;
      case 'system_activity_logs':
        return <SystemManagementView defaultSubTab="system_activity_logs" />;
      case 'system_settings':
        return <SystemManagementView defaultSubTab="system_settings" />;

      default:
        return <DashboardView onNavigate={(tab) => setAdminTab(tab)} />;
    }
  };

  return (
    <AdminLayout currentTab={adminTab} setCurrentTab={setAdminTab}>
      {renderAdminContent()}
    </AdminLayout>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
