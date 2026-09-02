import { GameType, BetType, BetSelection, GameSettings } from '../types.js';

class ApiService {
  private userUid: string = '';
  private sessionToken: string = '';
  private adminToken: string = '';

  setUserUid(uid: string) {
    this.userUid = uid;
    if (uid) {
      localStorage.setItem('wingo_user_uid', uid);
    } else {
      localStorage.removeItem('wingo_user_uid');
    }
  }

  getUserUid(): string {
    const saved = localStorage.getItem('wingo_user_uid');
    if (saved) this.userUid = saved;
    return this.userUid || '';
  }

  setSessionToken(token: string) {
    this.sessionToken = token;
    if (token) {
      localStorage.setItem('wingo_session_token', token);
    } else {
      localStorage.removeItem('wingo_session_token');
    }
  }

  getSessionToken(): string {
    const saved = localStorage.getItem('wingo_session_token');
    if (saved) this.sessionToken = saved;
    return this.sessionToken || '';
  }

  clearUserSession() {
    this.userUid = '';
    this.sessionToken = '';
    localStorage.removeItem('wingo_user_uid');
    localStorage.removeItem('wingo_session_token');
  }

  setAdminToken(token: string) {
    this.adminToken = token;
    localStorage.setItem('wingo_admin_token', token);
  }

  getAdminToken(): string {
    const saved = localStorage.getItem('wingo_admin_token');
    if (saved) this.adminToken = saved;
    return this.adminToken;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-user-uid': this.getUserUid(),
      'x-session-token': this.getSessionToken(),
      ...(options.headers as Record<string, string>),
    };

    const token = this.getAdminToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    let data: any = {};
    try {
      data = await res.json();
    } catch {
      data = { error: res.statusText || 'Server response error' };
    }

    if (!res.ok) {
      const error: any = new Error(data.error || 'Server request failed');
      error.code = data.code;
      error.status = res.status;
      throw error;
    }
    return data;
  }

  // User Auth
  async loginUser(identifier: string, password?: string) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (data.user?.uid) {
      this.setUserUid(data.user.uid);
    }
    if (data.sessionToken || data.token) {
      this.setSessionToken(data.sessionToken || data.token);
    }
    return data;
  }

  async registerUser(username: string, phone: string, email?: string, referralCode?: string, password?: string) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, phone, email, referralCode, password }),
    });
    // NOTE: Do not auto-login on register. User logs in explicitly with password.
    return data;
  }

  async checkSession() {
    return this.request('/api/auth/session-check', { method: 'POST' });
  }

  async logoutUser() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      this.clearUserSession();
    }
  }

  async getCurrentUser() {
    return this.request('/api/auth/me');
  }

  async updateProfile(params: { avatarUrl?: string; nickname?: string; username?: string; email?: string }) {
    return this.request('/api/auth/update-profile', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async changePassword(params: { uid?: string; currentPassword?: string; oldPassword?: string; newPassword: string }) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Real-time Games Wallet & Bets (Aviator / Mini Games)
  async updateWalletBalance(userId: string, amount: number, actionType: 'bet' | 'win' | 'refund', note?: string, gameId?: string) {
    return this.request('/api/wallet/update-balance', {
      method: 'POST',
      body: JSON.stringify({ userId, amount, actionType, note, gameId }),
    });
  }

  async recordGameBet(betData: {
    userId: string;
    gameType?: GameType;
    periodId?: string;
    betColor?: any;
    betNumber?: any;
    betBigSmall?: any;
    unitAmount?: number;
    multiplier?: number;
    totalAmount?: number;
    status?: string;
    winAmount?: number;
  }) {
    return this.request('/api/game/record-bet', {
      method: 'POST',
      body: JSON.stringify(betData),
    });
  }

  async forgotPassword(identifier: string, newPassword?: string) {
    return this.request('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, newPassword }),
    });
  }

  async getNotifications() {
    return this.request('/api/notifications');
  }

  async getPublicSettings() {
    return this.request('/api/system/public-settings');
  }

  // Game APIs for User
  async getCurrentPeriod(gameType: GameType) {
    return this.request(`/api/game/current/${gameType}`);
  }

  async getLiveGame(gameType: GameType) {
    return this.request(`/api/game/current/${gameType}`);
  }

  async placeBet(params: {
    uid?: string;
    username?: string;
    gameType: GameType;
    periodId?: string;
    betType: BetType;
    selection: BetSelection;
    amount: number;
    multiplier?: number;
  }) {
    return this.request('/api/game/bet', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getGameHistory(gameType: GameType) {
    return this.request(`/api/game/history/${gameType}`);
  }

  async getMyBets(uid?: string, gameType?: string) {
    const params = new URLSearchParams();
    if (uid) params.append('uid', uid);
    if (gameType && gameType !== 'all') params.append('gameType', gameType);
    return this.request(`/api/game/my-bets?${params.toString()}`);
  }

  // User Wallet
  async submitDeposit(params: {
    uid?: string;
    username?: string;
    amount: number;
    paymentMethod: string;
    utrReference?: string;
    utrNumber?: string;
    note?: string;
  }) {
    const utr = (params.utrReference || params.utrNumber || '').trim();
    return this.request('/api/wallet/deposit-request', {
      method: 'POST',
      body: JSON.stringify({
        ...params,
        utrReference: utr,
        utrNumber: utr,
      }),
    });
  }

  async submitDepositRequest(params: {
    uid?: string;
    username?: string;
    amount: number;
    paymentMethod: string;
    utrReference?: string;
    utrNumber?: string;
    note?: string;
  }) {
    return this.submitDeposit(params);
  }

  async submitWithdrawal(params: {
    uid?: string;
    username?: string;
    amount: number;
    bankUpiDetails: any;
    note?: string;
  }) {
    return this.request('/api/wallet/withdrawal-request', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async submitWithdrawalRequest(params: {
    uid?: string;
    username?: string;
    amount: number;
    bankUpiDetails: any;
    note?: string;
  }) {
    return this.submitWithdrawal(params);
  }

  async getTransactions() {
    return this.request('/api/wallet/transactions');
  }

  async getUserTransactions(uid?: string) {
    const params = new URLSearchParams();
    if (uid) params.append('uid', uid);
    return this.request(`/api/wallet/transactions?${params.toString()}`);
  }

  async getVipInfo() {
    return this.request('/api/vip/info');
  }

  async claimVipReward(rewardType: string, level: number, amount: number) {
    return this.request('/api/vip/claim-reward', {
      method: 'POST',
      body: JSON.stringify({ rewardType, level, amount }),
    });
  }

  async getReferralInfo() {
    return this.request('/api/referral/info');
  }

  async claimReferralCommission() {
    return this.request('/api/referral/claim-commission', {
      method: 'POST',
    });
  }

  async claimGet500Bonus(taskId: string, taskReward: number) {
    return this.request('/api/bonus/claim-get500', {
      method: 'POST',
      body: JSON.stringify({ taskId, taskReward }),
    });
  }

  async getActivePromotions() {
    return this.request('/api/promotions/active');
  }

  async getPublicBanners() {
    return this.request('/api/banners');
  }

  async getPublicMaintenanceStatus() {
    return this.request('/api/maintenance/status');
  }

  // Admin APIs
  async loginAdmin(email: string, password?: string) {
    const data = await this.request('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      this.setAdminToken(data.token);
    }
    return data;
  }

  async getAdminMe() {
    return this.request('/api/admin/auth/me');
  }

  async getAdminStats(filter?: string | { periodType?: string; date?: string; month?: string; year?: string; startDate?: string; endDate?: string }) {
    if (typeof filter === 'string') {
      const query = filter ? `?date=${filter}` : '';
      return this.request(`/api/admin/dashboard-stats${query}`);
    } else if (filter && typeof filter === 'object') {
      const params = new URLSearchParams();
      if (filter.periodType) params.append('periodType', filter.periodType);
      if (filter.date) params.append('date', filter.date);
      if (filter.month) params.append('month', filter.month);
      if (filter.year) params.append('year', filter.year);
      if (filter.startDate) params.append('startDate', filter.startDate);
      if (filter.endDate) params.append('endDate', filter.endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      return this.request(`/api/admin/dashboard-stats${query}`);
    }
    return this.request('/api/admin/dashboard-stats');
  }

  // ===================== CROWN ADMIN CONTROL APIS =====================
  async getGameControlOverview() {
    return this.request('/api/admin/game-control/overview');
  }

  async setGameAutoMode(gameType: string, mode: string) {
    return this.request('/api/admin/game-control/set-auto-mode', {
      method: 'POST',
      body: JSON.stringify({ gameType, mode }),
    });
  }

  async setGameAutoRules(rules: any[]) {
    return this.request('/api/admin/game-control/set-auto-rules', {
      method: 'POST',
      body: JSON.stringify({ rules }),
    });
  }

  async lockGameWinningNumber(gameType: string, periodId: string, number: number | null, adminUsername?: string) {
    return this.request('/api/admin/game-control/lock-number', {
      method: 'POST',
      body: JSON.stringify({ gameType, periodId, number, adminUsername }),
    });
  }

  async lockWingoResult(gameType: string, periodId: string, number: number, adminUsername?: string) {
    return this.lockGameWinningNumber(gameType, periodId, number, adminUsername);
  }

  async clearWingoLock(gameType: string, periodId: string, adminUsername?: string) {
    return this.lockGameWinningNumber(gameType, periodId, null, adminUsername);
  }

  async getAdminWithdrawSettings() {
    return this.request('/api/admin/withdraw-settings');
  }

  async updateAdminWithdrawSettings(settings: any, adminUsername?: string) {
    return this.request('/api/admin/withdraw-settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  async getPublicWithdrawSettings() {
    return this.request('/api/withdraw-settings/public');
  }

  async getAdminPaymentMethods() {
    return this.request('/api/admin/payment-methods');
  }

  async createAdminPaymentMethod(method: any, adminUsername?: string) {
    return this.request('/api/admin/payment-methods', {
      method: 'POST',
      body: JSON.stringify({ ...method, adminUsername }),
    });
  }

  async updateAdminPaymentMethod(id: string, method: any, adminUsername?: string) {
    return this.request(`/api/admin/payment-methods/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...method, adminUsername }),
    });
  }

  async deleteAdminPaymentMethod(id: string, adminUsername?: string) {
    return this.request(`/api/admin/payment-methods/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getPublicPaymentMethods() {
    return this.request('/api/payment-methods/public');
  }

  async getAdminBonusCommission() {
    return this.request('/api/admin/bonus-commission');
  }

  async updateAdminBonusCommission(settings: any, adminUsername?: string) {
    return this.request('/api/admin/bonus-commission', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  async getAdminReferralSettings() {
    return this.request('/api/admin/referral-settings');
  }

  async updateAdminReferralSettings(settings: any, adminUsername?: string) {
    return this.request('/api/admin/referral-settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  async getAdminUsers(search?: string, status?: string) {
    const params = new URLSearchParams();
    if (search && search.trim() && search.trim().toLowerCase() !== 'all') {
      params.append('search', search.trim());
    }
    if (status && status !== 'all') {
      params.append('status', status);
    }
    return this.request(`/api/admin/users?${params.toString()}`);
  }

  async adminAdjustUserVip(uid: string, vipLevel: number, vipExp?: number, rewardBonus?: number, reason?: string, adminUsername?: string) {
    return this.request(`/api/admin/users/${uid}/vip-adjust`, {
      method: 'POST',
      body: JSON.stringify({ vipLevel, vipExp, rewardBonus, reason, adminUsername }),
    });
  }

  async adminCreateUser(userData: { username: string; phone: string; email?: string; password?: string; initialBalance?: number; adminUsername?: string }) {
    return this.request('/api/admin/users/create', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async adminDeleteUser(uid: string, adminUsername?: string) {
    return this.request(`/api/admin/users/${uid}/delete`, {
      method: 'POST',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminUserDetails(uid: string) {
    return this.request(`/api/admin/users/${uid}`);
  }

  async updateUserStatus(uid: string, status: string, reason: string, adminUsername: string) {
    return this.request(`/api/admin/users/${uid}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, reason, adminUsername }),
    });
  }

  async adjustUserBalance(uid: string, amount: number, actionType: 'credit' | 'debit', reason: string, adminUsername: string) {
    return this.request(`/api/admin/users/${uid}/balance-adjust`, {
      method: 'POST',
      body: JSON.stringify({ amount, actionType, reason, adminUsername }),
    });
  }

  async resetUserPassword(uid: string, newPassword?: string, adminUsername?: string) {
    return this.request(`/api/admin/users/${uid}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword, adminUsername }),
    });
  }

  async adminUpdateCredentials(params: {
    currentUsername?: string;
    newUsername?: string;
    newEmail?: string;
    newPassword?: string;
    currentPassword?: string;
    adminUsername?: string;
  }) {
    return this.request('/api/admin/auth/update-credentials', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async adminCreateManualDeposit(params: {
    uid: string;
    amount: number;
    utrReference?: string;
    paymentMethod?: string;
    adminNote?: string;
    adminUsername?: string;
  }) {
    return this.request('/api/admin/deposits/manual-create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async adminCreateManualWithdrawal(params: {
    uid: string;
    amount: number;
    payoutUtr?: string;
    bankDetails?: any;
    adminNote?: string;
    adminUsername?: string;
  }) {
    return this.request('/api/admin/withdrawals/manual-create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteAdminUserBankAccount(uid: string, bankId: string, adminUsername: string) {
    return this.request(`/api/admin/users/${uid}/bank-accounts/${bankId}/delete`, {
      method: 'POST',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminDeposits(status?: string, search?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.request(`/api/admin/deposits?${params.toString()}`);
  }

  async approveDeposit(id: string, adminNote: string, adminUsername: string) {
    return this.request(`/api/admin/deposits/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNote, adminUsername }),
    });
  }

  async rejectDeposit(id: string, adminNote: string, adminUsername: string) {
    return this.request(`/api/admin/deposits/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ adminNote, adminUsername }),
    });
  }

  async getAdminWithdrawals(status?: string, search?: string) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return this.request(`/api/admin/withdrawals?${params.toString()}`);
  }

  async approveWithdrawal(id: string, adminNote: string, adminUsername: string) {
    return this.request(`/api/admin/withdrawals/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ adminNote, adminUsername }),
    });
  }

  async rejectWithdrawal(id: string, adminNote: string, adminUsername: string) {
    return this.request(`/api/admin/withdrawals/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ adminNote, adminUsername }),
    });
  }

  async getAdminLiveGame(gameType: GameType) {
    return this.request(`/api/admin/game/current/${gameType}`);
  }

  async setManualGameResult(gameType: GameType, periodId: string, manualResultNumber: number, adminUsername: string) {
    return this.request('/api/admin/game/set-result', {
      method: 'POST',
      body: JSON.stringify({ gameType, periodId, manualResultNumber, adminUsername }),
    });
  }

  async forceSettleGamePeriod(gameType: GameType, forceNumber?: number, adminUsername?: string) {
    return this.request('/api/admin/game/settle-now', {
      method: 'POST',
      body: JSON.stringify({ gameType, forceNumber, adminUsername }),
    });
  }

  async getAdminGameSettings(): Promise<GameSettings> {
    return this.request('/api/admin/game/settings');
  }

  async updateAdminGameSettings(settings: GameSettings, adminUsername: string) {
    return this.request('/api/admin/game/settings/update', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  async getAdminBets(gameType?: string, status?: string, search?: string) {
    const params = new URLSearchParams();
    if (gameType && gameType !== 'all') params.append('gameType', gameType);
    if (status && status !== 'all') params.append('status', status);
    if (search) params.append('search', search);
    return this.request(`/api/admin/bets?${params.toString()}`);
  }

  async getAdminResults(gameType?: string, search?: string) {
    const params = new URLSearchParams();
    if (gameType && gameType !== 'all') params.append('gameType', gameType);
    if (search) params.append('search', search);
    return this.request(`/api/admin/results?${params.toString()}`);
  }

  async getAdminBanners() {
    return this.request('/api/admin/banners');
  }

  async createBanner(banner: { title: string; imageUrl: string; linkUrl?: string }, adminUsername: string) {
    return this.request('/api/admin/banners/create', {
      method: 'POST',
      body: JSON.stringify({ ...banner, adminUsername }),
    });
  }

  async deleteBanner(id: string, adminUsername: string) {
    return this.request(`/api/admin/banners/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminVipLevels() {
    return this.request('/api/admin/vip-levels');
  }

  async updateAdminVipLevels(vipLevels: any[], adminUsername: string) {
    return this.request('/api/admin/vip-levels/update', {
      method: 'POST',
      body: JSON.stringify({ vipLevels, adminUsername }),
    });
  }

  async getAdminReferrals() {
    return this.request('/api/admin/referrals');
  }

  async getAdminReports(reportType: string, range: string) {
    return this.request(`/api/admin/reports/${reportType}?range=${range}`);
  }

  async getAdminStaffList() {
    return this.request('/api/admin/admins');
  }

  async getAdminActivityLogs() {
    return this.request('/api/admin/activity-logs');
  }

  async getPlatformSettings() {
    return this.request('/api/admin/system/settings');
  }

  async getPublicPlatformSettings() {
    return this.request('/api/platform/settings');
  }

  async updatePlatformSettings(settings: any, adminUsername: string) {
    return this.request('/api/admin/system/settings/update', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  // ===================== BANK BENEFICIARY APIS =====================
  async getBankAccounts() {
    return this.request('/api/wallet/bank-accounts');
  }

  async addBankAccount(data: { accountHolder: string; accountNumber: string; ifsc: string; bankName?: string; upiId?: string }) {
    return this.request('/api/wallet/bank-accounts/add', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteBankAccount(id: string, password: string) {
    return this.request('/api/wallet/bank-accounts/delete', {
      method: 'POST',
      body: JSON.stringify({ id, password }),
    });
  }

  async adminDeleteUserBankAccount(uid: string, bankId: string, adminUsername?: string) {
    return this.request(`/api/admin/users/${uid}/bank-accounts/${bankId}/delete`, {
      method: 'POST',
      body: JSON.stringify({ adminUsername }),
    });
  }

  // ===================== USER & ADMIN SUPPORT & AI CHAT =====================
  async getMySupportChat() {
    return this.request('/api/support/my-chat');
  }

  async sendSupportMessage(params: { message?: string; mediaUrl?: string; mediaType?: 'image' | 'video' | 'file'; fileName?: string; escalate?: boolean }) {
    return this.request('/api/support/message', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async escalateSupportToAdmin() {
    return this.request('/api/support/escalate', {
      method: 'POST',
    });
  }

  async getAdminSupportTickets() {
    return this.request('/api/admin/support/tickets');
  }

  async replyAdminSupportTicket(ticketId: string, message?: string, adminUsername?: string, mediaUrl?: string, mediaType?: 'image' | 'video' | 'file', fileName?: string) {
    return this.request('/api/admin/support/reply', {
      method: 'POST',
      body: JSON.stringify({ ticketId, message, adminUsername, mediaUrl, mediaType, fileName }),
    });
  }

  async closeAdminSupportTicket(ticketId: string, adminUsername?: string) {
    return this.request('/api/admin/support/close', {
      method: 'POST',
      body: JSON.stringify({ ticketId, adminUsername }),
    });
  }

  async getAdminSupportUnreadCount() {
    return this.request('/api/admin/support/unread-count');
  }

  // ===================== DEPOSIT AMOUNT-WISE BONUS TIERS =====================
  async getDepositBonusTiers() {
    return this.request('/api/deposit-bonus-tiers');
  }

  async updateAdminDepositBonusTiers(tiers: any[], adminUsername?: string) {
    return this.request('/api/admin/deposit-bonus-tiers', {
      method: 'POST',
      body: JSON.stringify({ tiers, adminUsername }),
    });
  }

  async addAdminDepositBonusTier(tier: any, adminUsername?: string) {
    return this.request('/api/admin/deposit-bonus-tiers/add', {
      method: 'POST',
      body: JSON.stringify({ ...tier, adminUsername }),
    });
  }

  async deleteAdminDepositBonusTier(id: string, adminUsername?: string) {
    return this.request(`/api/admin/deposit-bonus-tiers/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  // ===================== BONUS TASKS (GET ₹500 & MISSIONS) =====================
  async getBonusTasks() {
    return this.request('/api/bonus/tasks-config');
  }

  async getAdminBonusTasks() {
    return this.request('/api/admin/bonus-tasks');
  }

  async updateAdminBonusTasks(tasks: any[], adminUsername?: string) {
    return this.request('/api/admin/bonus-tasks/update', {
      method: 'POST',
      body: JSON.stringify({ tasks, adminUsername }),
    });
  }

  async addAdminBonusTask(task: any, adminUsername?: string) {
    return this.request('/api/admin/bonus-tasks/add', {
      method: 'POST',
      body: JSON.stringify({ ...task, adminUsername }),
    });
  }

  async deleteAdminBonusTask(id: string, adminUsername?: string) {
    return this.request(`/api/admin/bonus-tasks/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  // ===================== ACTIVITY CENTER PROMOTIONS =====================
  async getActivityPromos() {
    return this.request('/api/promotions/activity-config');
  }

  async getAdminActivityPromos() {
    return this.request('/api/admin/activity-promos');
  }

  async updateAdminActivityPromos(activities: any[], adminUsername?: string) {
    return this.request('/api/admin/activity-promos/update', {
      method: 'POST',
      body: JSON.stringify({ activities, adminUsername }),
    });
  }

  async addAdminActivityPromo(activity: any, adminUsername?: string) {
    return this.request('/api/admin/activity-promos/add', {
      method: 'POST',
      body: JSON.stringify({ ...activity, adminUsername }),
    });
  }

  async deleteAdminActivityPromo(id: string, adminUsername?: string) {
    return this.request(`/api/admin/activity-promos/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async claimActivityReward(activityId: string, dayIndex?: number) {
    return this.request('/api/bonus/claim-activity', {
      method: 'POST',
      body: JSON.stringify({ activityId, dayIndex }),
    });
  }

  // ===================== ALL GAMES MASTER CONTROLS =====================
  async getAdminAllGameControls() {
    return this.request('/api/admin/all-game-controls');
  }

  async getLudoStatus(): Promise<{ isActive: boolean; maintenanceNotice: string; botDifficulty?: string }> {
    return this.request('/api/game/ludo/status');
  }

  async updateAdminAllGameControls(controls: any, adminUsername?: string) {
    return this.request('/api/admin/all-game-controls', {
      method: 'POST',
      body: JSON.stringify({ controls, adminUsername }),
    });
  }

  async startMinesGame(uid: string, numMines: number, betAmount: number) {
    return this.request('/api/game/mines/start', {
      method: 'POST',
      body: JSON.stringify({ uid, numMines, betAmount }),
    });
  }

  async decideRouletteResult(bets: Record<string, number>, pool: number) {
    return this.request('/api/game/roulette/decide', {
      method: 'POST',
      body: JSON.stringify({ bets, pool }),
    });
  }

  async decideAviatorCrash(totalBet: number) {
    return this.request('/api/game/aviator/decide', {
      method: 'POST',
      body: JSON.stringify({ totalBet }),
    });
  }
  // ===================== ADMIN LIVE SUITE & REDESIGNED CONTROLS =====================
  async getAdminLiveCounts() {
    return this.request('/api/admin/live-counts');
  }

  async getAdminGamesCatalog() {
    return this.request('/api/admin/games-catalog');
  }

  async toggleAdminGameCatalog(gameKey: string, adminUsername?: string) {
    return this.request(`/api/admin/games-catalog/${gameKey}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async updateAdminGameCatalog(gameKey: string, params: any) {
    return this.request(`/api/admin/games-catalog/${gameKey}/update`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAdminNotifications() {
    return this.request('/api/admin/notifications');
  }

  async sendAdminNotification(params: any) {
    return this.request('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async deleteAdminNotification(id: string, adminUsername?: string) {
    return this.request(`/api/admin/notifications/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminSupportLinks() {
    return this.request('/api/admin/support-links');
  }

  async addAdminSupportLink(params: any) {
    return this.request('/api/admin/support-links', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateAdminSupportLink(id: string, params: any) {
    return this.request(`/api/admin/support-links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteAdminSupportLink(id: string, adminUsername?: string) {
    return this.request(`/api/admin/support-links/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminMaintenance() {
    return this.request('/api/admin/maintenance');
  }

  async toggleAdminMaintenance(isEnabled: boolean, reason?: string, adminUsername?: string) {
    return this.request('/api/admin/maintenance/toggle', {
      method: 'POST',
      body: JSON.stringify({ isEnabled, reason, adminUsername }),
    });
  }

  async updateAdminMaintenance(params: any) {
    return this.request('/api/admin/maintenance/update', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getAdminStaff() {
    return this.request('/api/admin/admins');
  }

  async createAdminStaff(params: any) {
    return this.request('/api/admin/admins/create', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateAdminStaff(id: string, params: any) {
    return this.request(`/api/admin/admins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteAdminStaff(id: string, adminUsername?: string) {
    return this.request(`/api/admin/admins/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminLedgerTransactions(params?: { search?: string; type?: string; status?: string; startDate?: string; endDate?: string }) {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.type) q.set('type', params.type);
    if (params?.status) q.set('status', params.status);
    if (params?.startDate) q.set('startDate', params.startDate);
    if (params?.endDate) q.set('endDate', params.endDate);
    const queryStr = q.toString() ? `?${q.toString()}` : '';
    return this.request(`/api/admin/transactions${queryStr}`);
  }

  async getAdminMaintenanceConfig() {
    return this.getAdminMaintenance();
  }

  async updateAdminMaintenanceConfig(params: any) {
    return this.updateAdminMaintenance(params);
  }

  async createAdminNotification(params: any) {
    return this.sendAdminNotification(params);
  }

  async createAdminSupportLink(params: any) {
    return this.addAdminSupportLink(params);
  }

  async createAdminBanner(params: any) {
    return this.request('/api/admin/banners', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async updateAdminBanner(id: string, params: any) {
    return this.request(`/api/admin/banners/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  }

  async deleteAdminBanner(id: string, adminUsername?: string) {
    return this.request(`/api/admin/banners/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async getAdminTransactions(type?: string) {
    return this.getAdminLedgerTransactions({ type });
  }

  async approveAdminWithdrawal(id: string, adminUsername: string, remarks?: string) {
    return this.approveWithdrawal(id, remarks || 'Approved by admin', adminUsername);
  }

  async rejectAdminWithdrawal(id: string, reason: string, adminUsername: string) {
    return this.rejectWithdrawal(id, reason, adminUsername);
  }

  async approveAdminDeposit(id: string, adminUsername: string, remarks?: string) {
    return this.approveDeposit(id, remarks || 'Approved by admin', adminUsername);
  }

  async rejectAdminDeposit(id: string, reason: string, adminUsername: string) {
    return this.rejectDeposit(id, reason, adminUsername);
  }

  // VIP Tiers
  async getVipTiers() {
    return this.request('/api/vip-tiers');
  }

  async getAdminVipTiers() {
    return this.request('/api/admin/vip-tiers');
  }

  async updateAdminVipTiers(tiers: any[], adminUsername?: string) {
    return this.request('/api/admin/vip-tiers', {
      method: 'POST',
      body: JSON.stringify({ tiers, adminUsername }),
    });
  }

  // Comprehensive Bonus Master Settings
  async getAdminBonusAllSettings() {
    return this.request('/api/admin/bonus-all-settings');
  }

  async updateAdminBonusAllSettings(settings: any, adminUsername?: string) {
    return this.request('/api/admin/bonus-all-settings', {
      method: 'POST',
      body: JSON.stringify({ ...settings, adminUsername }),
    });
  }

  // Admin Official UPI Payment Details (Section A)
  async getAdminUpiDetails() {
    return this.request('/api/admin/upi-details');
  }

  async updateAdminUpiDetails(upiDetails: any, adminUsername?: string) {
    return this.request('/api/admin/upi-details', {
      method: 'POST',
      body: JSON.stringify({ ...upiDetails, adminUsername }),
    });
  }

  async deleteAdminUpiDetails(adminUsername?: string) {
    return this.request('/api/admin/upi-details', {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  // Admin Official Bank Details (Section B)
  async getAdminBankDetails() {
    return this.request('/api/admin/bank-details');
  }

  async getPublicPaymentDetails() {
    return this.request('/api/public/payment-details');
  }

  async getPublicAdminBank() {
    return this.request('/api/payment-methods/admin-bank');
  }

  async updateAdminBankDetails(bankDetails: any, adminUsername?: string) {
    return this.request('/api/admin/bank-details', {
      method: 'POST',
      body: JSON.stringify({ ...bankDetails, adminUsername }),
    });
  }

  async deleteAdminBankDetails(adminUsername?: string) {
    return this.request('/api/admin/bank-details', {
      method: 'DELETE',
      body: JSON.stringify({ adminUsername }),
    });
  }

  async setAutoResultRules(rules: any[], adminUsername?: string) {
    return this.request('/api/admin/auto-rules', {
      method: 'POST',
      body: JSON.stringify({ rules, adminUsername }),
    });
  }

  // Chess Game APIs
  async createChessRoom(entryAmount: number, preferredColor: string = 'random') {
    return this.request('/api/chess/room/create', {
      method: 'POST',
      body: JSON.stringify({ entryAmount, preferredColor }),
    });
  }

  async joinChessRoom(roomCode: string) {
    return this.request('/api/chess/room/join', {
      method: 'POST',
      body: JSON.stringify({ roomCode }),
    });
  }

  async cancelChessRoom(matchId: string) {
    return this.request('/api/chess/room/cancel', {
      method: 'POST',
      body: JSON.stringify({ matchId }),
    });
  }

  async createChessMatch(entryAmount: number, botDifficulty: string = 'medium', preferredColor: string = 'random') {
    return this.request('/api/chess/match/create', {
      method: 'POST',
      body: JSON.stringify({ entryAmount, botDifficulty, preferredColor }),
    });
  }

  async getChessMatch(matchId: string) {
    return this.request(`/api/chess/match/${matchId}`);
  }

  async makeChessMove(matchId: string, from: string, to: string, promotion: string = 'q') {
    return this.request(`/api/chess/match/${matchId}/move`, {
      method: 'POST',
      body: JSON.stringify({ from, to, promotion }),
    });
  }

  async resignChessMatch(matchId: string) {
    return this.request(`/api/chess/match/${matchId}/resign`, {
      method: 'POST',
    });
  }

  async getChessHistory() {
    return this.request('/api/chess/user-history');
  }
}

export const api = new ApiService();
