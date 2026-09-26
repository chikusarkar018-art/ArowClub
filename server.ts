import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.js';
import { gameEngine } from './server/gameEngine.js';
import { gameManager } from './server/gameManager.js';
import { liveCasinoEngine } from './server/liveCasinoEngine.js';
import { GameType, AdminRole, User } from './src/types.js';
import { GoogleGenAI } from '@google/genai';
import { 
  loadDataFromFirestore, 
  syncDataToFirestore, 
  saveUserPermanently, 
  deleteUserPermanently, 
  findUserInFirestore, 
  saveTransactionPermanently, 
  saveBetPermanently,
  saveDepositPermanently,
  saveWithdrawalPermanently,
  saveGiftCodePermanently,
  deleteGiftCodePermanently,
  findGiftCodeInFirestore,
  loadAllGiftCodesFromFirestore
} from './server/firebaseDb.js';

let genAI: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
} catch (err) {
  console.warn('Failed to initialize GoogleGenAI:', err);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // ===================== HELPER FUNCTIONS =====================
  const logAdminAction = (adminUsername: string, action: string, details: string, targetUid?: string, prevVal?: string, newVal?: string, req?: express.Request) => {
    const log = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      adminId: 'admin',
      adminUsername: adminUsername || 'SuperAdmin',
      action,
      target: targetUid || 'System',
      targetUid,
      details,
      previousValue: prevVal,
      newValue: newVal,
      ipAddress: req?.ip || '127.0.0.1',
      ip: req?.ip || '127.0.0.1',
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.activityLogs.unshift(log);
  };

  // Company official master invitation code (Strictly numeric)
  const COMPANY_REFERRAL_CODE = '100001';

  // Helper to generate a unique numeric-only referral code for each user (strictly digits 0-9)
  const generateNumericReferralCode = (existingUsers: any[]): string => {
    let code = '';
    let attempts = 0;
    while (attempts < 500) {
      attempts++;
      // Generate a clean 7-digit numeric code (e.g. 8392147)
      code = String(Math.floor(1000000 + Math.random() * 9000000));
      if (code !== COMPANY_REFERRAL_CODE && !existingUsers.some(u => u && u.referralCode === code)) {
        return code;
      }
    }
    return String(Math.floor(10000000 + Math.random() * 90000000));
  };

  // Ensure all existing users in the database have pure numeric referral codes (NO English letters)
  let dbChanged = false;
  for (const u of db.users.values()) {
    if (!u.referralCode || !/^\d{5,12}$/.test(String(u.referralCode))) {
      const allList = Array.from(db.users.values());
      u.referralCode = generateNumericReferralCode(allList);
      dbChanged = true;
    }
  }
  if (dbChanged) {
    db.saveToDisk();
  }

  // Centralized VIP & Deposit Calculation Engine
  const recalculateUserVip = (user: any) => {
    if (!user) return user;
    user.totalDeposit = Number((Number(user.totalDeposit || 0)).toFixed(2));
    user.totalBet = Number((Number(user.totalBet || 0)).toFixed(2));
    user.walletBalance = Number((Number(user.walletBalance || 0)).toFixed(2));
    
    // VIP EXP is earned from Total Deposits (₹1 deposit = 1 EXP) + Game turnover
    const calculatedExp = Number(((user.totalDeposit || 0) + (user.totalBet || 0)).toFixed(2));
    user.vipExp = Math.max(Number(user.vipExp || 0), calculatedExp);

    // VIP Tier thresholds:
    // VIP 1: 3,000 EXP
    // VIP 2: 10,000 EXP
    // VIP 3: 30,000 EXP
    // VIP 4: 80,000 EXP
    // VIP 5: 200,000 EXP
    // VIP 6: 500,000 EXP
    // VIP 7: 1,200,000 EXP
    // VIP 8: 3,000,000 EXP
    // VIP 9: 5,000,000 EXP
    // VIP 10: 10,000,000 EXP
    const vipTiers = [
      { level: 10, requiredExp: 10000000 },
      { level: 9, requiredExp: 5000000 },
      { level: 8, requiredExp: 3000000 },
      { level: 7, requiredExp: 1200000 },
      { level: 6, requiredExp: 500000 },
      { level: 5, requiredExp: 200000 },
      { level: 4, requiredExp: 80000 },
      { level: 3, requiredExp: 30000 },
      { level: 2, requiredExp: 10000 },
      { level: 1, requiredExp: 3000 },
    ];

    let calculatedLevel = 0;
    for (const tier of vipTiers) {
      if (user.vipExp >= tier.requiredExp) {
        calculatedLevel = tier.level;
        break;
      }
    }

    // Preserve manual higher VIP level if granted by admin, otherwise promote
    const currentLvl = Number(user.vipLevel || 0);
    user.vipLevel = Math.max(currentLvl, calculatedLevel);

    return user;
  };

  const findAndResolveUser = async (identifier?: any): Promise<User | undefined> => {
    if (!identifier) return undefined;
    const str = String(identifier).trim();
    if (!str) return undefined;

    // 1. Try db.getUser (handles exact, clean, u-prefix, phone, username, email)
    let user = db.getUser(str);
    if (user) return user;

    // 2. Try async cloud lookup
    try {
      user = await db.getUserAsync(str);
      if (user) return user;
    } catch {
      // ignore
    }

    // 3. Fallback: scan memory values for any matching ID variant or digits
    const cleanDigits = str.replace(/\D/g, '');
    for (const u of db.users.values()) {
      if (!u) continue;
      if (u.uid === str || u.id === str || u.id === `u-${str}` || String(u.uid) === str.replace(/^u-/, '')) {
        return u;
      }
      if (cleanDigits.length >= 10 && u.phone) {
        const uDigits = u.phone.replace(/\D/g, '');
        if (uDigits.length >= 10 && cleanDigits.slice(-10) === uDigits.slice(-10)) {
          return u;
        }
      }
    }
    return undefined;
  };

  // ===================== USER AUTH & PROFILE APIS =====================
  app.post('/api/auth/login', async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Please enter your Phone number, UID or Email' });
    }

    const rawId = String(identifier).trim();
    const digitsOnly = rawId.replace(/\D/g, '');

    let user = Array.from(db.users.values()).find(u => {
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const uUid = String(u.uid || '').trim();
      const uUsername = (u.username || '').toLowerCase().trim();
      const uEmail = (u.email || '').toLowerCase().trim();

      // Direct string matches
      if (uUid === rawId) return true;
      if (uUsername === rawId.toLowerCase()) return true;
      if (uEmail === rawId.toLowerCase()) return true;
      if (u.phone === rawId) return true;

      // Phone digits matching (handles +91 prefix vs without +91)
      if (digitsOnly.length >= 7 && uPhoneDigits.length >= 7) {
        if (digitsOnly === uPhoneDigits) return true;
        if (digitsOnly.endsWith(uPhoneDigits) || uPhoneDigits.endsWith(digitsOnly)) return true;
        if (digitsOnly.length >= 10 && uPhoneDigits.length >= 10 && digitsOnly.slice(-10) === uPhoneDigits.slice(-10)) return true;
      }

      return false;
    });

    // If not found in memory (e.g. cold start / server restart), query Cloud Firestore directly
    if (!user) {
      try {
        const cloudUser = await findUserInFirestore(rawId);
        if (cloudUser && (cloudUser.uid || cloudUser.id)) {
          const uidStr = String(cloudUser.uid || String(cloudUser.id).replace(/^u-/, ''));
          db.users.set(uidStr, cloudUser as any);
          user = cloudUser as any;
        }
      } catch (cloudErr) {
        console.warn('Error querying Firestore for user on login:', cloudErr);
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Please check details or Register first.' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'This account is blocked. Please contact customer support.' });
    }

    // Password verification against exact account password set by Admin or User
    const effectivePassword = user.password || '123456';
    const enteredPassword = password !== undefined && password !== null ? String(password).trim() : '';

    if (!enteredPassword) {
      return res.status(400).json({ error: 'Please enter your account password to log in' });
    }

    if (enteredPassword !== effectivePassword) {
      return res.status(401).json({ error: 'Incorrect password. Please enter the exact password set by Admin or contact support.' });
    }

    // Generate unique single active session token for this user
    const sessionToken = `SESSION-${user.uid}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    user.activeSessionId = sessionToken;
    user.activeSessionDevice = (req.headers['user-agent'] || 'Mobile App / Browser').substring(0, 100);
    user.activeSessionTime = new Date().toISOString();
    user.lastLogin = new Date().toISOString();
    user.lastLoginIp = req.ip || '127.0.0.1';

    const totalDeposit = db.getUserTotalDeposit(user);
    user.totalDeposit = totalDeposit;
    const minDep = Number(db.platformSettings?.minDepositToBet ?? 0);
    const enrichedUser = {
      ...user,
      totalDeposit,
      isBettingUnlocked: minDep > 0 ? (totalDeposit >= minDep) : true,
      minDepositToBet: minDep,
    };

    db.saveToDisk();
    saveUserPermanently(user).catch(() => {});

    return res.json({ success: true, user: enrichedUser, token: sessionToken, sessionToken });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { username, phone, email, referralCode, password } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = String(phone).trim();
    const phoneDigits = cleanPhone.replace(/\D/g, '');

    // Check if phone is already registered in memory
    const existingInMemory = Array.from(db.users.values()).find(u => {
      const uDigits = (u.phone || '').replace(/\D/g, '');
      if (phoneDigits.length >= 10 && uDigits.length >= 10 && phoneDigits.slice(-10) === uDigits.slice(-10)) {
        return true;
      }
      return false;
    });

    if (existingInMemory) {
      return res.status(400).json({ error: 'This phone number is already registered. Please go to Login.' });
    }

    // Check if phone is already registered in permanent Cloud Firestore
    try {
      const existingInCloud = await findUserInFirestore(cleanPhone);
      if (existingInCloud) {
        // Hydrate local cache
        const uidStr = String(existingInCloud.uid || String(existingInCloud.id).replace(/^u-/, ''));
        db.users.set(uidStr, existingInCloud as any);
        return res.status(400).json({ error: 'This phone number is already registered. Please go to Login.' });
      }
    } catch {
      // ignore
    }

    // Check if username already exists (Case-insensitive)
    if (username && String(username).trim()) {
      const cleanUname = String(username).trim().toLowerCase();
      const existingUserByName = Array.from(db.users.values()).find(
        u => (u.username || '').trim().toLowerCase() === cleanUname
      );
      if (existingUserByName) {
        return res.status(400).json({ error: 'This username is already taken. Please choose another username.' });
      }
    }

    let newUid = String(Math.floor(10000000 + Math.random() * 90000000));
    while (db.getUser(newUid)) {
      newUid = String(Math.floor(10000000 + Math.random() * 90000000));
    }
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const autoUsername = username || `Member${randomSuffix}`;
    const signupBonus = Number(db.referralSystemSettings?.signupBonus ?? 10);

    const user: any = {
      id: `u-${newUid}`,
      uid: newUid,
      username: autoUsername,
      phone: cleanPhone,
      password: password || '123456',
      email: email || '',
      avatarUrl: '/avatars/default_avatar.jpg',
      walletBalance: signupBonus,
      requiredTurnover: signupBonus,
      completedTurnover: 0,
      remainingTurnover: signupBonus,
      totalDeposit: 0,
      totalWithdrawal: 0,
      totalBet: 0,
      totalWin: 0,
      totalLoss: 0,
      vipLevel: 0,
      vipExp: 0,
      referralCode: generateNumericReferralCode(Array.from(db.users.values())),
      referredBy: null,
      status: 'active' as const,
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      activeSessionId: null, // Note: Not logged in immediately on register
    };

    let signupBonusTx: any = null;
    // Signup bonus transaction for the new user (1X turnover required)
    if (signupBonus > 0) {
      signupBonusTx = {
        id: `TX-SIGNUP-${Date.now()}-${newUid}`,
        uid: newUid,
        type: 'bonus',
        amount: signupBonus,
        status: 'completed',
        previousBalance: 0,
        newBalance: signupBonus,
        reference: 'SIGNUP_BONUS',
        createdBy: 'system',
        note: `New Player Signup Welcome Bonus ₹${signupBonus} (1X Turnover Required)`,
        createdAt: new Date().toISOString(),
      };
      db.transactions.unshift(signupBonusTx);
    }

    let refBonusTx: any = null;
    let referrerUser: any = null;
    // Referral Logic: Only the user whose referral code was used receives the invite bonus!
    const rawInvite = referralCode ? String(referralCode).trim().replace(/\D/g, '') : '';
    if (rawInvite && rawInvite !== COMPANY_REFERRAL_CODE && rawInvite !== '8633323556598') {
      const referrer = Array.from(db.users.values()).find(
        u => (u.referralCode && String(u.referralCode).trim() === rawInvite) || String(u.uid).trim() === rawInvite
      );

      if (referrer && referrer.uid !== user.uid) {
        user.referredBy = referrer.uid;
        // Strictly 10 INR referral bonus for client invite, no extra amount
        const inviteBonus = Number(db.referralSystemSettings?.referralInviteBonus ?? 10);
        if (inviteBonus > 0) {
          referrerUser = referrer;
          const prevRefBal = referrer.walletBalance;
          referrer.walletBalance = Number((referrer.walletBalance + inviteBonus).toFixed(2));
          referrer.requiredTurnover = Number(((referrer.requiredTurnover || 0) + inviteBonus).toFixed(2));
          referrer.remainingTurnover = Number((Math.max(0, referrer.remainingTurnover || 0) + inviteBonus).toFixed(2));
          referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + inviteBonus).toFixed(2));
          referrer.invitedUsersCount = (referrer.invitedUsersCount || 0) + 1;

          refBonusTx = {
            id: `TX-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            uid: referrer.uid,
            type: 'referral_bonus',
            amount: inviteBonus,
            status: 'completed',
            previousBalance: prevRefBal,
            newBalance: referrer.walletBalance,
            reference: `INVITE-${user.uid}`,
            createdBy: 'system',
            note: `Referral Invite Bonus for registering player ${user.username} (UID: ${user.uid}): ₹${inviteBonus}`,
            createdAt: new Date().toISOString(),
          };
          db.transactions.unshift(refBonusTx);

          if (!db.referralSystemSettings.history) db.referralSystemSettings.history = [];
          db.referralSystemSettings.history.unshift({
            id: `ref-h-${Date.now()}`,
            referrerUid: referrer.uid,
            referrerUsername: referrer.username,
            referredUid: user.uid,
            referredUsername: user.username,
            type: 'signup',
            bonusAmount: inviteBonus,
            date: new Date().toISOString(),
          });
        }
      }
    }

    db.users.set(newUid, user);
    db.saveToDisk();

    // PERMANENT STORAGE: Guarantee user is saved immediately into Cloud Firestore
    try {
      await saveUserPermanently(user);
      if (signupBonusTx) {
        await saveTransactionPermanently(signupBonusTx);
      }
      if (referrerUser) {
        await saveUserPermanently(referrerUser);
        if (refBonusTx) {
          await saveTransactionPermanently(refBonusTx);
        }
      }
      console.log(`[PERMANENT SAVE] Registered user UID ${newUid} (${user.phone}) saved permanently to Cloud Firestore.`);
    } catch (saveErr) {
      console.error(`Error during permanent save of user ${newUid}:`, saveErr);
    }

    // NOTE: Client registers, but MUST log in manually after registration
    return res.json({
      success: true,
      message: 'Account registered successfully! Welcome bonus ₹10 credited. Please log in with your phone number and password.',
      phone: cleanPhone,
      uid: newUid,
    });
  });

  app.post('/api/auth/session-check', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string;
    const sessionToken = req.headers['x-session-token'] as string;

    if (!uid) {
      return res.status(401).json({ valid: false, error: 'No active session' });
    }

    let user = db.users.get(uid);
    if (!user) {
      user = await db.getUserAsync(uid);
    }
    if (!user) {
      return res.status(401).json({ valid: false, error: 'User account not found' });
    }

    if (user.status === 'blocked') {
      return res.status(403).json({ valid: false, error: 'Account has been suspended.' });
    }

    // Check if session token matches current active session (Single Session per ID)
    if (user.activeSessionId && sessionToken && user.activeSessionId !== sessionToken) {
      return res.status(401).json({
        valid: false,
        code: 'CONCURRENT_LOGIN_KICKED',
        error: 'Your account was logged in from another device/browser. Only 1 active login is allowed per ID.'
      });
    }

    // Long-lived persistent session (valid for 365 days so clients never get randomly logged out)
    const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
    const sessionCreatedAt = user.activeSessionTime ? new Date(user.activeSessionTime).getTime() : 0;
    if (sessionCreatedAt > 0 && (Date.now() - sessionCreatedAt > ONE_YEAR_MS)) {
      user.activeSessionId = null;
      return res.status(401).json({
        valid: false,
        code: 'SESSION_EXPIRED',
        error: 'Your session has expired. Please log in again.'
      });
    }

    return res.json({ valid: true, user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const uid = req.headers['x-user-uid'] as string;
    if (uid) {
      const user = db.users.get(uid);
      if (user) {
        user.activeSessionId = null;
      }
    }
    return res.json({ success: true, message: 'Logged out' });
  });

  app.post('/api/auth/change-password', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid;
    const { currentPassword, oldPassword, newPassword } = req.body;
    let user = db.users.get(uid);
    if (!user) user = await db.getUserAsync(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const checkPass = currentPassword || oldPassword;
    if (user.password && checkPass && user.password !== checkPass) {
      return res.status(400).json({ error: 'Current password is incorrect. Please enter your existing password.' });
    }

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    user.password = newPassword;
    db.saveToDisk();
    saveUserPermanently(user).catch(() => {});
    return res.json({ success: true, message: 'Password changed successfully' });
  });

  app.post('/api/auth/update-profile', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid;
    const { avatarUrl, nickname, username, email } = req.body;
    let user = db.users.get(uid);
    if (!user) user = await db.getUserAsync(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (avatarUrl) {
      user.avatarUrl = avatarUrl;
    }
    if (nickname || username) {
      user.username = (nickname || username).trim();
    }
    if (email !== undefined) {
      user.email = email.trim();
    }

    db.saveToDisk();
    saveUserPermanently(user).catch(() => {});
    return res.json({ success: true, user, message: 'Profile updated successfully' });
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { identifier, newPassword } = req.body;
    if (!identifier) {
      return res.status(400).json({ error: 'Please enter your Phone number or Email' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const rawId = String(identifier).trim();
    const digitsOnly = rawId.replace(/\D/g, '');

    let user = Array.from(db.users.values()).find(u => {
      const uPhoneDigits = (u.phone || '').replace(/\D/g, '');
      const uUid = String(u.uid || '').trim();
      const uEmail = (u.email || '').toLowerCase().trim();

      if (uUid === rawId) return true;
      if (uEmail === rawId.toLowerCase()) return true;
      if (u.phone === rawId) return true;

      if (digitsOnly.length >= 7 && uPhoneDigits.length >= 7) {
        if (digitsOnly === uPhoneDigits) return true;
        if (digitsOnly.length >= 10 && uPhoneDigits.length >= 10 && digitsOnly.slice(-10) === uPhoneDigits.slice(-10)) return true;
      }
      return false;
    });

    if (!user) {
      user = await db.getUserAsync(rawId);
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found with this phone number or email' });
    }

    user.password = newPassword;
    db.saveToDisk();
    saveUserPermanently(user).catch(() => {});
    return res.json({ success: true, message: 'Password reset successfully! Please login with your new password.' });
  });

  app.get('/api/notifications', (req, res) => {
    const uid = req.headers['x-user-uid'] as string;
    const user = uid ? db.users.get(uid) : undefined;
    const notifications = [
      {
        id: 'notif-1',
        title: 'Welcome to ArowClub!',
        content: 'Your account has been credited with ₹100 Welcome Bonus. Start playing to win!',
        type: 'bonus',
        isRead: false,
        createdAt: user?.registrationDate || new Date().toISOString(),
      },
      {
        id: 'notif-2',
        title: 'VIP 1 Upgrade Challenge',
        content: 'Place bets to earn EXP and unlock monthly cashback and free daily withdrawals.',
        type: 'vip',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-3',
        title: 'Instant 24/7 Recharge Available',
        content: 'Use automatic UPI QR or Bank Transfer for instant wallet top-up within seconds.',
        type: 'system',
        isRead: true,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
    return res.json({ notifications });
  });

  app.get('/api/system/public-settings', (req, res) => {
    return res.json({
      siteName: db.platformSettings.siteName || 'Win Go Pro',
      logoUrl: db.platformSettings.logoUrl,
      supportTelegram: db.platformSettings.supportTelegram || '@WingoSupportOfficial',
      supportWhatsapp: db.platformSettings.supportWhatsapp || '+91 98765 43210',
      marqueeNotice: db.platformSettings.marqueeNotice || 'Please be sure to always use our official website for playing games with the safest transactions!',
      minDeposit: 100,
      minWithdrawal: 110,
      upiId: db.platformSettings.upiId || 'paytmqr2810050501011@paytm',
      qrCodeUrl: db.platformSettings.qrCodeUrl || 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=wingopay@upi&pn=WingoGames&cu=INR',
    });
  });

  app.get('/api/auth/me', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string;
    const sessionToken = req.headers['x-session-token'] as string;

    if (!uid) {
      return res.status(401).json({ error: 'Please login to continue' });
    }
    const user = await findAndResolveUser(uid);
    if (!user) {
      return res.status(401).json({ error: 'User session expired. Please login again.' });
    }

    if (user.activeSessionId && sessionToken && user.activeSessionId !== sessionToken) {
      return res.status(401).json({
        code: 'CONCURRENT_LOGIN_KICKED',
        error: 'Your account was logged in from another device. Only 1 active login is allowed per ID.'
      });
    }

    // Auto-logout after 12 hours
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const sessionCreatedAt = user.activeSessionTime ? new Date(user.activeSessionTime).getTime() : 0;
    if (sessionCreatedAt > 0 && (Date.now() - sessionCreatedAt > TWELVE_HOURS_MS)) {
      user.activeSessionId = null;
      return res.status(401).json({
        code: 'SESSION_EXPIRED_12H',
        error: 'Your session has expired after 12 hours. Please log in again.'
      });
    }

    const totalDeposit = db.getUserTotalDeposit(user);
    user.totalDeposit = totalDeposit;
    db.syncUserTurnover(user);
    const minDep = Number(db.platformSettings?.minDepositToBet ?? 0);
    const enrichedUser = {
      ...user,
      totalDeposit,
      isBettingUnlocked: minDep > 0 ? (totalDeposit >= minDep) : true,
      minDepositToBet: minDep,
    };

    return res.json({ user: enrichedUser });
  });

  // Direct Wallet Balance update for real-time games (Aviator, Mines, etc.)
  app.post('/api/wallet/update-balance', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.userId || req.body.uid;
    const { amount, actionType, note, gameId } = req.body;
    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact customer support.' });
    }
    
    const numAmt = Number(amount);
    if (isNaN(numAmt)) return res.status(400).json({ error: 'Invalid amount' });

    // Mandatory rule: User must have deposited at least ₹100 before placing any bets
    if (actionType === 'bet' || (numAmt < 0 && actionType !== 'refund' && actionType !== 'withdrawal')) {
      const betCheck = db.isBettingAllowedForUser(user);
      if (!betCheck.allowed) {
        return res.status(403).json({
          error: betCheck.message,
          requiresDeposit: true,
          minDepositRequired: betCheck.minDepositRequired || 100,
          currentDeposit: betCheck.currentDeposit || 0,
        });
      }
    }

    if (numAmt < 0 && user.walletBalance + numAmt < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const prevBal = user.walletBalance;

    let creditedAmount = Math.abs(numAmt);
    let grossWin = 0;
    let gstCutPercent = 0;
    let gstCutAmount = 0;

    const determinedGame = gameId || (note && (note.toLowerCase().includes('seven') || note.toLowerCase().includes('7 up') || note.toLowerCase().includes('7up')) ? 'seven_up_down' : note && note.toLowerCase().includes('mines') ? 'mines' : note && note.toLowerCase().includes('aviator') ? 'aviator' : note && note.toLowerCase().includes('roulette') ? 'roulette' : note && note.toLowerCase().includes('chicken') ? 'chicken_road' : note && note.toLowerCase().includes('plinko') ? 'plinko' : note && note.toLowerCase().includes('cricket') ? 'vortex' : 'seven_up_down');

    if (actionType === 'win') {
      grossWin = Math.abs(numAmt);
      let stake = Math.abs(Number(req.body.stake ?? req.body.betAmount ?? 0));
      if (stake === 0 && (user as any).lastBetStake && (user as any).lastBetStake > 0) {
        stake = (user as any).lastBetStake;
      }
      const profit = stake > 0 && grossWin > stake ? (grossWin - stake) : (stake === 0 ? grossWin : 0);
      const gameCuts = db.bonusCommissionSettings?.gameWinningDeductions || {};
      const targetGame = determinedGame;
      gstCutPercent = Number(gameCuts[targetGame] !== undefined ? gameCuts[targetGame] : (db.bonusCommissionSettings?.winningDeductionPercent ?? 0));
      gstCutAmount = Number(((profit * gstCutPercent) / 100).toFixed(2));
      creditedAmount = Number(Math.max(0, grossWin - gstCutAmount).toFixed(2));

      user.walletBalance = Math.max(0, parseFloat((user.walletBalance + creditedAmount).toFixed(2)));
      user.totalWin = parseFloat(((user.totalWin || 0) + creditedAmount).toFixed(2));
      (user as any).lastBetStake = 0;
    } else {
      if (actionType === 'loss') {
        const lossAmt = Math.abs(numAmt);
        user.totalLoss = parseFloat(((user.totalLoss || 0) + lossAmt).toFixed(2));
        (user as any).lastBetStake = 0;
      } else {
        user.walletBalance = Math.max(0, parseFloat((user.walletBalance + numAmt).toFixed(2)));
        if (numAmt < 0) {
          const betAmt = Math.abs(numAmt);
          user.totalBet = parseFloat(((user.totalBet || 0) + betAmt).toFixed(2));
          user.completedTurnover = parseFloat(((user.completedTurnover || 0) + betAmt).toFixed(2));
          user.currentTurnover = parseFloat(((user.currentTurnover || 0) + betAmt).toFixed(2));
          user.remainingTurnover = Math.max(0, parseFloat(((user.remainingTurnover ?? (user.requiredTurnover || 0)) - betAmt).toFixed(2)));
          (user as any).lastBetStake = betAmt;
          (user as any).lastBetGame = determinedGame;
        }
      }
    }

    db.syncUserTurnover(user);

    const noteText = actionType === 'win'
      ? (gstCutPercent > 0
          ? `${note || 'Game Win'}: Gross ₹${grossWin.toFixed(2)} (GST ${gstCutPercent}% -₹${gstCutAmount.toFixed(2)} deducted) Net ₹${creditedAmount.toFixed(2)}`
          : `${note || 'Game Win'}: Net ₹${creditedAmount.toFixed(2)}`)
      : note || (actionType === 'refund' ? 'Game Refund' : actionType === 'loss' ? 'Game Loss Settlement' : 'Game Bet');

    const txRecord = {
      id: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uid: user.uid,
      type: actionType === 'win' ? 'win' : actionType === 'refund' ? 'refund' : 'bet',
      amount: actionType === 'win' ? creditedAmount : Math.abs(numAmt),
      grossAmount: actionType === 'win' ? grossWin : undefined,
      gstPercent: actionType === 'win' ? gstCutPercent : undefined,
      gstAmount: actionType === 'win' ? gstCutAmount : undefined,
      gameType: determinedGame,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: note || (actionType === 'win' ? 'Win Settlement' : actionType === 'refund' ? 'Refund' : actionType === 'loss' ? 'Loss Settlement' : 'Bet Placement'),
      createdBy: 'system',
      note: noteText,
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({ 
      success: true, 
      newBalance: user.walletBalance, 
      user,
      creditedAmount,
      grossWin,
      gstCutAmount,
      gstCutPercent 
    });
  });

  // Direct Bet record for real-time games (Mines, Aviator, Chicken Road, etc.)
  app.post('/api/game/record-bet', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.userId || req.body.uid;
    const user = await findAndResolveUser(uid);
    const { periodId, gameType, totalAmount, status, winAmount } = req.body;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mandatory rule: User must have deposited at least ₹100 before betting
    if (Number(totalAmount) > 0) {
      const betCheck = db.isBettingAllowedForUser(user);
      if (!betCheck.allowed) {
        return res.status(403).json({
          error: betCheck.message,
          requiresDeposit: true,
          minDepositRequired: betCheck.minDepositRequired || 100,
          currentDeposit: betCheck.currentDeposit || 0,
        });
      }
    }

    const bet: any = {
      id: `BET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uid: user.uid,
      username: user.username,
      gameType: gameType || 'mines',
      periodId: periodId || `ROUND-${Date.now()}`,
      betType: 'number',
      selection: 0,
      unitAmount: totalAmount || 10,
      multiplier: 1,
      totalAmount: totalAmount || 10,
      fee: 0,
      actualAmount: totalAmount || 10,
      status: status || 'pending',
      winAmount: winAmount || 0,
      createdAt: new Date().toISOString(),
      settledAt: new Date().toISOString(),
    };
    const alreadySettled = req.body.alreadySettledInWallet !== false;
    if (!alreadySettled) {
      const betWager = parseFloat(Number(totalAmount || 0).toFixed(2));
      if (betWager > 0) {
        user.totalBet = parseFloat(((user.totalBet || 0) + betWager).toFixed(2));
        user.completedTurnover = parseFloat(((user.completedTurnover || 0) + betWager).toFixed(2));
        user.currentTurnover = parseFloat(((user.currentTurnover || 0) + betWager).toFixed(2));
        user.remainingTurnover = Math.max(0, parseFloat(((user.remainingTurnover ?? (user.requiredTurnover || 0)) - betWager).toFixed(2)));
      }
      if (status === 'lost' && betWager > 0) {
        user.totalLoss = parseFloat(((user.totalLoss || 0) + betWager).toFixed(2));
      } else if (status === 'won') {
        const winPayout = parseFloat(Number(winAmount || 0).toFixed(2));
        user.totalWin = parseFloat(((user.totalWin || 0) + winPayout).toFixed(2));
      }
    }
    db.syncUserTurnover(user);
    db.bets.unshift(bet);
    saveBetPermanently(bet).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();
    return res.json({ success: true, bet, user });
  });

  // ===================== GAME APIS =====================
  app.get('/api/game/current/:gameType', (req, res) => {
    const gameType = req.params.gameType as GameType;
    const now = Date.now();
    const period = gameEngine.ensureActivePeriod(gameType, now);
    if (!period) {
      return res.status(404).json({ error: 'Game type not found' });
    }

    const remainingMs = Math.max(0, period.endTime - now);
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const isLocked = remainingSeconds <= 5;
    const history = (db.resultsHistory.get(gameType) || []).slice(0, 500);

    return res.json({
      serverTime: now,
      period: {
        ...period,
        remainingSeconds,
        isLocked,
      },
      history,
    });
  });

  // ===================== REAL-TIME INSTANT SYNCHRONIZATION (SSE) =====================
  const sseClients = new Set<express.Response>();

  // Periodic SSE keepalive to prevent proxies/browsers from buffering or terminating stream
  setInterval(() => {
    for (const client of sseClients) {
      try {
        client.write(': keepalive\n\n');
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  const broadcastSse = (data: any) => {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        client.write(payload);
        if (typeof (client as any).flush === 'function') {
          (client as any).flush();
        }
      } catch {
        sseClients.delete(client);
      }
    }
  };

  // When Wingo engine settles ANY round, broadcast instantly to ALL users in 0ms!
  gameEngine.onPeriodSettled = (event) => {
    broadcastSse({
      type: 'period_settled',
      gameType: event.gameType,
      periodId: event.period.periodId,
      resultNumber: event.period.resultNumber,
      resultColor: event.period.resultColor,
      resultBigSmall: event.period.resultBigSmall,
      completedAt: event.period.completedAt,
      nextPeriod: event.nextPeriod,
      history: event.history.slice(0, 100),
      settledBets: (event as any).settledBets || [],
      serverTime: Date.now(),
    });
  };

  // Broadcast clock tick every second to keep all user clocks tightly synced
  gameEngine.onTick = (tickData) => {
    broadcastSse({
      type: 'sync_clock',
      serverTime: tickData.serverTime,
      periods: tickData.periods,
    });
  };

  // SSE Stream for connected clients
  app.get('/api/game/events', (req, res) => {
    req.socket?.setNoDelay(true);
    res.socket?.setNoDelay(true);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.add(res);

    const now = Date.now();
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const periodsSnapshot: Record<string, any> = {};
    gameTypes.forEach(gt => {
      const p = gameEngine.ensureActivePeriod(gt, now);
      if (p) {
        const rem = Math.max(0, Math.floor((p.endTime - now) / 1000));
        periodsSnapshot[gt] = {
          gameType: gt,
          periodId: p.periodId,
          remainingSeconds: rem,
          isLocked: rem <= 5,
          endTime: p.endTime,
          durationSeconds: p.durationSeconds,
        };
      }
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', serverTime: now, periods: periodsSnapshot })}\n\n`);

    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  app.post('/api/game/bet', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid || req.body.userId || req.body.id || '108429';
    const { gameType, betType, selection, amount, multiplier } = req.body;

    const user = db.getUser(uid) || db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact customer support.' });
    }

    // Mandatory rule: User must have deposited at least ₹100 before betting
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return res.status(403).json({
        error: betCheck.message,
        requiresDeposit: true,
        minDepositRequired: betCheck.minDepositRequired || 100,
        currentDeposit: betCheck.currentDeposit || 0,
      });
    }

    const result = gameEngine.placeBet(uid, gameType, betType, selection, Number(amount), Number(multiplier || 1));
    if (!result.success) {
      return res.status(400).json({ error: result.message, requiresDeposit: (result as any).requiresDeposit });
    }

    return res.json({ success: true, message: result.message, bet: result.bet, newBalance: user?.walletBalance });
  });

  app.get('/api/game/history/:gameType', (req, res) => {
    const gameType = req.params.gameType as GameType;
    const history = db.resultsHistory.get(gameType) || [];
    return res.json({ results: history.slice(0, 500) });
  });

  app.get('/api/game/my-bets', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string || '108429';
    const gameType = req.query.gameType as string;

    // Clean up any historical miscategorized bets in memory
    db.bets.forEach((b: any) => {
      if (b.periodId?.startsWith('MINES-') && b.gameType !== 'mines') {
        b.gameType = 'mines';
      } else if (b.periodId?.startsWith('AVIATOR-') && b.gameType !== 'aviator') {
        b.gameType = 'aviator';
      } else if (b.periodId?.startsWith('CHICKEN-') && b.gameType !== 'chicken_road') {
        b.gameType = 'chicken_road';
      }
    });

    const cleanUid = String(uid).replace(/^u-/, '');
    let userBets = db.bets.filter(b => {
      const bUid = String(b.uid || (b as any).userId || '').replace(/^u-/, '');
      return bUid === cleanUid;
    });
    if (gameType && gameType !== 'all') {
      if (gameType === 'wingo_all' || gameType === 'wingo') {
        userBets = userBets.filter(b => 
          b.gameType && 
          ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m', 'wingo'].includes(b.gameType) &&
          !b.periodId?.startsWith('MINES') &&
          !b.periodId?.startsWith('AVIATOR') &&
          !b.periodId?.startsWith('CHICKEN') &&
          !b.periodId?.startsWith('PLINKO') &&
          !b.periodId?.startsWith('ROULETTE')
        );
      } else if (['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'].includes(gameType)) {
        userBets = userBets.filter(b => 
          b.gameType === gameType &&
          !b.periodId?.startsWith('MINES') &&
          !b.periodId?.startsWith('AVIATOR') &&
          !b.periodId?.startsWith('CHICKEN') &&
          !b.periodId?.startsWith('PLINKO') &&
          !b.periodId?.startsWith('ROULETTE')
        );
      } else if (gameType === 'ludo') {
        userBets = userBets.filter(b => b.gameType && String(b.gameType).toLowerCase().includes('ludo'));
      } else if (gameType === 'seven_up_down') {
        userBets = userBets.filter(b => b.gameType && (String(b.gameType) === 'seven_up_down' || String(b.gameType) === 'seven'));
      } else if (gameType === 'teen_patti') {
        userBets = userBets.filter(b => b.gameType && (String(b.gameType) === 'teen_patti' || String(b.gameType) === 'teenpatti'));
      } else {
        userBets = userBets.filter(b => (b.gameType as any) === gameType);
      }
    }

    const seenBetKeys = new Set<string>();
    const deduplicatedBets = userBets.filter(b => {
      const bKey = b.id || `${b.gameType}-${b.periodId}-${b.createdAt}`;
      if (seenBetKeys.has(bKey)) return false;
      seenBetKeys.add(bKey);
      return true;
    });

    return res.json({ bets: deduplicatedBets.slice(0, 500) });
  });

  // ===================== WALLET & PAYMENTS (USER) =====================
  app.get('/api/payment-methods/public', (req, res) => {
    const activeMethods = (db.paymentMethods || []).filter(pm => pm.isActive);
    return res.json({ paymentMethods: activeMethods });
  });

  app.get('/api/withdraw-settings/public', (req, res) => {
    return res.json({ settings: db.withdrawSettings });
  });

  app.post('/api/wallet/deposit-request', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid;
    const { amount, paymentMethod } = req.body;
    
    let user = db.getUser(uid);
    if (!user && req.body.username) {
      user = db.getUser(req.body.username);
    }
    if (!user) {
      return res.status(401).json({ error: 'User session expired or user not found. Please log in again.' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact customer support.' });
    }
    if (!amount || Number(amount) < 100) {
      return res.status(400).json({ error: 'Minimum recharge amount is ₹100' });
    }
    
    // Extract alphanumeric characters and trim
    const rawUtr = String(req.body.utrReference || req.body.utrNumber || '').trim();
    const cleanUtr = rawUtr.replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
    if (!cleanUtr || cleanUtr.length < 8 || cleanUtr.length > 24) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UTR or transaction reference number (at least 8 characters).' });
    }

    // Validate Duplicate UTR: Only check active pending or approved deposits so rejected/failed attempts can be resubmitted
    const duplicateUtr = db.deposits.find(
      d => (d.status === 'pending' || d.status === 'approved') && d.utrReference && d.utrReference.trim().toUpperCase() === cleanUtr
    );
    if (duplicateUtr) {
      if (duplicateUtr.status === 'pending' && duplicateUtr.uid === user.uid) {
        return res.status(400).json({ error: 'This recharge request is already pending verification. Please wait a few minutes.' });
      }
      return res.status(400).json({ error: 'This UTR / Transaction Reference has already been submitted and approved. Please check your payment receipt.' });
    }

    const activeBankName = db.adminUpiDetails?.bankName || db.adminUpiDetails?.payeeName || (db.adminBankAccounts && db.adminBankAccounts[0]) || 'SARKAR TRANSPORT';

    const deposit: any = {
      id: `DEP-${Date.now()}`,
      uid: user.uid,
      username: user.username,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'UPI',
      receivingBankName: activeBankName,
      utrReference: cleanUtr,
      userNote: req.body.note ? String(req.body.note).trim() : (req.body.userNote ? String(req.body.userNote).trim() : undefined),
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.deposits.unshift(deposit);

    const depositNoteText = deposit.userNote 
      ? `Deposit request via ${deposit.paymentMethod} (UTR: ${deposit.utrReference}) - Note: ${deposit.userNote}`
      : `Deposit request via ${deposit.paymentMethod} (UTR: ${deposit.utrReference}) - Awaiting Admin Approval`;

    // Create pending transaction in history
    const depositTx = {
      id: `TX-${deposit.id}`,
      uid: user.uid,
      type: 'deposit',
      amount: Number(amount),
      status: 'pending',
      previousBalance: user.walletBalance,
      newBalance: user.walletBalance,
      reference: deposit.id,
      utrReference: deposit.utrReference,
      paymentMethod: deposit.paymentMethod,
      createdBy: 'user',
      userNote: deposit.userNote,
      note: depositNoteText,
      createdAt: deposit.createdAt,
    };
    db.transactions.unshift(depositTx as any);

    await saveDepositPermanently(deposit).catch(() => {});
    await saveTransactionPermanently(depositTx).catch(() => {});
    db.saveToDisk();

    return res.json({ success: true, message: 'Recharge request submitted successfully! Awaiting admin verification.', deposit });
  });

  app.post('/api/wallet/withdrawal-request', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const { amount, bankUpiDetails, note, userNote } = req.body;
    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.status === 'blocked') {
      return res.status(403).json({ error: 'Your account is blocked. Please contact customer support.' });
    }
    
    const wSettings = db.withdrawSettings || { minAmount: 110, maxAmount: 100000 };
    const minW = wSettings.minAmount || 110;
    const maxW = wSettings.maxAmount || 100000;

    if (!amount || amount < minW) return res.status(400).json({ error: `Minimum withdrawal is ₹${minW}` });
    if (amount > maxW) return res.status(400).json({ error: `Maximum withdrawal is ₹${maxW}` });
    if (user.walletBalance < amount) return res.status(400).json({ error: 'Insufficient wallet balance' });

    db.syncUserTurnover(user);
    const completedRolling = Number(user.completedRolling ?? user.completedTurnover ?? 0);
    const requiredRolling = Number(user.requiredRolling ?? user.requiredTurnover ?? 0);
    const remainingRolling = user.remainingRolling !== undefined 
      ? Number(user.remainingRolling) 
      : Math.max(0, parseFloat((requiredRolling - completedRolling).toFixed(2)));

    if (remainingRolling > 0) {
      return res.status(400).json({ 
        error: `Withdrawal Blocked: Remaining rolling requirement is ₹${remainingRolling.toFixed(2)}. Complete 1X rolling of deposits, 5% automatic bonus, and claimed bonuses via settled game P&L before requesting withdrawal. (डिपॉजिट + 5% बोनस और क्लेम किए गए बोनस का शेष ₹${remainingRolling.toFixed(2)} रोलिंग गेम खेलकर पूरा करें, इसके बाद निकासी अनलॉक हो जाएगी।)` 
      });
    }

    const prevBalance = user.walletBalance;
    user.walletBalance -= amount;

    // Resolve exact bank details from user's registered accounts or provided payload
    const userBanks = user.bankAccounts || [];
    const matchedBank = bankUpiDetails?.accountNumber
      ? userBanks.find(b => b.accountNumber === String(bankUpiDetails.accountNumber).trim())
      : (userBanks[0] || null);

    const exactBankName = bankUpiDetails?.bankName || matchedBank?.bankName || 'Bank Account';
    const exactAccountNumber = bankUpiDetails?.accountNumber || matchedBank?.accountNumber || '';
    const exactIfsc = bankUpiDetails?.ifsc || bankUpiDetails?.ifscCode || matchedBank?.ifsc || '';
    const exactHolder = bankUpiDetails?.accountHolder || matchedBank?.accountHolder || user.username;
    const exactUpi = bankUpiDetails?.upiId || matchedBank?.upiId || '';
    const cleanUserNote = (note || userNote) ? String(note || userNote).trim() : undefined;

    const withdrawal: any = {
      id: `WTH-${Date.now()}`,
      uid: user.uid,
      username: user.username,
      name: exactHolder,
      amount: Number(amount),
      bankName: exactBankName,
      accountNumber: exactAccountNumber,
      ifscCode: exactIfsc,
      ifsc: exactIfsc,
      accountHolderName: exactHolder,
      accountHolder: exactHolder,
      userNote: cleanUserNote,
      bankUpiDetails: {
        accountHolder: exactHolder,
        bankName: exactBankName,
        accountNumber: exactAccountNumber,
        ifsc: exactIfsc,
        upiId: exactUpi,
      },
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.withdrawals.unshift(withdrawal);

    const withdrawalNoteText = cleanUserNote
      ? `Withdrawal to ${exactUpi || `${exactBankName} (${exactAccountNumber})`} - Note: ${cleanUserNote}`
      : `Withdrawal request to ${exactUpi || `${exactBankName} (${exactAccountNumber})`}`;

    const withdrawalTx = {
      id: `TX-WTH-${Date.now()}`,
      uid: user.uid,
      type: 'withdrawal',
      amount: -amount,
      status: 'pending',
      previousBalance: prevBalance,
      newBalance: user.walletBalance,
      reference: withdrawal.id,
      createdBy: 'user',
      userNote: cleanUserNote,
      note: withdrawalNoteText,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(withdrawalTx as any);

    await saveWithdrawalPermanently(withdrawal).catch(() => {});
    await saveTransactionPermanently(withdrawalTx).catch(() => {});
    await saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({ success: true, message: 'Withdrawal request submitted! Processing within 2-24 hours.', withdrawal, newBalance: user.walletBalance });
  });

  // ===================== BANK BENEFICIARY APIS (MAX 3, PASSWORD PROTECTED DELETE) =====================
  app.get('/api/wallet/bank-accounts', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string || '108429';
    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ bankAccounts: user.bankAccounts || [] });
  });

  app.post('/api/wallet/bank-accounts/add', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const accountHolder = req.body.accountHolder || req.body.accountHolderName || req.body.holderName;
    const ifsc = req.body.ifsc || req.body.ifscCode;
    const accountNumber = req.body.accountNumber || req.body.accNumber;
    const bankName = req.body.bankName;
    const upiId = req.body.upiId;
    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.bankAccounts) {
      user.bankAccounts = [];
    }

    if (user.bankAccounts.length >= 3) {
      return res.status(400).json({ error: 'Maximum 3 bank accounts allowed per user. Please delete an existing account to add a new one.' });
    }

    if (!accountHolder || !String(accountHolder).trim()) {
      return res.status(400).json({ error: 'Account holder name is required' });
    }
    if (!accountNumber || String(accountNumber).trim().length < 6) {
      return res.status(400).json({ error: 'Valid bank account number is required (min 6 digits)' });
    }
    if (!ifsc || String(ifsc).trim().length < 8) {
      return res.status(400).json({ error: 'Valid IFSC code is required (e.g. SBIN0001234)' });
    }

    const cleanAccNo = String(accountNumber).trim();
    const cleanIfsc = String(ifsc).trim().toUpperCase();
    const cleanBank = (bankName || 'Bank Account').trim();
    const cleanHolder = String(accountHolder).trim();

    // Check duplicate
    const exists = user.bankAccounts.some(b => b.accountNumber === cleanAccNo);
    if (exists) {
      return res.status(400).json({ error: 'This bank account number is already registered' });
    }

    const newBank = {
      id: `bank_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      accountHolder: cleanHolder,
      holderName: cleanHolder,
      bankName: cleanBank,
      accountNumber: cleanAccNo,
      ifsc: cleanIfsc,
      ifscCode: cleanIfsc,
      upiId: upiId ? String(upiId).trim() : undefined,
      isDefault: user.bankAccounts.length === 0,
      addedAt: new Date().toISOString(),
    };

    user.bankAccounts.push(newBank);
    db.saveToDisk();

    return res.json({ success: true, message: 'Beneficiary bank account added successfully', bankAccount: newBank, bankAccounts: user.bankAccounts });
  });

  app.post('/api/wallet/bank-accounts/delete', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const { id, bankId, password } = req.body;
    const targetId = id || bankId;
    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!targetId) {
      return res.status(400).json({ error: 'Bank account ID is required' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Please enter your account password to confirm deletion.' });
    }

    if (user.password && user.password !== password) {
      return res.status(400).json({ error: 'Incorrect password! Account deletion aborted for security.' });
    }

    const initialLength = (user.bankAccounts || []).length;
    user.bankAccounts = (user.bankAccounts || []).filter(b => b.id !== targetId);

    if (user.bankAccounts.length === initialLength) {
      return res.status(404).json({ error: 'Bank account not found' });
    }

    db.saveToDisk();
    return res.json({ success: true, message: 'Bank account deleted successfully', bankAccounts: user.bankAccounts });
  });

  // Admin delete user bank account
  app.post('/api/admin/users/:uid/delete-bank', (req, res) => {
    const { uid } = req.params;
    const { bankId, adminUsername } = req.body;
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const before = (user.bankAccounts || []).length;
    user.bankAccounts = (user.bankAccounts || []).filter(b => b.id !== bankId);
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Delete User Bank Account', `Deleted bank ID ${bankId} from user ${uid}`, uid, `Count: ${before}`, `Count: ${user.bankAccounts.length}`, req);
    return res.json({ success: true, message: 'Bank account removed by admin', bankAccounts: user.bankAccounts });
  });

  // ===================== USER SUPPORT CHAT & 24/7 AI ASSISTANT =====================
  app.get('/api/support/my-chat', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || '108429';
    let ticket = (db.supportTickets || []).find(t => t.uid === uid && t.status === 'open');
    if (!ticket) {
      const user = db.users.get(uid);
      ticket = {
        id: `t-${uid}-${Date.now()}`,
        uid,
        username: user?.username || `User_${uid}`,
        lastMessage: 'Welcome to 24/7 VIP AI & Live Support Desk',
        lastMessageTime: new Date().toISOString(),
        unreadCountByAdmin: 0,
        unreadCountByUser: 0,
        status: 'open',
        isAiHandled: true,
        escalatedToAdmin: false,
        createdAt: new Date().toISOString(),
        messages: [
          {
            id: `m-welcome-${Date.now()}`,
            ticketId: `t-${uid}`,
            uid,
            username: 'AI Assistant',
            sender: 'ai',
            message: 'नमस्ते! ArowClub VIP 24/7 AI Support में आपका स्वागत है। मैं आपकी तुरंत मदद कर सकता हूँ — जैसे Recharge/Deposit, Withdrawal, Games नियम या Password सहायता। अगर कोई विशेष समस्या है तो मैं तुरंत Live Admin Desk से भी जोड़ दूंगा।',
            timestamp: new Date().toISOString(),
          }
        ],
      };
      db.supportTickets.unshift(ticket);
      db.saveToDisk();
    }
    return res.json({ ticket });
  });

  // User marks chat as Done / Resolved
  app.post('/api/support/done', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    const ticketId = req.body.ticketId;
    let ticket = ticketId 
      ? (db.supportTickets || []).find(t => t.id === ticketId)
      : (db.supportTickets || []).find(t => t.uid === uid && t.status === 'open');

    if (!ticket) {
      return res.status(404).json({ error: 'No active ticket found to complete' });
    }

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = 'User';
    ticket.messages.push({
      id: `m-sys-${Date.now()}`,
      ticketId: ticket.id,
      uid: ticket.uid,
      username: 'System',
      sender: 'system',
      message: '✅ यह चैट सत्र सफलतापूर्वक समाप्त (Done) कर दिया गया है। यह बातचीत आपकी चैट हिस्ट्री में सहेज ली गई है।',
      timestamp: new Date().toISOString(),
    });
    ticket.lastMessage = 'Chat marked as Done (Resolved)';
    ticket.lastMessageTime = new Date().toISOString();
    db.saveToDisk();
    return res.json({ success: true, ticket });
  });

  // Get user's resolved chat history
  app.get('/api/support/my-history', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || (req.query.uid as string) || '108429';
    const history = (db.supportTickets || []).filter(
      t => t.uid === uid && (t.status === 'resolved' || t.status === 'closed')
    );
    return res.json({ tickets: history });
  });

  // Start fresh chat session
  app.post('/api/support/new-chat', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid || '108429';
    const user = db.users.get(uid);

    // Resolve any pending open ticket
    (db.supportTickets || []).forEach(t => {
      if (t.uid === uid && t.status === 'open') {
        t.status = 'resolved';
        t.resolvedAt = new Date().toISOString();
        t.resolvedBy = 'Auto-NewSession';
      }
    });

    const newTicket = {
      id: `t-${uid}-${Date.now()}`,
      uid,
      username: user?.username || `User_${uid}`,
      lastMessage: 'Welcome to 24/7 VIP AI & Live Support Desk',
      lastMessageTime: new Date().toISOString(),
      unreadCountByAdmin: 0,
      unreadCountByUser: 0,
      status: 'open' as const,
      isAiHandled: true,
      escalatedToAdmin: false,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: `m-welcome-${Date.now()}`,
          ticketId: `t-${uid}-${Date.now()}`,
          uid,
          username: 'AI Assistant',
          sender: 'ai' as const,
          message: 'नमस्ते! नई चैट में आपका स्वागत है। हम आपकी क्या सहायता कर सकते हैं?',
          timestamp: new Date().toISOString(),
        }
      ],
    };
    db.supportTickets.unshift(newTicket);
    db.saveToDisk();
    return res.json({ success: true, ticket: newTicket });
  });

  const handleSupportMessage = async (req: any, res: any) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const { message, mediaUrl, mediaType, fileName, escalate } = req.body;
    if ((!message || !String(message).trim()) && !mediaUrl) {
      return res.status(400).json({ error: 'Message or media cannot be empty' });
    }

    const user = db.users.get(uid);
    let ticket = (db.supportTickets || []).find(t => t.uid === uid);
    const nowStr = new Date().toISOString();
    const mediaLabel = fileName ? `📎 ${fileName}` : (mediaType === 'video' ? '📹 Video uploaded' : mediaType === 'file' ? '📄 Document/File attached' : '📷 Photo uploaded');

    if (!ticket) {
      ticket = {
        id: `t-${uid}`,
        uid,
        username: user?.username || `User_${uid}`,
        lastMessage: message ? message.trim() : mediaLabel,
        lastMessageTime: nowStr,
        unreadCountByAdmin: 0,
        unreadCountByUser: 0,
        status: 'open',
        isAiHandled: true,
        escalatedToAdmin: false,
        createdAt: nowStr,
        messages: [],
      };
      db.supportTickets.unshift(ticket);
    }

    const userMsg: any = {
      id: `m-usr-${Date.now()}`,
      ticketId: ticket.id,
      uid,
      username: user?.username || `User_${uid}`,
      sender: 'user',
      message: (message || '').trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      fileName: fileName || undefined,
      timestamp: nowStr,
    };

    ticket.messages.push(userMsg);
    ticket.lastMessage = userMsg.message || mediaLabel;
    ticket.lastMessageTime = nowStr;

    // Check if user requested human admin or if ticket is already escalated
    const textLower = (message || '').toLowerCase();
    const wantsHuman = escalate || 
      textLower.includes('admin') || 
      textLower.includes('human') || 
      textLower.includes('agent') || 
      textLower.includes('customer care') || 
      textLower.includes('care') || 
      textLower.includes('call') || 
      textLower.includes('fraud') || 
      textLower.includes('complaint') || 
      textLower.includes('dispute') || 
      textLower.includes('manually') || 
      textLower.includes('live support') || 
      textLower.includes('transfer') || 
      textLower.includes('bat kar') || 
      textLower.includes('baat kar') || 
      textLower.includes('operator') || 
      textLower.includes('एडमिन') || 
      textLower.includes('कस्टमर केयर') || 
      textLower.includes('हेल्प') || 
      textLower.includes('सपोर्ट') || 
      textLower.includes('अधिकारी') || 
      textLower.includes('बात करनी') || 
      textLower.includes('ट्रांसफर');

    if (ticket.escalatedToAdmin || wantsHuman) {
      ticket.escalatedToAdmin = true;
      ticket.isAiHandled = false;
      ticket.unreadCountByAdmin = (ticket.unreadCountByAdmin || 0) + 1;

      if (!ticket.messages.some(m => m.id.startsWith('m-esc-alert-'))) {
        const adminConnectNotice: any = {
          id: `m-esc-alert-${Date.now()}`,
          ticketId: ticket.id,
          uid,
          username: 'VIP Support Desk',
          sender: 'system',
          message: '🚨 आपकी बातचीत VIP Live Admin Desk को फॉरवर्ड कर दी गई है। हमारे लाइव सपोर्ट अधिकारी आपके साथ जुड़े हैं। कृपया कुछ क्षण प्रतीक्षा करें।',
          timestamp: new Date(Date.now() + 300).toISOString(),
        };
        ticket.messages.push(adminConnectNotice);
      }
      db.saveToDisk();
      return res.json({ success: true, ticket });
    }

    // AI Assistant response with Google Gemini
    let aiResponseText = '';
    if (genAI) {
      try {
        const conversationSummary = ticket.messages.slice(-6).map((m: any) => `${m.sender.toUpperCase()}: ${m.message}`).join('\n');
        const prompt = `You are the friendly, official VIP AI Support Assistant for ArowClub / Win Go Pro online gaming platform.
Context & Platform Rules:
- Currency is INR (₹).
- Recharge/Deposit: Minimum deposit is ₹100. Users pay via UPI QR and must enter the 12-digit UTR number. Deposits are approved within 2-5 minutes.
- Withdrawal: Minimum withdrawal is ₹100. Users can add up to 3 bank beneficiary accounts (Account Holder Name, Account Number, IFSC code). Deleting a bank beneficiary requires account password. Withdrawals process within 2-24 hours.
- Password change: For security against fraud, password change from login page is disabled; users contact customer care.
- Games: Win Go (30s, 1m, 3m, 5m), Mines (5x5 grid with gems & hidden mines), Roulette (European 37 numbers 0-36), Aviator Crash, Cricket Live exchange, Plinko.
- Language: If user speaks in Hindi, reply in natural, polite Hindi (Devanagari or friendly Hinglish). If English, reply in English.
- If the issue cannot be resolved automatically or user wants manual check / refund dispute, inform them politely that you are connecting them directly to the Live Human Admin team. Keep reply concise (2-4 sentences max).

Current Conversation:
${conversationSummary}
USER QUERY: ${message}

Assistant Reply:`;

        const response = await genAI.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: prompt,
        });

        aiResponseText = response.text?.trim() || '';
      } catch (geminiErr) {
        console.warn('Gemini AI error in support:', geminiErr);
      }
    }

    // Fallback AI logic if offline or rate-limited
    if (!aiResponseText) {
      if (textLower.includes('deposit') || textLower.includes('recharge') || textLower.includes('utr') || textLower.includes('paisa')) {
        aiResponseText = 'Recharge/Deposit के लिए Wallet में जाएं, UPI QR स्कैन करके भुगतान करें और 12 अंकों का UTR नंबर दर्ज करें। 2-5 मिनट में आपके वॉलेट में बैलेंस क्रेडिट हो जाता है।';
      } else if (textLower.includes('withdraw') || textLower.includes('nikasi') || textLower.includes('bank')) {
        aiResponseText = 'Withdrawal के लिए अपने Bank Account (Holder Name, Account No, IFSC) को जोड़ें (अधिकतम 3 खाते)। न्यूनतम निकासी ₹100 है। बैंक हटाने के लिए आपका पासवर्ड लगेगा।';
      } else if (textLower.includes('password') || textLower.includes('pass')) {
        aiResponseText = 'सुरक्षा कारणों से लॉगिन पेज से डायरेक्ट पासवर्ड रीसेट बंद है। आप यहाँ अपनी UID और रजिस्टर्ड नंबर लिखकर भेजें, हमारी एडमिन टीम वेरिफाई करके मदद करेगी।';
      } else if (textLower.includes('mines') || textLower.includes('roulette') || textLower.includes('wingo')) {
        aiResponseText = 'गेम्स बिल्कुल फेयर और लाइव हैं! Mines में जेम्स खोलें और कभी भी Cash Out करें। Roulette में 0-36 नंबर और कलर्स पर बेट लगा सकते हैं।';
      } else {
        aiResponseText = 'नमस्ते! मैं आपकी सहायता के लिए तैयार हूँ। आप Deposit, Withdrawal, Bank Account, Password या Games के बारे में पूछ सकते हैं। अगर आपको लाइव एडमिन से बात करनी है तो "Live Admin" लिखें।';
      }
    }

    const aiMsg: any = {
      id: `m-ai-${Date.now() + 500}`,
      ticketId: ticket.id,
      uid,
      username: 'AI Support Assistant',
      sender: 'ai',
      message: aiResponseText,
      timestamp: new Date(Date.now() + 600).toISOString(),
    };

    ticket.messages.push(aiMsg);
    ticket.lastMessage = aiResponseText;
    ticket.lastMessageTime = new Date(Date.now() + 600).toISOString();

    db.saveToDisk();
    return res.json({ success: true, ticket });
  };

  app.post('/api/support/message', handleSupportMessage);
  app.post('/api/support/send', handleSupportMessage);

  app.post('/api/support/escalate', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    let ticket = (db.supportTickets || []).find(t => t.uid === uid);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    ticket.escalatedToAdmin = true;
    ticket.unreadCountByAdmin = (ticket.unreadCountByAdmin || 0) + 1;

    const notice: any = {
      id: `m-esc-${Date.now()}`,
      ticketId: ticket.id,
      uid,
      username: 'System Desk',
      sender: 'system',
      message: '🔔 आप लाइव एडमिन कतार में सफलतापूर्वक जुड़ चुके हैं। एक एडमिन अधिकारी तुरंत आपके संदेश का उत्तर देंगे।',
      timestamp: new Date().toISOString(),
    };
    ticket.messages.push(notice);
    db.saveToDisk();

    return res.json({ success: true, ticket });
  });

  app.get('/api/admin/support/unread-count', (req, res) => {
    const totalUnread = (db.supportTickets || []).reduce((sum, t) => sum + (t.unreadCountByAdmin || (t.escalatedToAdmin ? 1 : 0)), 0);
    return res.json({ unreadCount: totalUnread });
  });

  app.get('/api/notifications', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
    const user = uid ? db.users.get(uid) : undefined;

    const adminNotifs = (db.adminNotifications || []).filter((n: any) => {
      if (n.status === 'draft') return false;
      if (n.targetType === 'all') return true;
      if (uid && n.targetType === 'single' && n.targetUid === uid) return true;
      return false;
    }).map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.message || n.content,
      message: n.message || n.content,
      type: n.type || 'system',
      isRead: false,
      createdAt: n.createdAt || n.sentAt || new Date().toISOString(),
    }));

    const systemNotifs = [
      {
        id: 'notif-welcome',
        title: 'Welcome to ArowClub Official Platform!',
        content: 'Your account is active. Enjoy 24/7 instant deposits & withdrawals and fair gaming.',
        message: 'Your account is active. Enjoy 24/7 instant deposits & withdrawals and fair gaming.',
        type: 'bonus',
        isRead: false,
        createdAt: user?.registrationDate || new Date().toISOString(),
      },
      {
        id: 'notif-security',
        title: 'Account Security Notice',
        content: 'Never share your account login password with anyone. Admin will never ask for your password.',
        message: 'Never share your account login password with anyone. Admin will never ask for your password.',
        type: 'system',
        isRead: true,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      }
    ];

    const combined = [...adminNotifs, ...systemNotifs];
    return res.json({ notifications: combined });
  });

  app.get('/api/wallet/transactions', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string || '108429';
    
    // 1. Sync all deposits to ensure each deposit has EXACTLY ONE transaction card
    const userDeposits = db.deposits.filter(d => d.uid === uid);
    userDeposits.forEach(dep => {
      // Find all transactions linked to this deposit ID
      const matchingTxs = db.transactions.filter(t => t.reference === dep.id || t.id === `TX-${dep.id}` || t.id === `TX-DEP-${dep.id}`);
      const depStatus = dep.status === 'approved' ? 'completed' : dep.status === 'rejected' ? 'rejected' : 'pending';
      const noteStr = dep.status === 'approved'
        ? `Deposit approved & credited via ${dep.paymentMethod || 'UPI'} (UTR: ${dep.utrReference || '—'})`
        : dep.status === 'rejected'
        ? `Deposit rejected: ${dep.adminNote || 'Invalid UTR / Unreceived'}`
        : `Deposit request via ${dep.paymentMethod || 'UPI'} (UTR: ${dep.utrReference || '—'}) - Awaiting Admin Approval`;

      if (matchingTxs.length > 0) {
        // Keep the primary one updated with the latest status
        const primary = matchingTxs[0];
        primary.status = depStatus as any;
        primary.amount = dep.amount;
        primary.utrReference = dep.utrReference;
        primary.paymentMethod = dep.paymentMethod;
        primary.adminNote = dep.adminNote;
        primary.note = noteStr;
        if (dep.updatedAt) primary.createdAt = dep.createdAt;
        
        // Remove any redundant duplicate cards for this same deposit ID
        if (matchingTxs.length > 1) {
          const duplicateIds = new Set(matchingTxs.slice(1).map(t => t.id));
          db.transactions = db.transactions.filter(t => !duplicateIds.has(t.id));
        }
      } else {
        db.transactions.unshift({
          id: `TX-${dep.id}`,
          uid: dep.uid,
          type: 'deposit',
          amount: dep.amount,
          status: depStatus as any,
          previousBalance: 0,
          newBalance: 0,
          reference: dep.id,
          utrReference: dep.utrReference,
          paymentMethod: dep.paymentMethod,
          createdBy: dep.processedBy || 'user',
          adminNote: dep.adminNote,
          note: noteStr,
          createdAt: dep.createdAt,
        });
      }
    });

    // 2. Sync all withdrawals to ensure each withdrawal has EXACTLY ONE transaction card
    const userWithdrawals = db.withdrawals.filter(w => w.uid === uid);
    userWithdrawals.forEach(wth => {
      // Find all transactions linked to this withdrawal ID or any separate refund transaction created for it
      const matchingTxs = db.transactions.filter(t => t.reference === wth.id || t.id === `TX-${wth.id}` || t.id === `TX-WTH-${wth.id}` || (t.reference && t.reference.includes(wth.id)));
      const wthStatus = wth.status === 'approved' ? 'completed' : wth.status === 'rejected' ? 'rejected' : 'pending';
      const destName = wth.bankUpiDetails?.upiId || wth.bankUpiDetails?.bankName || 'Bank/UPI';
      const noteStr = wth.status === 'approved'
        ? `Withdrawal approved & payout transferred to ${destName}`
        : wth.status === 'rejected'
        ? `Withdrawal rejected & refunded to wallet: ${wth.adminNote || 'Rejected by Admin'}`
        : `Withdrawal request to ${destName} - Awaiting Admin Approval`;

      if (matchingTxs.length > 0) {
        // Keep the primary one updated with the latest status
        const primary = matchingTxs[0];
        primary.type = 'withdrawal';
        primary.status = wthStatus as any;
        primary.amount = -Math.abs(wth.amount);
        primary.adminNote = wth.adminNote;
        primary.note = noteStr;
        
        // Remove any separate redundant refund/duplicate card for this same withdrawal ID
        if (matchingTxs.length > 1) {
          const duplicateIds = new Set(matchingTxs.slice(1).map(t => t.id));
          db.transactions = db.transactions.filter(t => !duplicateIds.has(t.id));
        }
      } else {
        db.transactions.unshift({
          id: `TX-${wth.id}`,
          uid: wth.uid,
          type: 'withdrawal',
          amount: -Math.abs(wth.amount),
          status: wthStatus as any,
          previousBalance: 0,
          newBalance: 0,
          reference: wth.id,
          createdBy: wth.processedBy || 'user',
          adminNote: wth.adminNote,
          note: noteStr,
          createdAt: wth.createdAt,
        });
      }
    });

    // Remove any orphaned refund transactions whose reference matches an existing withdrawal
    const allWthIds = new Set(db.withdrawals.map(w => w.id));
    db.transactions = db.transactions.filter(t => {
      if (t.type === 'refund' && t.reference && allWthIds.has(t.reference)) {
        return false;
      }
      return true;
    });

    // Strict History Separation: Transaction History ONLY contains financial transactions
    const financialTxs = db.transactions.filter(
      t => t.uid === uid && !['bet', 'win'].includes(t.type)
    );
    return res.json({ transactions: financialTxs.slice(0, 150) });
  });

  app.get('/api/vip/info', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || '108429';
    let user = db.getUser(uid);
    if (user) {
      user = recalculateUserVip(user);
    }
    const claimedRewards = (user as any)?.claimedVipRewards || [];
    return res.json({ 
      vipLevels: db.vipLevels, 
      userVip: { 
        level: user?.vipLevel || 1, 
        exp: user?.vipExp || 0, 
        turnover: user?.totalBet || 0,
        totalDeposit: user?.totalDeposit || 0,
        claimedRewards,
      } 
    });
  });

  app.post('/api/vip/claim-reward', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const { rewardType, level, amount } = req.body;
    let user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user = recalculateUserVip(user);

    const targetLevel = Number(level || 1);

    // Look up VIP tier config to strictly verify task / turnover / exp completion
    const tierConfig = (db.vipTiers || []).find((t: any) => t.level === targetLevel) ||
                       (db.vipLevels || []).find((l: any) => l.level === targetLevel);
    
    const requiredExp = Number(tierConfig?.requiredExp || tierConfig?.requiredTurnover || (targetLevel === 1 ? 3000 : targetLevel * 10000));
    const userExp = Number(user.vipExp || (Number(user.totalDeposit || 0) + Number(user.totalBet || 0)));
    const currentVipLevel = Number(user.vipLevel || 0);

    // STRICT CHECK: The requirement must be 100% completed to claim!
    if (userExp < requiredExp) {
      const remainingExp = Math.max(0, requiredExp - userExp);
      return res.status(400).json({
        error: `VIP task incomplete! VIP${targetLevel} requires ₹${requiredExp.toLocaleString('en-IN')} EXP. You currently have ₹${userExp.toLocaleString('en-IN')} EXP (₹${remainingExp.toLocaleString('en-IN')} remaining). VIP rewards can ONLY be claimed when the full task is 100% complete!`,
      });
    }

    if (currentVipLevel < targetLevel && userExp < requiredExp) {
      return res.status(400).json({ error: `You need VIP${targetLevel} to claim this reward. Current level is VIP${currentVipLevel}.` });
    }

    const claimKey = `${rewardType}_vip${targetLevel}`;
    const claimedList: string[] = (user as any).claimedVipRewards || [];

    if (rewardType === 'levelup' && claimedList.includes(claimKey)) {
      return res.status(400).json({ error: `VIP${targetLevel} Level-Up bonus has already been claimed!` });
    }

    const defaultReward = rewardType === 'monthly' ? (tierConfig?.monthlyReward || 30) : (tierConfig?.levelUpReward || 60);
    const rawAmt = Number(amount || defaultReward);
    if (rawAmt <= 0) {
      return res.status(400).json({ error: 'Invalid reward amount' });
    }
    const numAmt = Math.min(500, Math.max(1, rawAmt));

    // Add to user claimed list
    claimedList.push(claimKey);
    (user as any).claimedVipRewards = claimedList;

    const prevBal = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + numAmt).toFixed(2));
    // Claimed bonus adds 1X rolling requirement
    user.requiredRolling = Number(((user.requiredRolling || 0) + numAmt).toFixed(2));
    user.remainingRolling = Number((Math.max(0, user.remainingRolling || 0) + numAmt).toFixed(2));
    user.requiredTurnover = user.requiredRolling;
    user.remainingTurnover = user.remainingRolling;

    const noteText = rewardType === 'levelup' 
      ? `VIP${targetLevel} Upgrade Bonus Claimed`
      : rewardType === 'monthly'
      ? `VIP${targetLevel} Monthly Salary Reward Claimed`
      : `VIP${targetLevel} Privileges Reward Claimed`;

    db.transactions.unshift({
      id: `TX-VIP-${Date.now()}`,
      uid: user.uid,
      type: 'bonus',
      amount: numAmt,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `VIP-${rewardType.toUpperCase()}-L${targetLevel}`,
      createdBy: 'system',
      note: noteText,
      createdAt: new Date().toISOString(),
    });

    db.saveToDisk();
    await saveUserPermanently(user).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 Successfully claimed ₹${numAmt} ${noteText}! Credited to wallet.`,
      newBalance: user.walletBalance,
      claimedRewards: claimedList,
    });
  });

  app.get('/api/referral/info', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || '108429';
    const user = db.users.get(uid);
    const allUsers = Array.from(db.users.values());

    // Direct downline (Level 1)
    const directUsers = allUsers.filter(u => u.referredBy === uid || (user?.referralCode && u.referredBy === user.referralCode));
    const directUids = new Set(directUsers.map(u => u.uid));

    // Team downline (Level 2 + 3)
    const teamUsers = allUsers.filter(u => u.referredBy && directUids.has(u.referredBy) && u.uid !== uid);

    // Calculate deposits and turnover
    let directDepositsCount = 0;
    let directDepositAmount = 0;
    let directFirstDepositCount = 0;

    directUsers.forEach(u => {
      const userDeps = db.deposits.filter(d => d.uid === u.uid && d.status === 'approved');
      if (userDeps.length > 0) {
        directDepositsCount += userDeps.length;
        directFirstDepositCount += 1;
        directDepositAmount += userDeps.reduce((sum, d) => sum + d.amount, 0);
      }
    });

    let teamDepositsCount = 0;
    let teamDepositAmount = 0;
    let teamFirstDepositCount = 0;

    teamUsers.forEach(u => {
      const userDeps = db.deposits.filter(d => d.uid === u.uid && d.status === 'approved');
      if (userDeps.length > 0) {
        teamDepositsCount += userDeps.length;
        teamFirstDepositCount += 1;
        teamDepositAmount += userDeps.reduce((sum, d) => sum + d.amount, 0);
      }
    });

    const depCommPercent = 5;
    const teamDepCommPercent = 1;

    // Direct deposit commission: strictly 5%; Team deposit commission: strictly 1%
    const directDepositComm = Number(((directDepositAmount * depCommPercent) / 100).toFixed(2));
    const teamDepositComm = Number(((teamDepositAmount * teamDepCommPercent) / 100).toFixed(2));

    const inviteBonusPerUser = Number(db.referralSystemSettings?.referralInviteBonus ?? 10);
    const inviteBonusTotal = directUsers.length * inviteBonusPerUser;

    const loggedDepositComms = (db.referralDepositCommissions || [])
      .filter(rec => rec.referrerUid === uid)
      .reduce((sum, rec) => sum + rec.commissionAmount, 0);

    const totalCalcCommission = Number(
      Math.max(
        Number((directDepositComm + teamDepositComm + inviteBonusTotal).toFixed(2)),
        Number((loggedDepositComms + inviteBonusTotal).toFixed(2)),
        Number((user?.referralEarnings || 0).toFixed(2))
      ).toFixed(2)
    );

    const totalClaimed = db.transactions
      .filter(t => t.uid === uid && t.type === 'referral_commission')
      .reduce((sum, t) => sum + t.amount, 0);

    const availableClaim = Math.max(0, Number((totalCalcCommission - totalClaimed).toFixed(2)));

    const now = new Date();
    const isYesterday = (dStr: string) => {
      const d = new Date(dStr);
      const diff = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
      return diff >= 1 && diff < 2;
    };

    const yesterdayComm = db.transactions
      .filter(t => t.uid === uid && t.type === 'referral_commission' && isYesterday(t.createdAt))
      .reduce((sum, t) => sum + t.amount, 0);

    const numericCode = user?.referralCode ? String(user.referralCode).replace(/\D/g, '') || String(user.uid) : COMPANY_REFERRAL_CODE;

    return res.json({
      referralCode: numericCode,
      referralLink: `${req.protocol}://${req.get('host')}?ref=${numericCode}`,
      yesterdayCommission: yesterdayComm || (totalCalcCommission > 0 ? Number((totalCalcCommission * 0.35).toFixed(2)) : 0),
      thisWeekCommission: totalCalcCommission,
      totalCommissionEarned: totalClaimed + availableClaim,
      availableToClaim: availableClaim,
      direct: {
        registeredCount: directUsers.length,
        depositNumber: directDepositsCount,
        depositAmount: directDepositAmount,
        firstDepositNumber: directFirstDepositCount,
        turnover: 0,
        commissionRate: `${depCommPercent}% Deposit Commission`,
        users: directUsers.map(d => ({ uid: d.uid, username: d.username, date: d.registrationDate, totalBet: d.totalBet, status: d.status })),
      },
      team: {
        registeredCount: teamUsers.length,
        depositNumber: teamDepositsCount,
        depositAmount: teamDepositAmount,
        firstDepositNumber: teamFirstDepositCount,
        turnover: 0,
        commissionRate: `${teamDepCommPercent}% Team Deposit Commission`,
        users: teamUsers.map(d => ({ uid: d.uid, username: d.username, date: d.registrationDate, totalBet: d.totalBet, status: d.status })),
      },
      rebateRates: [
        { feature: 'Referral Invite Bonus', reward: `₹${inviteBonusPerUser} Per Friend`, note: 'Instant upon registration' },
        { feature: 'Subordinate Deposit Commission', reward: `${depCommPercent}%`, note: 'On every client recharge deposit' },
        { feature: 'Team Subordinate Deposit', reward: `${teamDepCommPercent}%`, note: 'Tier 2 team deposit commission' },
        { feature: 'Game Bet Commission', reward: '0.00% (Disabled)', note: 'Bet commission is removed' },
      ],
    });
  });

  app.post('/api/referral/claim-commission', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const allUsers = Array.from(db.users.values());
    const directUsers = allUsers.filter(u => u.referredBy === uid || (user.referralCode && u.referredBy === user.referralCode));
    const directUids = new Set(directUsers.map(u => u.uid));
    const teamUsers = allUsers.filter(u => u.referredBy && directUids.has(u.referredBy) && u.uid !== uid);

    let directDepositAmount = 0;
    directUsers.forEach(u => {
      const userDeps = db.deposits.filter(d => d.uid === u.uid && d.status === 'approved');
      if (userDeps.length > 0) {
        directDepositAmount += userDeps.reduce((sum, d) => sum + d.amount, 0);
      }
    });

    let teamDepositAmount = 0;
    teamUsers.forEach(u => {
      const userDeps = db.deposits.filter(d => d.uid === u.uid && d.status === 'approved');
      if (userDeps.length > 0) {
        teamDepositAmount += userDeps.reduce((sum, d) => sum + d.amount, 0);
      }
    });

    const depCommPercent = 5;
    const teamDepCommPercent = 1;

    const directDepositComm = Number(((directDepositAmount * depCommPercent) / 100).toFixed(2));
    const teamDepositComm = Number(((teamDepositAmount * teamDepCommPercent) / 100).toFixed(2));

    const inviteBonusPerUser = Number(db.referralSystemSettings?.referralInviteBonus ?? 10);
    const inviteBonusTotal = directUsers.length * inviteBonusPerUser;

    const loggedDepositComms = (db.referralDepositCommissions || [])
      .filter(rec => rec.referrerUid === uid)
      .reduce((sum, rec) => sum + rec.commissionAmount, 0);

    const totalCalcCommission = Number(
      Math.max(
        Number((directDepositComm + teamDepositComm + inviteBonusTotal).toFixed(2)),
        Number((loggedDepositComms + inviteBonusTotal).toFixed(2)),
        Number((user?.referralEarnings || 0).toFixed(2))
      ).toFixed(2)
    );

    const totalClaimed = db.transactions
      .filter(t => t.uid === uid && t.type === 'referral_commission')
      .reduce((sum, t) => sum + t.amount, 0);

    const claimable = Math.max(0, Number((totalCalcCommission - totalClaimed).toFixed(2)));

    if (claimable <= 0) {
      return res.status(400).json({ error: 'No claimable referral commission available. Invite more friends or wait for referral deposits!' });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + claimable).toFixed(2));
    user.requiredTurnover = Number(((user.requiredTurnover || 0) + claimable).toFixed(2));
    user.remainingTurnover = Number((Math.max(0, user.remainingTurnover || 0) + claimable).toFixed(2));

    db.transactions.unshift({
      id: `TX-COMM-${Date.now()}`,
      uid: user.uid,
      type: 'referral_commission',
      amount: claimable,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `REFERRAL-COMM-${Date.now()}`,
      createdBy: 'system',
      note: `Referral Commission transferred to main wallet`,
      createdAt: new Date().toISOString(),
    });

    db.saveToDisk();
    await saveUserPermanently(user).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 ₹${claimable.toFixed(2)} Referral Commission successfully transferred to your main wallet!`,
      claimedAmount: claimable,
      newBalance: user.walletBalance,
    });
  });

  // 1% Referral Deposit Commission (accrues on subordinate deposits, unlocks at 12:00 AM midnight)
  app.get('/api/referral/deposit-commission', (req, res) => {
    const rawUid = (req.headers['x-user-uid'] as string) || (req.query.uid as string);
    if (!rawUid) return res.status(401).json({ error: 'User UID required' });
    const user = db.getUser(rawUid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!db.referralDepositCommissions) db.referralDepositCommissions = [];
    const now = Date.now();

    // Auto-settle any pending records that have passed their unlockTime (12:00 AM midnight)
    db.referralDepositCommissions.forEach(rec => {
      if (rec.referrerUid === user.uid && rec.status === 'pending' && now >= rec.unlockTime) {
        rec.status = 'claimable';
      }
    });

    const userCommissions = db.referralDepositCommissions.filter(rec => rec.referrerUid === user.uid);
    const todayAccrued = userCommissions
      .filter(rec => rec.status === 'pending')
      .reduce((sum, rec) => sum + rec.commissionAmount, 0);

    const availableToClaim = userCommissions
      .filter(rec => rec.status === 'claimable')
      .reduce((sum, rec) => sum + rec.commissionAmount, 0);

    const totalClaimed = userCommissions
      .filter(rec => rec.status === 'claimed')
      .reduce((sum, rec) => sum + rec.commissionAmount, 0);

    const totalEarned = Number((todayAccrued + availableToClaim + totalClaimed).toFixed(2));

    const nextMidnight = new Date();
    nextMidnight.setHours(24, 0, 0, 0);

    return res.json({
      success: true,
      todayAccrued: Number(todayAccrued.toFixed(2)),
      availableToClaim: Number(availableToClaim.toFixed(2)),
      totalClaimed: Number(totalClaimed.toFixed(2)),
      totalEarned,
      nextUnlockTime: nextMidnight.getTime(),
      records: userCommissions.slice(0, 50),
    });
  });

  app.post('/api/referral/claim-deposit-commission', async (req, res) => {
    const rawUid = (req.headers['x-user-uid'] as string) || (req.body.uid as string);
    if (!rawUid) return res.status(401).json({ error: 'User UID required' });
    const user = db.getUser(rawUid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!db.referralDepositCommissions) db.referralDepositCommissions = [];
    const now = Date.now();

    // Auto-settle any pending records that have passed unlockTime
    db.referralDepositCommissions.forEach(rec => {
      if (rec.referrerUid === user.uid && rec.status === 'pending' && now >= rec.unlockTime) {
        rec.status = 'claimable';
      }
    });

    const claimableRecords = db.referralDepositCommissions.filter(
      rec => rec.referrerUid === user.uid && rec.status === 'claimable'
    );

    const totalClaimable = claimableRecords.reduce((sum, rec) => sum + rec.commissionAmount, 0);
    const claimable = Number(totalClaimable.toFixed(2));

    if (claimable <= 0) {
      const pendingSum = db.referralDepositCommissions
        .filter(rec => rec.referrerUid === user.uid && rec.status === 'pending')
        .reduce((sum, rec) => sum + rec.commissionAmount, 0);

      if (pendingSum > 0) {
        return res.status(400).json({
          error: `Today's ₹${pendingSum.toFixed(2)} deposit commission will unlock and be claimable tonight at 12:00 AM (midnight settlement)!`,
        });
      }
      return res.status(400).json({
        error: 'No claimable deposit commission available at this moment.',
      });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + claimable).toFixed(2));
    user.requiredRolling = Number(((user.requiredRolling || 0) + claimable).toFixed(2));
    user.remainingRolling = Number((Math.max(0, user.remainingRolling || 0) + claimable).toFixed(2));
    user.requiredTurnover = user.requiredRolling;
    user.remainingTurnover = user.remainingRolling;

    const claimedTimestamp = new Date().toISOString();
    claimableRecords.forEach(rec => {
      rec.status = 'claimed';
      rec.claimedAt = claimedTimestamp;
    });

    db.transactions.unshift({
      id: `TX-RDC-${Date.now()}`,
      uid: user.uid,
      type: 'referral_commission',
      amount: claimable,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `RDC-CLAIM-${Date.now()}`,
      createdBy: 'system',
      note: `1% Subordinate Deposit Commission Claimed (Daily Midnight Settlement)`,
      createdAt: claimedTimestamp,
    });

    db.saveToDisk();
    await saveUserPermanently(user).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 ₹${claimable.toFixed(2)} 1% Deposit Commission credited to your wallet balance!`,
      claimedAmount: claimable,
      newBalance: user.walletBalance,
    });
  });

  // ===================== BONUS MISSIONS & ACTIVITY PROMOTIONS CONFIG APIS =====================
  const evaluateUserTaskProgress = (user: User, task: any) => {
    const target = Number(task.targetValue || 1);
    let current = 0;
    const targetType = task.targetType;

    if (targetType === 'deposit' || targetType === 'first_deposit') {
      const approvedDeposits = db.deposits.filter(d => (d.uid === user.uid || (user.phone && (d as any).phone === user.phone)) && d.status === 'approved');
      const totalDep = approvedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      current = Math.max(Number(user.totalDeposit || 0), totalDep);
    } else if (targetType === 'invite') {
      const allUsers = Array.from(db.users.values());
      const directUsers = allUsers.filter(u => u.referredBy === user.uid || (user.referralCode && u.referredBy === user.referralCode));
      current = directUsers.length;
    } else if (targetType === 'turnover' || targetType === 'bet') {
      current = Number(user.totalBet || 0);
    } else if (targetType === 'vip') {
      current = Number(user.vipLevel || 0);
    } else if (targetType === 'rounds') {
      const userBets = db.bets.filter(b => b.uid === user.uid);
      current = userBets.length;
    } else {
      current = 0;
    }

    const isCompleted = current >= target;
    const claimedTasks: string[] = (user as any).claimedGet500Tasks || [];
    const isClaimed = claimedTasks.includes(task.id);
    const percent = Math.min(100, Math.round((current / (target || 1)) * 100));

    return {
      current,
      target,
      percent,
      isCompleted,
      isClaimed,
    };
  };

  app.get('/api/bonus/tasks-config', (req, res) => {
    const uid = req.headers['x-user-uid'] as string;
    let user: User | undefined = undefined;
    if (uid) {
      user = db.users.get(uid) || Array.from(db.users.values()).find(u => u.uid === uid || u.id === uid);
    }
    const tasks = (db.bonusTasksConfig || []).filter((t: any) => t.isActive !== false);

    const tasksWithProgress = tasks.map((t: any) => {
      // Ensure all task rewards are capped under 200
      const safeReward = Math.min(199, Number(t.reward || 50));
      const normalizedTask = { ...t, reward: safeReward };
      if (user) {
        const progress = evaluateUserTaskProgress(user, normalizedTask);
        return { ...normalizedTask, ...progress };
      }
      return {
        ...normalizedTask,
        current: 0,
        target: Number(t.targetValue || 1),
        percent: 0,
        isCompleted: false,
        isClaimed: false,
      };
    });

    return res.json({ tasks: tasksWithProgress });
  });

  app.get('/api/promotions/activity-config', (req, res) => {
    const activities = (db.activityPromosConfig || [])
      .filter((a: any) => a.id !== 'act-streak-jackpot' && a.id !== 'act-daily-cashback' && a.isActive !== false)
      .map((a: any) => {
        // Ensure all activity rewards are capped under 200
        return {
          ...a,
          rewardValue: a.rewardValue ? Math.min(199, Number(a.rewardValue)) : a.rewardValue,
        };
      });
    return res.json({ activities });
  });

  app.post('/api/bonus/claim-get500', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid;
    if (!uid) {
      return res.status(401).json({ error: 'Please log in to claim mission bonuses' });
    }
    let user = db.users.get(uid);
    if (!user) {
      user = Array.from(db.users.values()).find(u => u.uid === uid || u.id === uid);
    }
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { taskId, taskReward } = req.body;
    const claimedTasks: string[] = (user as any).claimedGet500Tasks || [];
    if (claimedTasks.includes(taskId)) {
      return res.status(400).json({ error: 'You have already claimed this bonus reward!' });
    }

    // Find actual configured task
    const taskConfig = (db.bonusTasksConfig || []).find((t: any) => t.id === taskId);
    if (!taskConfig) {
      return res.status(404).json({ error: 'Bonus task configuration not found' });
    }

    // Strict Verification: Check if user actually completed the requirement!
    const progress = evaluateUserTaskProgress(user, taskConfig);
    if (!progress.isCompleted) {
      let unit = '';
      if (taskConfig.targetType === 'deposit' || taskConfig.targetType === 'turnover') unit = '₹';
      return res.status(400).json({
        error: `Task requirement incomplete! "${taskConfig.title}" requires ${unit}${progress.target} (Current Progress: ${unit}${progress.current}). Please complete the task before claiming.`,
        progress,
      });
    }

    // Enforce bonus cap: strictly under 200 (max ₹199)
    const rawReward = taskConfig ? Number(taskConfig.reward || 50) : Number(taskReward || 50);
    const reward = Math.min(199, Math.max(1, rawReward));

    claimedTasks.push(taskId);
    (user as any).claimedGet500Tasks = claimedTasks;

    const prevBal = user.walletBalance;
    user.walletBalance = Number((user.walletBalance + reward).toFixed(2));
    user.requiredTurnover = Number(((user.requiredTurnover || 0) + reward).toFixed(2));
    user.remainingTurnover = Number((Math.max(0, user.remainingTurnover || 0) + reward).toFixed(2));

    db.transactions.unshift({
      id: `TX-GET500-${Date.now()}`,
      uid: user.uid,
      type: 'bonus',
      amount: reward,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `BONUS-${taskId.toUpperCase()}`,
      createdBy: 'system',
      note: `Claimed ₹${reward} Bonus Reward (${taskConfig?.title || taskId}) (1X Turnover Required)`,
      createdAt: new Date().toISOString(),
    });

    db.saveToDisk();
    await saveUserPermanently(user).catch(() => {});

    return res.json({
      success: true,
      message: `🎉 ₹${reward} Bonus credited to your wallet successfully!`,
      newBalance: user.walletBalance,
      claimedTasks,
    });
  });

  app.post('/api/bonus/claim-activity', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.uid || '108429';
    const { activityId, dayIndex } = req.body;
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const actConfig = (db.activityPromosConfig || []).find((a: any) => a.id === activityId);
    let reward = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    if (activityId === 'act-daily-checkin') {
      // Check if already checked in today
      const lastCheckin = (user as any).lastCheckinDate;
      if (lastCheckin === todayStr) {
        return res.status(400).json({ error: "You have already claimed today's check-in bonus! Please return tomorrow." });
      }
      const dailyRewards = actConfig?.extraSettings?.dailyCheckinRewards || [5, 10, 15, 25, 40, 60, 100];
      const dIdx = Math.min(6, Math.max(0, Number(dayIndex ?? 0)));
      reward = Math.min(199, dailyRewards[dIdx] || 10);
      (user as any).lastCheckinDate = todayStr;
    } else if (activityId === 'act-first-deposit') {
      // Verify first deposit requirement of ₹100+
      const approvedDeposits = db.deposits.filter(d => (d.uid === user.uid || (user.phone && (d as any).phone === user.phone)) && d.status === 'approved');
      const totalDep = Math.max(Number(user.totalDeposit || 0), approvedDeposits.reduce((sum, d) => sum + (Number(d.amount) || 0), 0));
      if (totalDep < 100) {
        return res.status(400).json({
          error: `Task Incomplete: You must complete a recharge of ₹100 or more to claim the First Deposit Match Bonus! (Current Deposit: ₹${totalDep}/₹100). Please recharge first.`,
        });
      }
      const claimedActivities: string[] = (user as any).claimedActivities || [];
      if (claimedActivities.includes('act-first-deposit')) {
        return res.status(400).json({ error: 'You have already claimed the First Deposit Bonus!' });
      }
      reward = Math.min(199, Number(actConfig?.rewardValue || 50));
      claimedActivities.push('act-first-deposit');
      (user as any).claimedActivities = claimedActivities;
    } else if (activityId === 'act-streak-jackpot') {
      // Verify winning streak of 5 consecutive wins with min bet 20
      const userBets = db.bets.filter(b => b.uid === user.uid && b.status !== 'pending').slice(0, 10);
      let currentStreak = 0;
      for (const b of userBets) {
        if (b.status === 'won' && Number(b.amount) >= 20) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (currentStreak < 5) {
        return res.status(400).json({
          error: `Task Incomplete: You need 5 consecutive winning game rounds (min ₹20 bet) to claim the ₹150 Jackpot! (Current Streak: ${currentStreak}/5). Please achieve your streak first.`,
        });
      }
      const claimedActivities: string[] = (user as any).claimedActivities || [];
      if (claimedActivities.includes('act-streak-jackpot')) {
        return res.status(400).json({ error: 'You have already claimed the Winning Streak Jackpot!' });
      }
      reward = Math.min(199, Number(actConfig?.rewardValue || 150));
      claimedActivities.push('act-streak-jackpot');
      (user as any).claimedActivities = claimedActivities;
    } else if (activityId === 'act-daily-cashback') {
      // Verify loss rebate requirement
      const totalLoss = Number(user.totalLoss || 0);
      if (totalLoss <= 0) {
        return res.status(400).json({
          error: 'Task Incomplete: No game losses recorded today. Play games to receive your 5% loss rebate.',
        });
      }
      const rawCashback = Math.round(totalLoss * 0.05);
      reward = Math.min(199, Math.max(5, rawCashback));
    } else if (actConfig && actConfig.rewardValue) {
      reward = Math.min(199, Number(actConfig.rewardValue));
    }

    if (reward > 0) {
      const prevBal = user.walletBalance;
      user.walletBalance = Number((user.walletBalance + reward).toFixed(2));
      user.requiredTurnover = Number(((user.requiredTurnover || 0) + reward).toFixed(2));
      user.remainingTurnover = Number((Math.max(0, user.remainingTurnover || 0) + reward).toFixed(2));
      db.transactions.unshift({
        id: `TX-ACT-${Date.now()}`,
        uid: user.uid,
        type: 'bonus',
        amount: reward,
        status: 'completed',
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `ACT-${activityId.toUpperCase()}`,
        createdBy: 'system',
        note: `Claimed ₹${reward} Activity Event Bonus (${actConfig?.title || activityId}) (1X Turnover Required)`,
        createdAt: new Date().toISOString(),
      });
      db.saveToDisk();
      await saveUserPermanently(user).catch(() => {});
    }

    return res.json({
      success: true,
      message: reward > 0 ? `🎉 ₹${reward} Activity Reward credited to wallet!` : 'Participated successfully!',
      rewardGranted: reward,
      newBalance: user.walletBalance,
    });
  });

  app.get('/api/promotions/active', (req, res) => {
    const activePromos = db.promotions.filter(p => p.status === 'active');
    return res.json({ promotions: activePromos });
  });

  // ===================== ADMIN APIS =====================

  // Admin Auth
  app.post('/api/admin/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = Array.from(db.adminUsers.values()).find(
      a => a.email.toLowerCase() === email.toLowerCase() || a.username.toLowerCase() === email.toLowerCase()
    );

    if (!admin) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    if (admin.status === 'blocked') {
      return res.status(403).json({ error: 'Admin account blocked' });
    }

    admin.lastLogin = new Date().toISOString();
    logAdminAction(admin.username, 'Admin Login', `Admin ${admin.username} logged into control console`, undefined, undefined, undefined, req);

    return res.json({
      success: true,
      admin,
      token: `admin-token-${admin.id}`,
    });
  });

  app.post('/api/admin/auth/update-credentials', (req, res) => {
    const { newUsername, newEmail, newPassword, adminUsername } = req.body;
    
    // Find matching admin
    let currentAdmin = Array.from(db.adminUsers.values()).find(
      a => (adminUsername && a.username.toLowerCase() === adminUsername.toLowerCase()) || a.role === 'super_admin'
    ) || Array.from(db.adminUsers.values())[0];

    if (!currentAdmin) {
      return res.status(404).json({ error: 'Admin account not found' });
    }

    const prevUsername = currentAdmin.username;
    if (newUsername && String(newUsername).trim()) {
      currentAdmin.username = String(newUsername).trim();
    }
    if (newEmail && String(newEmail).trim()) {
      currentAdmin.email = String(newEmail).trim();
    }
    if (newPassword && String(newPassword).trim()) {
      if (String(newPassword).trim().length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters long' });
      }
      (currentAdmin as any).password = String(newPassword).trim();
    }

    db.adminUsers.set(currentAdmin.id, currentAdmin);
    db.saveToDisk();

    logAdminAction(
      currentAdmin.username,
      'Update Admin Credentials',
      `Admin changed profile credentials. Username: ${currentAdmin.username}, Email: ${currentAdmin.email}`,
      undefined,
      prevUsername,
      currentAdmin.username,
      req
    );

    return res.json({
      success: true,
      message: 'Admin credentials updated successfully!',
      admin: currentAdmin
    });
  });

  app.get('/api/admin/auth/me', (req, res) => {
    const admin = Array.from(db.adminUsers.values())[0];
    return res.json({ admin });
  });

  // Game Control Center (Screenshot 1: Live Overview for all 4 games)
  app.get('/api/admin/game-control/overview', (req, res) => {
    const gameTypes: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
    const now = Date.now();

    const games = gameTypes.map(gt => {
      const p = db.currentPeriods.get(gt);
      const remainingMs = p ? Math.max(0, p.endTime - now) : 0;
      const remainingSec = Math.max(0, Math.floor(remainingMs / 1000));
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      const formattedTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

      const activeBets = p ? db.bets.filter(b => b.periodId === p.periodId && b.gameType === gt && b.status === 'pending') : [];
      const playersSet = new Set(activeBets.map(b => b.uid));
      const totalBetAmount = activeBets.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

      const sim = p ? gameEngine.calculatePotentialPayouts(gt, p.periodId) : {
        totalBetAmount: 0,
        outcomes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => ({ number: num, payout: 0, profitDiff: 0, profit: 0, loss: 0 })),
        houseBest: { number: 0, payout: 0, profitDiff: 0 },
        target75: { number: 1, payout: 0, profitDiff: 0 },
        target50: { number: 2, payout: 0, profitDiff: 0 },
        target25: { number: 3, payout: 0, profitDiff: 0 },
        target100: { number: 4, payout: 0, profitDiff: 0 },
      };

      const labels: Record<string, string> = {
        wingo_30s: '30 Seconds',
        wingo_1m: '1 Minute',
        wingo_3m: '3 Minutes',
        wingo_5m: '5 Minutes',
      };

      return {
        gameType: gt,
        name: labels[gt] || gt,
        periodId: p?.periodId || '---',
        remainingSeconds: remainingSec,
        formattedTime,
        playersCount: playersSet.size,
        totalBetAmount,
        outcomes: (sim.outcomes || []).map(o => ({
          number: o.number,
          payout: Number(o.payout || 0),
          profitDiff: Number(o.profitDiff || 0),
          profit: Number(o.profit !== undefined ? o.profit : Math.max(0, o.profitDiff || 0)),
          loss: Number(o.loss !== undefined ? o.loss : (o.profitDiff < 0 ? Math.abs(o.profitDiff) : 0)),
        })),
        houseBest: sim.houseBest,
        target75: sim.target75,
        target50: sim.target50,
        target25: sim.target25,
        target100: sim.target100,
        autoMode: (db.gameAutoModes && db.gameAutoModes[gt]) || 'house_best',
        manualLockedNumber: p?.manualResultNumber ?? null,
        isLocked: remainingSec <= 5,
      };
    });

    return res.json({
      games,
      autoResultRules: db.autoResultRules || [],
      gameAutoModes: db.gameAutoModes || {},
    });
  });

  app.post('/api/admin/game-control/set-auto-mode', (req, res) => {
    const { gameType, mode } = req.body;
    if (!gameType || !mode) return res.status(400).json({ error: 'gameType and mode required' });
    if (!db.gameAutoModes) db.gameAutoModes = {};
    db.gameAutoModes[gameType] = mode;
    db.saveToDisk();
    return res.json({ success: true, gameAutoModes: db.gameAutoModes });
  });

  app.post('/api/admin/game-control/set-auto-rules', (req, res) => {
    const { rules } = req.body;
    if (Array.isArray(rules)) {
      db.autoResultRules = rules;
      db.saveToDisk();
      return res.json({ success: true, autoResultRules: db.autoResultRules });
    }
    return res.status(400).json({ error: 'Rules must be an array' });
  });

  app.post('/api/admin/game-control/lock-number', (req, res) => {
    const { gameType, periodId, number, adminUsername } = req.body;
    const period = db.currentPeriods.get(gameType);
    if (!period) return res.status(404).json({ error: 'Game not found' });

    if (number === null || number === undefined) {
      period.manualResultNumber = null;
    } else {
      const num = Number(number);
      if (isNaN(num) || num < 0 || num > 9) {
        return res.status(400).json({ error: 'Winning ball must be between 0 and 9' });
      }
      period.manualResultNumber = num;
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Lock Winning Ball',
      `Locked result #${number} for ${gameType} Period #${period.periodId}`,
      undefined,
      undefined,
      `Ball: ${number}`,
      req
    );

    return res.json({ success: true, message: `Winning ball #${number} saved for ${gameType}!`, period });
  });

  // Payment Methods Admin CRUD (Screenshot 3)
  app.get('/api/admin/payment-methods', (req, res) => {
    return res.json({ paymentMethods: db.paymentMethods || [] });
  });

  app.post('/api/admin/payment-methods', (req, res) => {
    const { type, name, upiId, bankName, accountNumber, ifscCode, accountHolderName, minAmount, maxAmount, isActive, adminUsername } = req.body;
    if (!name) return res.status(400).json({ error: 'Method name/label is required' });

    const newMethod = {
      id: `pm-${Date.now()}`,
      type: type || 'qr',
      name: name.trim(),
      upiId: upiId ? upiId.trim() : undefined,
      bankName: bankName ? bankName.trim() : undefined,
      accountNumber: accountNumber ? accountNumber.trim() : undefined,
      ifscCode: ifscCode ? ifscCode.trim() : undefined,
      accountHolderName: accountHolderName ? accountHolderName.trim() : undefined,
      minAmount: Number(minAmount || 100),
      maxAmount: Number(maxAmount || 50000),
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
    };

    if (!db.paymentMethods) db.paymentMethods = [];
    db.paymentMethods.unshift(newMethod);
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Create Payment Method', `Created payment method ${name} (${type})`, undefined, undefined, undefined, req);
    return res.json({ success: true, paymentMethod: newMethod, paymentMethods: db.paymentMethods });
  });

  app.put('/api/admin/payment-methods/:id', (req, res) => {
    const { id } = req.params;
    const { type, name, upiId, bankName, accountNumber, ifscCode, accountHolderName, minAmount, maxAmount, isActive, adminUsername } = req.body;
    if (!db.paymentMethods) db.paymentMethods = [];
    const item = db.paymentMethods.find(p => p.id === id);
    if (!item) return res.status(404).json({ error: 'Payment method not found' });

    if (name !== undefined) item.name = String(name).trim();
    if (type !== undefined) item.type = type;
    if (upiId !== undefined) item.upiId = upiId ? String(upiId).trim() : undefined;
    if (bankName !== undefined) item.bankName = bankName ? String(bankName).trim() : undefined;
    if (accountNumber !== undefined) item.accountNumber = accountNumber ? String(accountNumber).trim() : undefined;
    if (ifscCode !== undefined) item.ifscCode = ifscCode ? String(ifscCode).trim().toUpperCase() : undefined;
    if (accountHolderName !== undefined) item.accountHolderName = accountHolderName ? String(accountHolderName).trim() : undefined;
    if (minAmount !== undefined) item.minAmount = Number(minAmount);
    if (maxAmount !== undefined) item.maxAmount = Number(maxAmount);
    if (isActive !== undefined) item.isActive = Boolean(isActive);

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Payment Method', `Updated payment method ${item.name}`, undefined, undefined, undefined, req);
    return res.json({ success: true, paymentMethod: item, paymentMethods: db.paymentMethods });
  });

  app.delete('/api/admin/payment-methods/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (!db.paymentMethods) db.paymentMethods = [];
    const idx = db.paymentMethods.findIndex(p => p.id === id);
    if (idx !== -1) {
      const removed = db.paymentMethods.splice(idx, 1)[0];
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Delete Payment Method', `Deleted payment method ${removed.name}`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, paymentMethods: db.paymentMethods });
  });

  // Withdraw Settings (Screenshot 2)
  app.get('/api/admin/withdraw-settings', (req, res) => {
    return res.json({ settings: db.withdrawSettings });
  });

  app.post('/api/admin/withdraw-settings', (req, res) => {
    const { adminUsername, ...settings } = req.body;
    db.withdrawSettings = {
      ...db.withdrawSettings,
      ...settings,
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Withdraw Settings', `Updated live withdrawal limits and time window`, undefined, undefined, undefined, req);
    return res.json({ success: true, settings: db.withdrawSettings });
  });

  // Bonus & Commission Settings
  app.get('/api/admin/bonus-commission', (req, res) => {
    return res.json({ settings: db.bonusCommissionSettings });
  });

  app.post('/api/admin/bonus-commission', (req, res) => {
    const { depositBonusPercent, winningDeductionPercent, firstDepositBonusPercent, gameWinningDeductions, adminUsername } = req.body;
    db.bonusCommissionSettings = {
      depositBonusPercent: Number(depositBonusPercent ?? db.bonusCommissionSettings?.depositBonusPercent ?? 5),
      winningDeductionPercent: Number(winningDeductionPercent ?? db.bonusCommissionSettings?.winningDeductionPercent ?? 2),
      firstDepositBonusPercent: Number(firstDepositBonusPercent ?? db.bonusCommissionSettings?.firstDepositBonusPercent ?? 10),
      gameWinningDeductions: gameWinningDeductions && typeof gameWinningDeductions === 'object'
        ? { ...db.bonusCommissionSettings?.gameWinningDeductions, ...gameWinningDeductions }
        : db.bonusCommissionSettings?.gameWinningDeductions || {},
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Bonus & Commission', `Updated deposit bonus ${depositBonusPercent}% and winning tax/cut settings for all games`, undefined, undefined, undefined, req);
    return res.json({ success: true, settings: db.bonusCommissionSettings });
  });

  // Referral Settings & History
  app.get('/api/admin/referral-settings', (req, res) => {
    return res.json({
      settings: db.referralSystemSettings,
      history: db.referralSystemSettings?.history || [],
    });
  });

  app.post('/api/admin/referral-settings', (req, res) => {
    const { signupBonus, referralInviteBonus, depositCommissionPercent, adminUsername } = req.body;
    db.referralSystemSettings = {
      ...db.referralSystemSettings,
      signupBonus: Number(signupBonus ?? 10),
      referralInviteBonus: Number(referralInviteBonus ?? 10),
      depositCommissionPercent: Number(depositCommissionPercent ?? 5),
      teamDepositCommissionPercent: 1,
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Referral Settings', `Updated referral bonuses and commission`, undefined, undefined, undefined, req);
    return res.json({ success: true, settings: db.referralSystemSettings });
  });

  // ===================== DEPOSIT AMOUNT-WISE BONUS TIERS APIS =====================
  app.get('/api/deposit-bonus-tiers', (req, res) => {
    return res.json({ tiers: db.depositAmountBonusTiers || [] });
  });

  app.post('/api/admin/deposit-bonus-tiers', (req, res) => {
    const { tiers, adminUsername } = req.body;
    if (Array.isArray(tiers)) {
      db.depositAmountBonusTiers = tiers;
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update Deposit Bonus Tiers', `Updated amount-wise deposit bonuses (${tiers.length} tiers)`, undefined, undefined, undefined, req);
      return res.json({ success: true, tiers: db.depositAmountBonusTiers });
    }
    return res.status(400).json({ error: 'Tiers must be an array' });
  });

  app.post('/api/admin/deposit-bonus-tiers/add', (req, res) => {
    const { amount, bonusAmount, bonusPercent, label, isActive, adminUsername } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Deposit amount is required and must be > 0' });

    const newTier = {
      id: `tier-${amount}-${Date.now()}`,
      amount: Number(amount),
      bonusAmount: Number(bonusAmount || 0),
      bonusPercent: Number(bonusPercent || 0),
      label: label ? String(label).trim() : (bonusAmount > 0 ? `+₹${bonusAmount} Bonus` : 'No Bonus'),
      isActive: isActive !== false,
    };

    if (!db.depositAmountBonusTiers) db.depositAmountBonusTiers = [];
    // Remove if same amount exists, then add
    db.depositAmountBonusTiers = db.depositAmountBonusTiers.filter(t => Number(t.amount) !== Number(amount));
    db.depositAmountBonusTiers.push(newTier);
    db.depositAmountBonusTiers.sort((a, b) => Number(a.amount) - Number(b.amount));
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Add Deposit Bonus Tier', `Added bonus tier for ₹${amount} with bonus ₹${bonusAmount}`, undefined, undefined, undefined, req);
    return res.json({ success: true, tiers: db.depositAmountBonusTiers });
  });

  app.delete('/api/admin/deposit-bonus-tiers/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (!db.depositAmountBonusTiers) db.depositAmountBonusTiers = [];
    db.depositAmountBonusTiers = db.depositAmountBonusTiers.filter(t => t.id !== id);
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Delete Deposit Bonus Tier', `Deleted tier ID ${id}`, undefined, undefined, undefined, req);
    return res.json({ success: true, tiers: db.depositAmountBonusTiers });
  });

  // ===================== ANNOUNCEMENT POPUP APIS =====================
  app.get('/api/announcement-popup', (req, res) => {
    return res.json({
      success: true,
      announcement: db.announcementPopup || {
        isEnabled: false,
        title: 'ArowClub Official Announcement',
        message: 'Welcome to ArowClub! Enjoy instant 24/7 UPI & Bank withdrawals, fair games, and daily deposit bonuses.',
        imageUrl: '/banners/bonus_100.jpg',
        buttonText: 'Got It / Continue',
        actionUrl: '/recharge',
      },
    });
  });

  app.post('/api/admin/announcement-popup', (req, res) => {
    const { announcement, adminUsername } = req.body;
    if (announcement && typeof announcement === 'object') {
      db.announcementPopup = {
        ...db.announcementPopup,
        ...announcement,
        isEnabled: Boolean(announcement.isEnabled),
      };
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update Announcement Popup', `Updated announcement modal (${db.announcementPopup.isEnabled ? 'Active' : 'Disabled'})`, undefined, undefined, undefined, req);
      return res.json({ success: true, announcement: db.announcementPopup });
    }
    return res.status(400).json({ error: 'Announcement payload is invalid' });
  });

  // ===================== FIRST DEPOSIT BONUS ACTIVITY CONFIG & CLAIM APIS =====================
  app.get(['/api/first-deposit-bonus-config', '/api/first-deposit-bonus/config'], (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
    let claimedTiers: string[] = [];
    let userTotalDeposit = 0;
    if (uid) {
      const user = db.getUser(uid);
      if (user) {
        claimedTiers = user.claimedFirstDepositTiers || [];
        userTotalDeposit = db.getUserTotalDeposit(user);
      }
    }

    return res.json({
      success: true,
      config: db.firstDepositBonusConfig || {
        isEnabled: true,
        title: 'Extra first deposit bonus',
        subtitle: 'Each account can only receive rewards once',
        tiers: [],
      },
      userTotalDeposit,
      claimedTiers,
    });
  });

  app.post(['/api/admin/first-deposit-bonus-config', '/api/admin/first-deposit-bonus/config'], (req, res) => {
    const { config, adminUsername } = req.body;
    if (config && typeof config === 'object') {
      db.firstDepositBonusConfig = {
        ...db.firstDepositBonusConfig,
        ...config,
        tiers: Array.isArray(config.tiers) ? config.tiers : (db.firstDepositBonusConfig?.tiers || []),
        isEnabled: config.isEnabled !== false,
      };
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update First Deposit Bonus Config', `Updated first deposit tiers (${db.firstDepositBonusConfig.tiers.length} tiers)`, undefined, undefined, undefined, req);
      return res.json({ success: true, config: db.firstDepositBonusConfig });
    }
    return res.status(400).json({ error: 'First deposit config payload is invalid' });
  });

  app.post('/api/bonus/claim-first-deposit-tier', async (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.body.userId || req.body.uid;
    const { tierId } = req.body;
    if (!uid || !tierId) return res.status(400).json({ error: 'User ID and Tier ID are required' });

    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const config = db.firstDepositBonusConfig;
    const tiers: any[] = config?.tiers || [];
    const tier = tiers.find((t: any) => t.id === tierId && t.isActive !== false);
    if (!tier) return res.status(404).json({ error: 'Deposit bonus tier not found or inactive' });

    if (!user.claimedFirstDepositTiers) user.claimedFirstDepositTiers = [];
    if (user.claimedFirstDepositTiers.includes(tier.id)) {
      return res.status(400).json({ error: 'This reward has already been claimed for this account.' });
    }

    const totalDeposit = db.getUserTotalDeposit(user);
    if (totalDeposit < Number(tier.amount)) {
      return res.status(400).json({
        error: `Deposit target not reached. Total deposit: ₹${totalDeposit} / ₹${tier.amount}`,
        currentDeposit: totalDeposit,
        targetDeposit: tier.amount,
      });
    }

    const bonusReward = Number(tier.bonusAmount || 0);
    if (bonusReward <= 0) {
      return res.status(400).json({ error: 'Invalid bonus amount' });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = parseFloat((user.walletBalance + bonusReward).toFixed(2));
    user.claimedFirstDepositTiers.push(tier.id);
    db.syncUserTurnover(user);

    const txRecord = {
      id: `TX-FDBONUS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uid: user.uid,
      type: 'bonus' as const,
      amount: bonusReward,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `Extra First Deposit Bonus (Tier ₹${tier.amount})`,
      note: `Received ₹${bonusReward} first deposit bonus for reaching ₹${tier.amount} recharge`,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord as any).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({
      success: true,
      message: `🎉 ₹${bonusReward} First Deposit Bonus successfully claimed and credited to your wallet!`,
      bonusAmount: bonusReward,
      newBalance: user.walletBalance,
      claimedTiers: user.claimedFirstDepositTiers,
      user,
    });
  });

  // ===================== ADMIN BONUS TASKS (GET ₹500 & MISSIONS) CONFIG APIS =====================
  app.get('/api/admin/bonus-tasks', (req, res) => {
    return res.json({ tasks: db.bonusTasksConfig || [] });
  });

  app.post('/api/admin/bonus-tasks/update', (req, res) => {
    const { tasks, adminUsername } = req.body;
    if (Array.isArray(tasks)) {
      db.bonusTasksConfig = tasks;
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update Bonus Tasks', `Updated ${tasks.length} mission/task bonus rules & amounts`, undefined, undefined, undefined, req);
      return res.json({ success: true, tasks: db.bonusTasksConfig });
    }
    return res.status(400).json({ error: 'tasks array is required' });
  });

  app.post('/api/admin/bonus-tasks/add', (req, res) => {
    const { title, reward, badge, badgeColor, desc, actionLabel, targetType, targetValue, isActive, adminUsername } = req.body;
    if (!title || !reward) {
      return res.status(400).json({ error: 'Title and reward amount are required' });
    }

    const newTask = {
      id: `task-${Date.now()}`,
      title: String(title).trim(),
      reward: Number(reward),
      badge: badge ? String(badge).trim() : 'BONUS',
      badgeColor: badgeColor || 'bg-amber-500',
      desc: desc ? String(desc).trim() : `Complete mission to claim ₹${reward} bonus cash reward.`,
      actionLabel: actionLabel || 'Claim Reward',
      targetType: targetType || 'custom',
      targetValue: Number(targetValue || 1),
      isActive: isActive !== false,
    };

    if (!db.bonusTasksConfig) db.bonusTasksConfig = [];
    db.bonusTasksConfig.push(newTask);
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Add Bonus Task', `Added new bonus task: ${title} (Reward: ₹${reward})`, undefined, undefined, undefined, req);
    return res.json({ success: true, tasks: db.bonusTasksConfig });
  });

  app.delete('/api/admin/bonus-tasks/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (!db.bonusTasksConfig) db.bonusTasksConfig = [];
    db.bonusTasksConfig = db.bonusTasksConfig.filter(t => t.id !== id);
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Delete Bonus Task', `Deleted bonus task ID ${id}`, undefined, undefined, undefined, req);
    return res.json({ success: true, tasks: db.bonusTasksConfig });
  });

  // ===================== ADMIN ACTIVITY PROMOTIONS CONFIG APIS =====================
  app.get('/api/admin/activity-promos', (req, res) => {
    return res.json({ activities: db.activityPromosConfig || [] });
  });

  app.post('/api/admin/activity-promos/update', (req, res) => {
    const { activities, adminUsername } = req.body;
    if (Array.isArray(activities)) {
      db.activityPromosConfig = activities;
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update Activity Promotions', `Updated ${activities.length} activity event rules & rewards`, undefined, undefined, undefined, req);
      return res.json({ success: true, activities: db.activityPromosConfig });
    }
    return res.status(400).json({ error: 'activities array is required' });
  });

  app.post('/api/admin/activity-promos/add', (req, res) => {
    const { title, rewardText, rewardValue, tag, tagColor, desc, rules, badge, targetType, extraSettings, isActive, adminUsername } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'Activity Title is required' });
    }

    const newActivity = {
      id: `act-${Date.now()}`,
      title: String(title).trim(),
      rewardText: rewardText ? String(rewardText).trim() : (rewardValue ? `₹${rewardValue}` : 'Bonus Gift'),
      rewardValue: Number(rewardValue || 0),
      tag: tag ? String(tag).trim() : 'SPECIAL',
      tagColor: tagColor || 'bg-purple-500',
      desc: desc ? String(desc).trim() : 'Participate to win exclusive bonus rewards.',
      rules: rules ? String(rules).trim() : 'Standard terms & wagering rules apply.',
      badge: badge || 'NEW',
      targetType: targetType || 'custom',
      extraSettings: extraSettings || {},
      isActive: isActive !== false,
    };

    if (!db.activityPromosConfig) db.activityPromosConfig = [];
    db.activityPromosConfig.push(newActivity);
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Add Activity Promo', `Added activity event: ${title}`, undefined, undefined, undefined, req);
    return res.json({ success: true, activities: db.activityPromosConfig });
  });

  app.delete('/api/admin/activity-promos/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (!db.activityPromosConfig) db.activityPromosConfig = [];
    db.activityPromosConfig = db.activityPromosConfig.filter(a => a.id !== id);
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Delete Activity Promo', `Deleted activity event ID ${id}`, undefined, undefined, undefined, req);
    return res.json({ success: true, activities: db.activityPromosConfig });
  });

  // ===================== VIP TIERS & BONUS EDIT MANAGEMENT APIS =====================
  app.get('/api/vip-tiers', (req, res) => {
    return res.json({ tiers: db.vipTiers || [] });
  });

  app.get('/api/admin/vip-tiers', (req, res) => {
    return res.json({ tiers: db.vipTiers || [] });
  });

  app.post('/api/admin/vip-tiers', (req, res) => {
    const { tiers, adminUsername } = req.body;
    if (!Array.isArray(tiers)) {
      return res.status(400).json({ error: 'Tiers must be an array of VIP tier objects' });
    }
    db.vipTiers = tiers;
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update VIP Tiers', `Updated VIP tiers configuration (${tiers.length} levels)`, undefined, undefined, undefined, req);
    return res.json({ success: true, tiers: db.vipTiers });
  });

  // Comprehensive Bonus Settings (Daily check-in, Tasks, Activities, Referral, Cashback, Commission)
  app.get('/api/admin/bonus-all-settings', (req, res) => {
    return res.json({
      bonusCommission: db.bonusCommissionSettings,
      referralSystem: db.referralSystemSettings,
      depositTiers: db.depositAmountBonusTiers || [],
      bonusTasks: db.bonusTasksConfig || [],
      activityPromos: db.activityPromosConfig || [],
      vipTiers: db.vipTiers || [],
    });
  });

  app.post('/api/admin/bonus-all-settings', (req, res) => {
    const {
      bonusCommission,
      referralSystem,
      depositTiers,
      bonusTasks,
      activityPromos,
      vipTiers,
      adminUsername,
    } = req.body;

    if (bonusCommission) {
      db.bonusCommissionSettings = { ...db.bonusCommissionSettings, ...bonusCommission };
    }
    if (referralSystem) {
      db.referralSystemSettings = { ...db.referralSystemSettings, ...referralSystem };
    }
    if (Array.isArray(depositTiers)) {
      db.depositAmountBonusTiers = depositTiers;
    }
    if (Array.isArray(bonusTasks)) {
      db.bonusTasksConfig = bonusTasks;
    }
    if (Array.isArray(activityPromos)) {
      db.activityPromosConfig = activityPromos;
    }
    if (Array.isArray(vipTiers)) {
      db.vipTiers = vipTiers;
    }

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Bonus Master Settings', 'Updated full platform bonus & promotion rules', undefined, undefined, undefined, req);
    return res.json({
      success: true,
      message: 'All bonus settings updated successfully!',
      bonusCommission: db.bonusCommissionSettings,
      referralSystem: db.referralSystemSettings,
      depositTiers: db.depositAmountBonusTiers,
      bonusTasks: db.bonusTasksConfig,
      activityPromos: db.activityPromosConfig,
      vipTiers: db.vipTiers,
    });
  });

  // Admin UPI Payment Details (Section A)
  app.get('/api/admin/upi-details', (req, res) => {
    return res.json({ upiDetails: db.adminUpiDetails || {} });
  });

  app.post('/api/admin/upi-details', (req, res) => {
    const { upiId, payeeName, instructions, isEnabled, adminUsername } = req.body;
    db.adminUpiDetails = {
      upiId: upiId !== undefined ? String(upiId).trim() : (db.adminUpiDetails?.upiId || ''),
      payeeName: payeeName !== undefined ? String(payeeName).trim() : (db.adminUpiDetails?.payeeName || 'ArowClub Official'),
      instructions: instructions !== undefined ? String(instructions).trim() : (db.adminUpiDetails?.instructions || ''),
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : (db.adminUpiDetails?.isEnabled ?? true),
      updatedAt: new Date().toISOString(),
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Admin UPI Details', `Updated official UPI receiving ID: ${db.adminUpiDetails.upiId}`, undefined, undefined, undefined, req);
    return res.json({ success: true, message: 'Admin UPI details updated successfully!', upiDetails: db.adminUpiDetails });
  });

  app.delete('/api/admin/upi-details', (req, res) => {
    const { adminUsername } = req.body || {};
    db.adminUpiDetails = {
      upiId: '',
      payeeName: '',
      instructions: '',
      isEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Delete Admin UPI Details', 'Deleted & cleared official UPI payment receiving details', undefined, undefined, undefined, req);
    return res.json({ success: true, message: 'UPI details deleted successfully!', upiDetails: db.adminUpiDetails });
  });

  // Admin Official Receiving Bank Details (Section B)
  app.get('/api/admin/bank-details', (req, res) => {
    return res.json({ bankDetails: db.adminBankDetails || {} });
  });

  // Public Combined Payment Details for User Deposit & Recharge
  app.get('/api/public/payment-details', (req, res) => {
    return res.json({
      upi: db.adminUpiDetails || null,
      bank: db.adminBankDetails || null,
      paymentMethods: db.paymentMethods || [],
    });
  });

  app.get('/api/payment-methods/admin-bank', (req, res) => {
    return res.json({ 
      bankDetails: db.adminBankDetails || {},
      upiDetails: db.adminUpiDetails || {},
      paymentMethods: db.paymentMethods || [],
    });
  });

  app.post('/api/admin/bank-details', (req, res) => {
    const {
      bankName,
      accountHolderName,
      accountNumber,
      ifscCode,
      branch,
      upiId,
      qrImageUrl,
      instructions,
      isEnabled,
      adminUsername,
    } = req.body;

    db.adminBankDetails = {
      bankName: bankName !== undefined ? String(bankName).trim() : (db.adminBankDetails?.bankName || ''),
      accountHolderName: accountHolderName !== undefined ? String(accountHolderName).trim() : (db.adminBankDetails?.accountHolderName || ''),
      accountNumber: accountNumber !== undefined ? String(accountNumber).trim() : (db.adminBankDetails?.accountNumber || ''),
      ifscCode: ifscCode !== undefined ? String(ifscCode).trim().toUpperCase() : (db.adminBankDetails?.ifscCode || ''),
      branch: branch !== undefined ? String(branch).trim() : (db.adminBankDetails?.branch || ''),
      upiId: upiId !== undefined ? String(upiId).trim() : (db.adminBankDetails?.upiId || ''),
      qrImageUrl: qrImageUrl !== undefined ? String(qrImageUrl).trim() : (db.adminBankDetails?.qrImageUrl || ''),
      instructions: instructions !== undefined ? String(instructions).trim() : (db.adminBankDetails?.instructions || ''),
      isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : (db.adminBankDetails?.isEnabled ?? true),
      updatedAt: new Date().toISOString(),
    };

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Admin Bank Details', `Updated official bank receiving account: ${db.adminBankDetails.bankName} - ${db.adminBankDetails.accountNumber}`, undefined, undefined, undefined, req);
    return res.json({ success: true, message: 'Admin bank receiving details updated successfully!', bankDetails: db.adminBankDetails });
  });

  app.delete('/api/admin/bank-details', (req, res) => {
    const { adminUsername } = req.body || {};
    db.adminBankDetails = {
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      upiId: '',
      qrImageUrl: '',
      instructions: '',
      isEnabled: false,
      updatedAt: new Date().toISOString(),
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Delete/Clear Admin Bank Details', 'Deleted/Cleared official bank receiving details', undefined, undefined, undefined, req);
    return res.json({ success: true, message: 'Bank details cleared/deleted successfully!', bankDetails: db.adminBankDetails });
  });

  // ===================== ALL GAMES MASTER ADMIN CONTROLS APIS =====================
  app.get('/api/admin/all-game-controls', (req, res) => {
    if (!db.allGameControls) {
      db.allGameControls = {};
    }
    if (!db.allGameControls.ludo) {
      db.allGameControls.ludo = {
        isActive: true,
        maintenanceNotice: 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।',
        botDifficulty: 'medium',
        winTargetRTP: 0.90,
      };
    }
    return res.json({ controls: db.allGameControls || {} });
  });

  // Public Ludo Game Status (Checks if active or under admin maintenance)
  app.get('/api/game/ludo/status', (req, res) => {
    const ludo = db.allGameControls?.ludo || {
      isActive: true,
      maintenanceNotice: 'लूडो गेम में नया अपडेट और मेंटेनेंस कार्य प्रगति पर है। कृपया कुछ समय बाद पुनः प्रयास करें।',
      botDifficulty: 'medium',
      winTargetRTP: 0.90,
    };
    return res.json({
      isActive: ludo.isActive !== false,
      maintenanceNotice: ludo.maintenanceNotice || 'Ludo game is temporarily under maintenance.',
      botDifficulty: ludo.botDifficulty || 'medium',
    });
  });

  app.post('/api/admin/all-game-controls', (req, res) => {
    const { controls, adminUsername } = req.body;
    if (controls && typeof controls === 'object') {
      db.allGameControls = {
        ...db.allGameControls,
        ...controls,
      };
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update All Games Controls', 'Admin updated master game settings & rigging parameters', undefined, undefined, undefined, req);
      return res.json({ success: true, controls: db.allGameControls });
    }
    return res.status(400).json({ error: 'Controls payload is invalid' });
  });

  // Game Engine Endpoints for User Game Engines
  app.post('/api/game/mines/start', (req, res) => {
    const { uid, numMines = 2, betAmount = 10 } = req.body;

    const user = db.getUser(uid);
    if (user && Number(betAmount) > 0) {
      const betCheck = db.isBettingAllowedForUser(user);
      if (!betCheck.allowed) {
        return res.status(403).json({
          error: betCheck.message,
          requiresDeposit: true,
          minDepositRequired: betCheck.minDepositRequired || 100,
          currentDeposit: betCheck.currentDeposit || 0,
        });
      }
    }

    const controls = db.allGameControls?.mines || { mode: 'auto_managed', forcedTrapStep: 2, autoTrapHighBetThreshold: 100, targetWinRate: 0.50 };
    
    // Determine mine placement based on admin rules
    const mineIndices = new Set<number>();
    const totalTiles = 25;

    if (controls.mode === 'custom_tiles' && Array.isArray(controls.forcedMineCoordinates) && controls.forcedMineCoordinates.length > 0) {
      controls.forcedMineCoordinates.forEach((c: number) => {
        if (c >= 0 && c < 25 && mineIndices.size < numMines) mineIndices.add(c);
      });
    }

    // Auto Managed: Client wins & loses dynamically with natural excitement
    const isAutoManaged = controls.mode === 'auto_managed' || !controls.mode;
    const shouldPlayerWin = isAutoManaged ? (Math.random() < Number(controls.targetWinRate ?? 0.50)) : false;

    // Fill remaining
    while (mineIndices.size < numMines) {
      mineIndices.add(Math.floor(Math.random() * totalTiles));
    }

    return res.json({
      success: true,
      minesList: Array.from(mineIndices),
      adminControls: {
        mode: controls.mode,
        forcedTrapStep: controls.forcedTrapStep,
        shouldTrap: isAutoManaged
          ? (!shouldPlayerWin && Math.random() < 0.6)
          : ((betAmount >= (controls.autoTrapHighBetThreshold || 100)) || controls.mode === 'house_best'),
      }
    });
  });

  app.post('/api/game/roulette/decide', (req, res) => {
    const { bets = {}, pool = 0 } = req.body;
    const controls = db.allGameControls?.roulette || { mode: 'auto_managed', targetWinRate: 0.48 };

    let winningNumber: number = 0;
    const redNums = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackNums = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    if (controls.mode === 'force_number' && controls.forcedNextNumber !== null && controls.forcedNextNumber !== undefined) {
      winningNumber = Number(controls.forcedNextNumber);
    } else if (controls.mode === 'force_color' && controls.forcedNextColor) {
      if (controls.forcedNextColor === 'red') winningNumber = redNums[Math.floor(Math.random() * redNums.length)];
      else if (controls.forcedNextColor === 'black') winningNumber = blackNums[Math.floor(Math.random() * blackNums.length)];
      else winningNumber = 0;
    } else if (controls.mode === 'auto_managed' || !controls.mode) {
      // Dynamic balance: client wins & loses naturally
      const betEntries = Object.entries(bets as Record<string, number>).filter(([_, amt]) => amt && amt > 0);
      const playerWinningNums: number[] = [];

      for (let num = 0; num <= 36; num++) {
        let wouldWin = false;
        for (const [key, amt] of betEntries) {
          if (key === `num_${num}`) wouldWin = true;
          else if (key === 'red' && redNums.includes(num)) wouldWin = true;
          else if (key === 'black' && blackNums.includes(num)) wouldWin = true;
          else if (key === 'even' && num > 0 && num % 2 === 0) wouldWin = true;
          else if (key === 'odd' && num > 0 && num % 2 === 1) wouldWin = true;
          else if (key === 'low' && num >= 1 && num <= 18) wouldWin = true;
          else if (key === 'high' && num >= 19 && num <= 36) wouldWin = true;
        }
        if (wouldWin) playerWinningNums.push(num);
      }

      const shouldWin = betEntries.length > 0 && playerWinningNums.length > 0 && Math.random() < Number(controls.targetWinRate ?? 0.48);
      if (shouldWin) {
        winningNumber = playerWinningNums[Math.floor(Math.random() * playerWinningNums.length)];
      } else {
        const losingNums = Array.from({ length: 37 }, (_, i) => i).filter(n => !playerWinningNums.includes(n));
        if (losingNums.length > 0) {
          winningNumber = losingNums[Math.floor(Math.random() * losingNums.length)];
        } else {
          winningNumber = Math.floor(Math.random() * 37);
        }
      }
    } else if (controls.mode === 'house_best') {
      // Calculate house payout for every number from 0 to 36, pick the lowest payout (maximum house profit)
      let minPayout = Infinity;
      let bestNum = 0;
      const allNums = Array.from({ length: 37 }, (_, i) => i);
      allNums.sort(() => Math.random() - 0.5);

      for (const num of allNums) {
        let totalPayoutForNum = 0;
        for (const [key, amt] of Object.entries(bets as Record<string, number>)) {
          if (!amt) continue;
          if (key === `num_${num}`) totalPayoutForNum += amt * 36;
          else if (key === 'red' && redNums.includes(num)) totalPayoutForNum += amt * 2;
          else if (key === 'black' && blackNums.includes(num)) totalPayoutForNum += amt * 2;
          else if (key === 'even' && num > 0 && num % 2 === 0) totalPayoutForNum += amt * 2;
          else if (key === 'odd' && num > 0 && num % 2 === 1) totalPayoutForNum += amt * 2;
          else if (key === 'low' && num >= 1 && num <= 18) totalPayoutForNum += amt * 2;
          else if (key === 'high' && num >= 19 && num <= 36) totalPayoutForNum += amt * 2;
        }
        if (totalPayoutForNum < minPayout) {
          minPayout = totalPayoutForNum;
          bestNum = num;
        }
      }
      winningNumber = bestNum;
    } else {
      // fair random
      winningNumber = Math.floor(Math.random() * 37);
    }

    return res.json({ success: true, winningNumber });
  });

  app.post('/api/game/aviator/decide', (req, res) => {
    const { totalBet = 0 } = req.body;
    const controls = db.allGameControls?.aviator || { mode: 'house_best' };

    let crashMultiplier: number = 1.85;

    if (controls.mode === 'force_multiplier' && controls.forcedCrashMultiplier) {
      crashMultiplier = Number(controls.forcedCrashMultiplier);
    } else if (controls.mode === 'house_best') {
      if (totalBet > (controls.autoCrashPoolThreshold || 500)) {
        // Instant crash or low crash between 1.00x and 1.25x
        crashMultiplier = Number((1.00 + Math.random() * 0.25).toFixed(2));
      } else {
        crashMultiplier = Number((1.10 + Math.random() * 1.50).toFixed(2));
      }
    } else {
      // fair
      const r = Math.random();
      if (r < 0.3) crashMultiplier = Number((1.01 + Math.random() * 0.4).toFixed(2));
      else if (r < 0.7) crashMultiplier = Number((1.4 + Math.random() * 1.5).toFixed(2));
      else crashMultiplier = Number((3.0 + Math.random() * 10).toFixed(2));
    }

    return res.json({ success: true, crashMultiplier });
  });

  // =========================================================================
  // CONTINUOUS 24/7 LIVE CASINO ENGINE ROUTES (Aviator, Roulette, Teen Patti, 7 Up Down)
  // Always running continuously on server; never waits for clients.
  // =========================================================================

  app.get('/api/live-games/all-states', (req, res) => {
    return res.json({
      success: true,
      ...liveCasinoEngine.getAllLiveStates(),
    });
  });

  // 1. AVIATOR LIVE ROUTES
  app.get('/api/live/aviator', (req, res) => {
    return res.json({
      success: true,
      ...liveCasinoEngine.getAviatorState(),
    });
  });

  app.post('/api/live/aviator/bet', async (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { panelNum = 1, amount = 10, isAuto = false, autoCashOutAt = 2.0 } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });
    const numAmount = parseFloat(Number(amount).toFixed(2));
    if (isNaN(numAmount) || numAmount < 10) {
      return res.status(400).json({ error: 'Minimum bet amount is ₹10' });
    }

    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mandatory rule: User must have deposited at least ₹100 before betting
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return res.status(403).json({
        error: betCheck.message,
        requiresDeposit: true,
        minDepositRequired: betCheck.minDepositRequired || 100,
        currentDeposit: betCheck.currentDeposit || 0,
      });
    }

    if ((user.walletBalance || 0) < numAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    // Deduct balance
    const prevBal = user.walletBalance;
    user.walletBalance = parseFloat((user.walletBalance - numAmount).toFixed(2));
    user.totalBet = parseFloat(((user.totalBet || 0) + numAmount).toFixed(2));
    db.syncUserTurnover(user);

    const isWaiting = liveCasinoEngine.aviator.phase === 'waiting';
    const betId = `BET-AV-${Date.now()}-${panelNum}`;
    const betPayload = {
      id: betId,
      userId: uid,
      panelNum: (panelNum === 2 ? 2 : 1) as 1 | 2,
      amount: numAmount,
      isAuto: Boolean(isAuto),
      autoCashOutAt: Number(autoCashOutAt) || 2.0,
      cashedOut: false,
      cashOutMultiplier: 0,
      cashOutAmount: 0,
    };

    const targetRoundId = isWaiting ? liveCasinoEngine.aviator.roundId : liveCasinoEngine.aviator.roundId + 1;

    if (isWaiting) {
      liveCasinoEngine.aviator.activeBets.set(`${uid}-${panelNum}`, betPayload);
    } else {
      liveCasinoEngine.aviator.queuedBets.set(`${uid}-${panelNum}`, betPayload);
    }

    const txRecord = {
      id: `TX-AV-BET-${Date.now()}-${panelNum}`,
      uid: user.uid,
      type: 'bet' as const,
      amount: -numAmount,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `Aviator Bet #${targetRoundId}`,
      note: `Aviator Bet placed on round #${targetRoundId}`,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord as any).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({
      success: true,
      message: isWaiting ? 'Bet placed for current round' : 'Bet queued for next round',
      isQueued: !isWaiting,
      targetRoundId,
      newBalance: user.walletBalance,
    });
  });

  app.post('/api/live/aviator/cashout', (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { panelNum = 1 } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    const result = liveCasinoEngine.cashoutAviatorBet(uid, panelNum === 2 ? 2 : 1);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    const user = db.getUser(uid);
    return res.json({
      success: true,
      winAmount: result.winAmount,
      multiplier: result.multiplier,
      newBalance: user ? user.walletBalance : 0,
    });
  });

  app.post('/api/live/aviator/cancel', async (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { panelNum = 1 } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });
    const key = `${uid}-${panelNum}`;

    let removedBet: any = null;
    if (liveCasinoEngine.aviator.phase === 'waiting' && liveCasinoEngine.aviator.activeBets.has(key)) {
      removedBet = liveCasinoEngine.aviator.activeBets.get(key);
      liveCasinoEngine.aviator.activeBets.delete(key);
    } else if (liveCasinoEngine.aviator.queuedBets.has(key)) {
      removedBet = liveCasinoEngine.aviator.queuedBets.get(key);
      liveCasinoEngine.aviator.queuedBets.delete(key);
    }

    if (!removedBet) {
      return res.status(400).json({ error: 'No cancellable bet found in waiting or queue' });
    }

    const user = db.users.get(uid);
    if (user) {
      const prevBal = user.walletBalance;
      user.walletBalance = parseFloat((user.walletBalance + removedBet.amount).toFixed(2));
      const txRecord = {
        id: `TX-AV-REFUND-${Date.now()}-${panelNum}`,
        uid: user.uid,
        type: 'refund' as const,
        amount: removedBet.amount,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Aviator Bet Cancelled`,
        note: `Aviator Bet refunded`,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      };
      db.transactions.unshift(txRecord as any);
      saveTransactionPermanently(txRecord as any).catch(() => {});
      saveUserPermanently(user).catch(() => {});
      db.saveToDisk();
    }

    return res.json({
      success: true,
      message: 'Bet cancelled and refunded',
      newBalance: user ? user.walletBalance : 0,
    });
  });

  // 2. ROULETTE LIVE ROUTES
  app.get('/api/live/roulette', (req, res) => {
    return res.json({
      success: true,
      ...liveCasinoEngine.getRouletteState(),
    });
  });

  app.post('/api/live/roulette/bet', async (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { bets = {} } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    if (liveCasinoEngine.roulette.phase !== 'betting') {
      return res.status(400).json({ error: 'Betting is closed for this round' });
    }

    let totalAmount = 0;
    for (const amt of Object.values(bets as Record<string, number>)) {
      if (typeof amt === 'number' && amt > 0) totalAmount += amt;
    }
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amounts' });
    }

    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mandatory rule: User must have deposited at least ₹100 before betting
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return res.status(403).json({
        error: betCheck.message,
        requiresDeposit: true,
        minDepositRequired: betCheck.minDepositRequired || 100,
        currentDeposit: betCheck.currentDeposit || 0,
      });
    }

    if ((user.walletBalance || 0) < totalAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = parseFloat((user.walletBalance - totalAmount).toFixed(2));
    user.totalBet = parseFloat(((user.totalBet || 0) + totalAmount).toFixed(2));
    db.syncUserTurnover(user);

    const existingBet = liveCasinoEngine.roulette.activeBets.get(uid);
    if (existingBet) {
      for (const [k, v] of Object.entries(bets as Record<string, number>)) {
        existingBet.bets[k] = (existingBet.bets[k] || 0) + v;
      }
      existingBet.totalAmount += totalAmount;
    } else {
      liveCasinoEngine.roulette.activeBets.set(uid, {
        id: `ROUL-${Date.now()}`,
        userId: uid,
        bets: { ...bets },
        totalAmount,
      });
    }

    const txRecord = {
      id: `TX-ROUL-BET-${Date.now()}`,
      uid: user.uid,
      type: 'bet' as const,
      amount: -totalAmount,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `Roulette #${liveCasinoEngine.roulette.roundId}`,
      note: `Roulette bet placed on round #${liveCasinoEngine.roulette.roundId}`,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord as any).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({
      success: true,
      message: 'Roulette bet accepted',
      roundId: liveCasinoEngine.roulette.roundId,
      newBalance: user.walletBalance,
    });
  });

  app.post('/api/live/roulette/spin-now', (req, res) => {
    const result = liveCasinoEngine.triggerRouletteFastSpin();
    return res.json(result);
  });

  // 3. TEEN PATTI LIVE ROUTES
  app.get('/api/live/teen-patti', (req, res) => {
    return res.json({
      success: true,
      ...liveCasinoEngine.getTeenPattiState(),
    });
  });

  app.post('/api/live/teen-patti/bet', async (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { selection, stake = 10, odds = 1.98 } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    if (liveCasinoEngine.teenPatti.phase !== 'betting') {
      return res.status(400).json({ error: 'Betting is closed for this round' });
    }

    const numStake = parseFloat(Number(stake).toFixed(2));
    if (isNaN(numStake) || numStake < 10) {
      return res.status(400).json({ error: 'Minimum bet amount is ₹10' });
    }

    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mandatory rule: User must have deposited at least ₹100 before betting
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return res.status(403).json({
        error: betCheck.message,
        requiresDeposit: true,
        minDepositRequired: betCheck.minDepositRequired || 100,
        currentDeposit: betCheck.currentDeposit || 0,
      });
    }

    if ((user.walletBalance || 0) < numStake) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = parseFloat((user.walletBalance - numStake).toFixed(2));
    user.totalBet = parseFloat(((user.totalBet || 0) + numStake).toFixed(2));
    db.syncUserTurnover(user);

    const betId = `TP-${Date.now()}`;
    liveCasinoEngine.teenPatti.activeBets.set(`${uid}-${selection}-${betId}`, {
      id: betId,
      userId: uid,
      selection: selection as any,
      stake: numStake,
      odds: Number(odds) || 1.98,
    });

    const txRecord = {
      id: `TX-TP-BET-${Date.now()}`,
      uid: user.uid,
      type: 'bet' as const,
      amount: -numStake,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `Teen Patti #${liveCasinoEngine.teenPatti.roundId} (${selection})`,
      note: `Teen Patti bet placed on ${selection}`,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord as any).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({
      success: true,
      message: 'Teen Patti bet accepted',
      roundId: liveCasinoEngine.teenPatti.roundId,
      newBalance: user.walletBalance,
    });
  });

  // 4. SEVEN UP DOWN LIVE ROUTES
  app.get('/api/live/seven-up-down', (req, res) => {
    return res.json({
      success: true,
      ...liveCasinoEngine.getSevenUpDownState(),
    });
  });

  app.post('/api/live/seven-up-down/bet', async (req, res) => {
    const uid = req.body.uid || (req.headers['x-user-uid'] as string);
    const { bets = {} } = req.body;
    if (!uid) return res.status(400).json({ error: 'User ID is required' });

    if (liveCasinoEngine.sevenUpDown.phase !== 'betting') {
      return res.status(400).json({ error: 'Betting is closed for this round' });
    }

    let totalAmount = 0;
    for (const amt of Object.values(bets as Record<string, number>)) {
      if (typeof amt === 'number' && amt > 0) totalAmount += amt;
    }
    if (totalAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }

    const user = await findAndResolveUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Mandatory rule: User must have deposited at least ₹100 before betting
    const betCheck = db.isBettingAllowedForUser(user);
    if (!betCheck.allowed) {
      return res.status(403).json({
        error: betCheck.message,
        requiresDeposit: true,
        minDepositRequired: betCheck.minDepositRequired || 100,
        currentDeposit: betCheck.currentDeposit || 0,
      });
    }

    if ((user.walletBalance || 0) < totalAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const prevBal = user.walletBalance;
    user.walletBalance = parseFloat((user.walletBalance - totalAmount).toFixed(2));
    user.totalBet = parseFloat(((user.totalBet || 0) + totalAmount).toFixed(2));
    db.syncUserTurnover(user);

    const existing = liveCasinoEngine.sevenUpDown.activeBets.get(uid);
    if (existing) {
      for (const [z, amt] of Object.entries(bets as Record<'down' | 'seven' | 'up', number>)) {
        existing.bets[z] = (existing.bets[z] || 0) + amt;
      }
      existing.totalAmount += totalAmount;
    } else {
      liveCasinoEngine.sevenUpDown.activeBets.set(uid, {
        id: `7UP-${Date.now()}`,
        userId: uid,
        bets: { down: bets.down || 0, seven: bets.seven || 0, up: bets.up || 0 },
        totalAmount,
      });
    }

    const txRecord = {
      id: `TX-7UP-BET-${Date.now()}`,
      uid: user.uid,
      type: 'bet' as const,
      amount: -totalAmount,
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: `7 Up Down #${liveCasinoEngine.sevenUpDown.roundId}`,
      note: `7 Up Down bet placed on round #${liveCasinoEngine.sevenUpDown.roundId}`,
      status: 'completed' as const,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(txRecord as any);
    saveTransactionPermanently(txRecord as any).catch(() => {});
    saveUserPermanently(user).catch(() => {});
    db.saveToDisk();

    return res.json({
      success: true,
      message: '7 Up Down bet accepted',
      roundId: liveCasinoEngine.sevenUpDown.roundId,
      newBalance: user.walletBalance,
    });
  });

  // Support System Admin
  app.get('/api/admin/support/tickets', (req, res) => {
    return res.json({ tickets: db.supportTickets || [] });
  });

  app.post('/api/admin/support/reply', (req, res) => {
    const { ticketId, message, mediaUrl, mediaType, fileName, adminUsername } = req.body;
    if (!ticketId || (!message && !mediaUrl)) return res.status(400).json({ error: 'Ticket ID and message/media required' });

    const ticket = (db.supportTickets || []).find(t => t.id === ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const nowStr = new Date().toISOString();
    const mediaLabel = fileName ? `📎 ${fileName}` : (mediaType === 'video' ? '📹 Video attachment' : mediaType === 'file' ? '📄 File/Document attachment' : '📷 Photo attachment');

    const replyMsg = {
      id: `m-adm-${Date.now()}`,
      ticketId,
      uid: ticket.uid,
      username: adminUsername || 'SuperAdmin',
      sender: 'admin' as const,
      message: (message || '').trim(),
      mediaUrl: mediaUrl || undefined,
      mediaType: mediaType || undefined,
      fileName: fileName || undefined,
      timestamp: nowStr,
    };

    ticket.messages.push(replyMsg);
    ticket.lastMessage = (message || '').trim() || mediaLabel;
    ticket.lastMessageTime = nowStr;
    ticket.unreadCountByAdmin = 0;
    ticket.unreadCountByUser = (ticket.unreadCountByUser || 0) + 1;

    db.saveToDisk();

    return res.json({ success: true, ticket });
  });

  app.post('/api/admin/support/done', (req, res) => {
    const { ticketId, adminUsername } = req.body;
    const ticket = (db.supportTickets || []).find(t => t.id === ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = 'resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = adminUsername || 'SuperAdmin';
    ticket.unreadCountByAdmin = 0;
    ticket.messages.push({
      id: `m-sys-${Date.now()}`,
      ticketId: ticket.id,
      uid: ticket.uid,
      username: 'System',
      sender: 'system',
      message: `✅ Support desk has marked this chat as Done (Resolved) by ${adminUsername || 'Admin'}. Conversation moved to Chat History.`,
      timestamp: new Date().toISOString(),
    });
    ticket.lastMessage = 'Chat marked as Done by Admin';
    ticket.lastMessageTime = new Date().toISOString();
    db.saveToDisk();
    return res.json({ success: true, ticket });
  });

  app.post('/api/admin/support/close', (req, res) => {
    const { ticketId, adminUsername } = req.body;
    const ticket = (db.supportTickets || []).find(t => t.id === ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.status = ticket.status === 'resolved' || ticket.status === 'closed' ? 'open' : 'resolved';
    ticket.resolvedAt = new Date().toISOString();
    ticket.resolvedBy = adminUsername || 'SuperAdmin';
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      ticket.unreadCountByAdmin = 0;
      ticket.messages.push({
        id: `m-sys-${Date.now()}`,
        ticketId: ticket.id,
        uid: ticket.uid,
        username: 'System',
        sender: 'system',
        message: `✅ Ticket marked as Done (Resolved) by ${adminUsername || 'Admin'}. Moved to Chat History.`,
        timestamp: new Date().toISOString(),
      });
    }
    db.saveToDisk();
    return res.json({ success: true, ticket });
  });

  // User Management
  app.get('/api/admin/users', (req, res) => {
    const { search, status } = req.query;
    let list = db.getAllUniqueUsers();

    list = list.map(u => {
      const uVip = recalculateUserVip(u);
      const completedTurnover = Number(uVip.completedTurnover !== undefined ? uVip.completedTurnover : 0);
      const requiredTurnover = Number(uVip.requiredTurnover || 0);
      const remainingTurnover = uVip.remainingTurnover !== undefined 
        ? Number(uVip.remainingTurnover) 
        : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2)));
      const rolloverProgress = requiredTurnover > 0 
        ? Math.min(100, parseFloat(((completedTurnover / requiredTurnover) * 100).toFixed(1))) 
        : 100;
      const isRolloverCompleted = remainingTurnover <= 0;

      return {
        ...uVip,
        completedTurnover,
        requiredTurnover,
        remainingTurnover,
        rolloverProgress,
        isRolloverCompleted,
      };
    });

    if (search && String(search).trim() && String(search).trim().toLowerCase() !== 'all') {
      const q = String(search).trim().toLowerCase();
      list = list.filter(u => 
        (u.uid && u.uid.toLowerCase().includes(q)) || 
        (u.username && u.username.toLowerCase().includes(q)) || 
        (u.phone && u.phone.includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'all') {
      list = list.filter(u => u.status === status);
    }

    return res.json({ users: list });
  });

  // Admin VIP Level & EXP Manual Adjustment
  app.post('/api/admin/users/:uid/vip-adjust', (req, res) => {
    const { uid } = req.params;
    const { vipLevel, vipExp, rewardBonus, adminUsername, reason } = req.body;
    let user = db.getUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const prevLevel = user.vipLevel || 0;
    if (vipLevel !== undefined && !isNaN(Number(vipLevel))) {
      user.vipLevel = Number(vipLevel);
    }
    if (vipExp !== undefined && !isNaN(Number(vipExp))) {
      user.vipExp = Number(vipExp);
    }

    if (rewardBonus && Number(rewardBonus) > 0) {
      const bonusNum = Number(rewardBonus);
      const prevBal = user.walletBalance || 0;
      user.walletBalance = Number((prevBal + bonusNum).toFixed(2));
      db.transactions.unshift({
        id: `TX-VIP-BONUS-${Date.now()}`,
        uid: user.uid,
        type: 'bonus',
        amount: bonusNum,
        status: 'completed',
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        reference: `Admin VIP Level Reward by ${adminUsername || 'SuperAdmin'}`,
        createdBy: adminUsername || 'SuperAdmin',
        note: reason || `Admin VIP upgrade to Level ${user.vipLevel} reward ₹${bonusNum}`,
        createdAt: new Date().toISOString(),
      });
    }

    db.users.set(user.uid, user);
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'VIP Level Adjustment',
      `Admin adjusted VIP level for UID ${user.uid} (${user.username}) to VIP ${user.vipLevel} (${user.vipExp} EXP). Bonus: ₹${rewardBonus || 0}`,
      user.uid,
      `VIP ${prevLevel}`,
      `VIP ${user.vipLevel}`,
      req
    );

    return res.json({ success: true, user, message: `VIP Level updated to VIP ${user.vipLevel} for ${user.username}` });
  });

  // Admin Manual User Creation
  app.post('/api/admin/users/create', (req, res) => {
    const { username, phone, email, password, initialBalance, adminUsername } = req.body;
    if (!username || !phone) {
      return res.status(400).json({ error: 'Username and phone number are required' });
    }

    const cleanPhone = String(phone).trim();
    // Check if phone or username already exists
    const existing = Array.from(db.users.values()).find(
      u => u.phone === cleanPhone || u.username.toLowerCase() === username.toLowerCase()
    );
    if (existing) {
      return res.status(400).json({ error: 'A user with this phone or username already exists' });
    }

    const uid = `${Math.floor(100000 + Math.random() * 900000)}`;
    const initBal = Number(initialBalance) || 0;
    const pwd = password && String(password).trim() ? String(password).trim() : 'Password@123';

    const newUser: User = {
      id: `u-${uid}`,
      uid,
      username: username.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : undefined,
      password: pwd,
      walletBalance: initBal,
      totalDeposit: initBal,
      totalWithdrawal: 0,
      totalBet: 0,
      totalWin: 0,
      totalLoss: 0,
      vipLevel: 1,
      vipExp: 0,
      referralCode: generateNumericReferralCode(Array.from(db.users.values())),
      status: 'active',
      registrationDate: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    db.users.set(uid, newUser);

    let initTx: any = null;
    if (initBal > 0) {
      initTx = {
        id: `TX-INIT-${Date.now()}`,
        uid,
        type: 'deposit',
        amount: initBal,
        previousBalance: 0,
        newBalance: initBal,
        reference: `Admin Created Initial Credit`,
        createdBy: adminUsername || 'SuperAdmin',
        note: `Initial balance credited by Admin (${adminUsername || 'SuperAdmin'})`,
        createdAt: new Date().toISOString(),
      };
      db.transactions.unshift(initTx);
    }

    db.saveToDisk();

    // Persist permanently to Cloud Firestore
    saveUserPermanently(newUser).catch(() => {});
    if (initTx) {
      saveTransactionPermanently(initTx).catch(() => {});
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Create User Account',
      `Admin manually created user account UID ${uid} (${username}, Phone: ${cleanPhone}, Init Bal: ₹${initBal})`,
      uid,
      undefined,
      `Password: ${pwd}`,
      req
    );

    return res.json({ success: true, user: newUser, message: `User created successfully with UID ${uid}` });
  });

  // Admin Delete User (The ONLY way an account is ever deleted)
  app.post('/api/admin/users/:uid/delete', async (req, res) => {
    const { uid } = req.params;
    const { adminUsername } = req.body;
    let user = db.users.get(uid);
    if (!user) {
      user = await db.getUserAsync(uid);
    }
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.users.delete(uid);
    if (user.id) db.users.delete(user.id);
    db.saveToDisk();

    // Permanently remove from Cloud Firestore only when Admin deletes
    await deleteUserPermanently(uid);

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Delete User Account',
      `Admin deleted user UID ${uid} (${user.username}, Phone: ${user.phone})`,
      uid,
      undefined,
      undefined,
      req
    );

    return res.json({ success: true, message: `User UID ${uid} deleted successfully` });
  });

  app.get('/api/admin/users/:uid', (req, res) => {
    const { uid } = req.params;
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const completedTurnover = Number(user.completedTurnover ?? 0);
    const requiredTurnover = Number(user.requiredTurnover || 0);
    const remainingTurnover = user.remainingTurnover !== undefined 
      ? Number(user.remainingTurnover) 
      : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2)));
    const rolloverProgress = requiredTurnover > 0 
      ? Math.min(100, parseFloat(((completedTurnover / requiredTurnover) * 100).toFixed(1))) 
      : 100;

    user.completedTurnover = completedTurnover;
    user.requiredTurnover = requiredTurnover;
    user.remainingTurnover = remainingTurnover;
    user.currentTurnover = completedTurnover;

    const userDeposits = db.deposits.filter(d => d.uid === uid);
    const userWithdrawals = db.withdrawals.filter(w => w.uid === uid);
    const userBets = db.bets.filter(b => b.uid === uid);
    const userTxs = db.transactions.filter(t => t.uid === uid);

    return res.json({
      user,
      rollover: {
        requiredTurnover,
        completedTurnover,
        remainingTurnover,
        rolloverProgress,
        isCompleted: remainingTurnover <= 0
      },
      deposits: userDeposits,
      withdrawals: userWithdrawals,
      bets: userBets,
      transactions: userTxs,
      loginHistory: [
        { ip: user.lastLoginIp || '192.168.1.45', device: 'Mobile Chrome (Android)', time: user.lastLogin },
        { ip: '192.168.1.45', device: 'Mobile Chrome (Android)', time: '2026-08-21T18:22:10.000Z' },
        { ip: '114.143.12.8', device: 'Desktop Chrome (Windows)', time: user.registrationDate },
      ],
    });
  });

  app.post('/api/admin/users/:uid/status', async (req, res) => {
    const { uid } = req.params;
    const { status, reason, adminUsername } = req.body;
    
    // Support finding by raw uid, u-prefix, or numeric string
    const cleanUid = String(uid).replace(/^u-/, '');
    const user = db.users.get(uid) || db.users.get(cleanUid) || db.users.get(`u-${cleanUid}`) || db.getUser(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const prevStatus = user.status;
    const targetStatus = status === 'blocked' ? 'blocked' : 'active';
    user.status = targetStatus;

    db.saveToDisk();

    // Persist permanently to Cloud Firestore
    try {
      await saveUserPermanently(user);
    } catch (fsErr) {
      console.warn('Error syncing status to Firestore:', fsErr);
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      `${targetStatus === 'blocked' ? 'Block' : 'Unblock'} User`,
      `User UID ${user.uid} (${user.username}) status changed to ${targetStatus}: ${reason || 'Admin action'}`,
      user.uid,
      `Status: ${prevStatus}`,
      `Status: ${targetStatus}`,
      req
    );

    return res.json({ 
      success: true, 
      user, 
      message: `User ${user.username} is now ${targetStatus}` 
    });
  });

  app.post('/api/admin/users/:uid/balance-adjust', (req, res) => {
    const { uid } = req.params;
    const { amount, actionType, reason, adminUsername } = req.body;
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });
    if (!reason) return res.status(400).json({ error: 'Audit reason is mandatory for manual balance adjustments' });

    const prevBalance = user.walletBalance;
    const numAmount = Number(amount);

    if (actionType === 'credit') {
      user.walletBalance = Number((user.walletBalance + numAmount).toFixed(2));
      user.totalDeposit = Number(((user.totalDeposit || 0) + numAmount).toFixed(2));
      user.requiredTurnover = Number(((user.requiredTurnover || 0) + numAmount).toFixed(2));
      user.remainingTurnover = Number((Math.max(0, user.remainingTurnover || 0) + numAmount).toFixed(2));
      recalculateUserVip(user);

      // Also register as an approved deposit record for unified reporting
      const depId = `DEP-ADJ-${Date.now()}`;
      db.deposits.unshift({
        id: depId,
        uid: user.uid,
        username: user.username,
        amount: numAmount,
        utrReference: `ADMIN-ADJ-${Date.now()}`,
        paymentMethod: 'Admin Balance Credit',
        status: 'approved',
        adminNote: reason,
        processedBy: adminUsername || 'SuperAdmin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (actionType === 'debit') {
      if (user.walletBalance < numAmount) {
        return res.status(400).json({ error: 'User balance is less than debit amount' });
      }
      user.walletBalance -= numAmount;
    } else {
      return res.status(400).json({ error: 'Invalid actionType (credit/debit)' });
    }

    db.transactions.unshift({
      id: `TX-ADJ-${Date.now()}`,
      uid: user.uid,
      type: 'adjustment',
      amount: actionType === 'credit' ? numAmount : -numAmount,
      previousBalance: prevBalance,
      newBalance: user.walletBalance,
      reference: `Admin Adjustment by ${adminUsername || 'SuperAdmin'}`,
      createdBy: adminUsername || 'SuperAdmin',
      note: reason,
      createdAt: new Date().toISOString(),
    });

    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      `Manual Balance ${actionType.toUpperCase()}`,
      `Adjusted ₹${numAmount} on UID ${uid}. Reason: ${reason}`,
      uid,
      `₹${prevBalance.toFixed(2)}`,
      `₹${user.walletBalance.toFixed(2)}`,
      req
    );

    return res.json({ success: true, newBalance: user.walletBalance, user });
  });

  app.post('/api/admin/users/:uid/reset-password', (req, res) => {
    const { uid } = req.params;
    const { newPassword, adminUsername } = req.body;
    
    let user = db.getUser(uid);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    const passwordToSet = newPassword && String(newPassword).trim() ? String(newPassword).trim() : 'Password@123';
    
    if (passwordToSet.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long' });
    }

    user.password = passwordToSet;
    user.activeSessionId = null; // Invalidate any existing session so user logs in with new password
    
    db.users.set(user.uid, user);
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Password Reset',
      `Admin reset password for user UID ${user.uid} (${user.username}, Phone: ${user.phone}) to: "${passwordToSet}"`,
      user.uid,
      undefined,
      `New Password: ${passwordToSet}`,
      req
    );

    return res.json({ 
      success: true, 
      message: `Password reset successfully for UID ${user.uid}! User can now login with: ${passwordToSet}`,
      newPassword: passwordToSet,
      uid: user.uid,
      username: user.username,
      phone: user.phone
    });
  });

  // Admin delete user bank account
  app.post('/api/admin/users/:uid/bank-accounts/:bankId/delete', (req, res) => {
    const { uid, bankId } = req.params;
    const { adminUsername } = req.body;
    const user = db.users.get(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (Array.isArray(user.bankAccounts)) {
      const initialCount = user.bankAccounts.length;
      user.bankAccounts = user.bankAccounts.filter(b => b.id !== bankId);
      if (user.bankAccounts.length < initialCount) {
        db.saveToDisk();
        logAdminAction(
          adminUsername || 'SuperAdmin',
          'Delete User Bank Account',
          `Deleted bank beneficiary ID ${bankId} for user UID ${uid}`,
          uid,
          undefined,
          undefined,
          req
        );
        return res.json({ success: true, bankAccounts: user.bankAccounts });
      }
    }

    return res.status(404).json({ error: 'Bank account not found' });
  });

  // Deposit Management
  app.get('/api/admin/deposits', (req, res) => {
    const { status, search } = req.query;
    let list = [...db.deposits];
    if (status && status !== 'all') list = list.filter(d => d.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(d => d.uid.includes(q) || d.utrReference.toLowerCase().includes(q) || d.username.toLowerCase().includes(q));
    }
    return res.json({ deposits: list });
  });

  // Helper: credit 2-level referral deposit commission to referrer & subordinate team
  // Level 1: 5% on FIRST deposit, 2% on SUBSEQUENT deposits
  // Level 2: 1% on team subordinate deposits
  function creditReferralDepositCommission(user: User, depAmount: number, depositId: string) {
    if (!user || !user.referredBy || depAmount <= 0) return;
    if (!db.referralDepositCommissions) db.referralDepositCommissions = [];

    // Strictly ensure no duplicate commission for the same deposit
    const alreadyProcessed = db.referralDepositCommissions.some(r => r.depositId === depositId);
    if (alreadyProcessed) return;

    const resolveReferrer = (ref: string | undefined | null): User | undefined => {
      if (!ref) return undefined;
      const refIdOrCode = String(ref).trim();
      return db.getUser(refIdOrCode) ||
        Array.from(db.users.values()).find(u => 
          (u.referralCode && u.referralCode.trim().toLowerCase() === refIdOrCode.toLowerCase()) || 
          u.uid === refIdOrCode || 
          (u.referralCode && u.referralCode.replace(/\D/g, '') === refIdOrCode)
        );
    };

    const directReferrer = resolveReferrer(user.referredBy);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // 1. DIRECT REFERRAL (Level 1): strictly 5% commission on client deposits
    if (directReferrer && directReferrer.uid !== user.uid) {
      const l1CommPercent = 5;
      const l1CommAmount = Number(((depAmount * l1CommPercent) / 100).toFixed(2));

      if (l1CommAmount > 0) {
        db.referralDepositCommissions.unshift({
          id: `RDC-L1-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          referrerUid: directReferrer.uid,
          depositId: depositId,
          depositorUid: user.uid,
          depositorUsername: user.username || user.phone || `UID ${user.uid}`,
          depositAmount: depAmount,
          level: 1,
          isFirstDeposit: isFirst,
          commissionPercent: l1CommPercent,
          commissionAmount: l1CommAmount,
          date: dateStr,
          unlockTime: Date.now(), // Claimable
          status: 'claimable',
          createdAt: now.toISOString(),
        });

        directReferrer.referralEarnings = Number(((directReferrer.referralEarnings || 0) + l1CommAmount).toFixed(2));
        db.users.set(directReferrer.uid, directReferrer);
        saveUserPermanently(directReferrer).catch(() => {});
      }

      // 2. SECOND-LEVEL / TEAM SUBORDINATE (Level 2)
      // If direct referrer was referred by another user, that user is original referrer (Level 2)
      if (directReferrer.referredBy) {
        const teamReferrer = resolveReferrer(directReferrer.referredBy);
        if (teamReferrer && teamReferrer.uid !== directReferrer.uid && teamReferrer.uid !== user.uid) {
          const l2CommPercent = 1; // 1% commission on second-level deposits
          const l2CommAmount = Number(((depAmount * l2CommPercent) / 100).toFixed(2));

          if (l2CommAmount > 0) {
            db.referralDepositCommissions.unshift({
              id: `RDC-L2-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              referrerUid: teamReferrer.uid,
              depositId: depositId,
              depositorUid: user.uid,
              depositorUsername: user.username || user.phone || `UID ${user.uid}`,
              directReferrerUid: directReferrer.uid,
              depositAmount: depAmount,
              level: 2,
              commissionPercent: l2CommPercent,
              commissionAmount: l2CommAmount,
              date: dateStr,
              unlockTime: Date.now(), // Claimable
              status: 'claimable',
              createdAt: now.toISOString(),
            });

            teamReferrer.referralEarnings = Number(((teamReferrer.referralEarnings || 0) + l2CommAmount).toFixed(2));
            db.users.set(teamReferrer.uid, teamReferrer);
            saveUserPermanently(teamReferrer).catch(() => {});
          }
        }
      }
    }
  }

  app.post('/api/admin/deposits/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { adminNote, adminUsername, accountDetails, platform } = req.body;
    const deposit = db.deposits.find(d => d.id === id);
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

    deposit.status = 'approved';
    deposit.adminNote = adminNote || 'Approved by Admin';
    deposit.processedBy = adminUsername || 'SuperAdmin';
    deposit.updatedAt = new Date().toISOString();

    let bonusAmount = 0;
    let user = db.getUser(deposit.uid);
    let targetTx: any = null;
    if (user) {
      const prevBal = Number(user.walletBalance || 0);
      const depAmount = Number(deposit.amount || 0);

      // Automatic 5% bonus on every successful deposit
      bonusAmount = Number(((depAmount * 5) / 100).toFixed(2));

      const totalCredited = Number((depAmount + bonusAmount).toFixed(2));
      user.walletBalance = Number((prevBal + totalCredited).toFixed(2));
      user.totalDeposit = Number(((user.totalDeposit || 0) + depAmount).toFixed(2));

      // 1X Rolling Requirement: Deposit + 5% Bonus
      // Incomplete rolling carries forward to next deposit, does NOT reset
      const rollingToAdd = totalCredited;
      user.requiredRolling = Number(((user.requiredRolling || 0) + rollingToAdd).toFixed(2));
      user.remainingRolling = Number(((user.remainingRolling || 0) + rollingToAdd).toFixed(2));
      user.requiredTurnover = user.requiredRolling;
      user.remainingTurnover = user.remainingRolling;

      // Automatically recalculate VIP Level and EXP progression based on new total deposit
      recalculateUserVip(user);

      // Strictly set single user instance keyed by uid
      db.users.set(user.uid, user);

      // Referral Deposit Commission: Level 1 (5% first / 2% subsequent) & Level 2 (1%)
      creditReferralDepositCommission(user, depAmount, deposit.id);

      // Update existing pending transaction if found, otherwise add
      const existingTx = db.transactions.find(t => t.reference === deposit.id || t.id === `TX-${deposit.id}`);
      const noteStr = bonusAmount > 0 
        ? `Approved deposit ₹${depAmount} + 5% Bonus ₹${bonusAmount} via ${deposit.paymentMethod} (UTR: ${deposit.utrReference})`
        : `Approved deposit via ${deposit.paymentMethod} (UTR: ${deposit.utrReference})`;

      if (existingTx) {
        existingTx.status = 'completed';
        existingTx.amount = totalCredited;
        existingTx.previousBalance = prevBal;
        existingTx.newBalance = user.walletBalance;
        existingTx.adminNote = deposit.adminNote;
        existingTx.note = noteStr;
        existingTx.createdBy = adminUsername || 'SuperAdmin';
        targetTx = existingTx;
      } else {
        const newTx = {
          id: `TX-DEP-${Date.now()}`,
          uid: user.uid,
          type: 'deposit',
          amount: totalCredited,
          status: 'completed',
          previousBalance: prevBal,
          newBalance: user.walletBalance,
          reference: deposit.id,
          utrReference: deposit.utrReference,
          paymentMethod: deposit.paymentMethod,
          createdBy: adminUsername || 'SuperAdmin',
          adminNote: deposit.adminNote,
          note: noteStr,
          createdAt: new Date().toISOString(),
        };
        db.transactions.unshift(newTx as any);
        targetTx = newTx;
      }
      await saveUserPermanently(user).catch(() => {});
      if (targetTx) await saveTransactionPermanently(targetTx).catch(() => {});
    }

    await saveDepositPermanently(deposit).catch(() => {});

    // Automatically record into Google Sheet Deposit Ledger (Approved only)
    try {
      const activeBank = accountDetails || deposit.receivingBankName || deposit.bankName || db.adminUpiDetails?.bankName || db.adminUpiDetails?.payeeName || (db.adminBankAccounts && db.adminBankAccounts[0]) || 'SARKAR TRANSPORT';
      db.addGoogleSheetDeposit(
        deposit,
        activeBank,
        platform || 'AROWCLUB',
        bonusAmount
      );
    } catch (sheetErr) {
      console.error('Failed to append to Google Sheet Deposit Ledger:', sheetErr);
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Approve Deposit',
      `Approved deposit ${id} for ₹${deposit.amount} on UID ${deposit.uid}`,
      deposit.uid,
      'Pending',
      'Approved',
      req
    );

    db.saveToDisk();

    return res.json({ success: true, deposit });
  });

  app.post('/api/admin/deposits/:id/reject', (req, res) => {
    const { id } = req.params;
    const { adminNote, adminUsername } = req.body;
    const deposit = db.deposits.find(d => d.id === id);
    if (!deposit) return res.status(404).json({ error: 'Deposit not found' });
    if (deposit.status !== 'pending') return res.status(400).json({ error: 'Deposit is not pending' });

    deposit.status = 'rejected';
    deposit.adminNote = adminNote || 'Rejected by Admin (Invalid UTR / Unreceived)';
    deposit.processedBy = adminUsername || 'SuperAdmin';
    deposit.updatedAt = new Date().toISOString();

    const existingTx = db.transactions.find(t => t.reference === deposit.id || t.id === `TX-${deposit.id}`);
    if (existingTx) {
      existingTx.status = 'rejected';
      existingTx.adminNote = deposit.adminNote;
      existingTx.note = deposit.adminNote;
      existingTx.createdBy = adminUsername || 'SuperAdmin';
    } else {
      db.transactions.unshift({
        id: `TX-DEP-REJ-${Date.now()}`,
        uid: deposit.uid,
        type: 'deposit',
        amount: deposit.amount,
        status: 'rejected',
        previousBalance: db.users.get(deposit.uid)?.walletBalance || 0,
        newBalance: db.users.get(deposit.uid)?.walletBalance || 0,
        reference: deposit.id,
        utrReference: deposit.utrReference,
        paymentMethod: deposit.paymentMethod,
        createdBy: adminUsername || 'SuperAdmin',
        adminNote: deposit.adminNote,
        note: deposit.adminNote,
        createdAt: new Date().toISOString(),
      });
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Reject Deposit',
      `Rejected deposit ${id} for ₹${deposit.amount}. Reason: ${deposit.adminNote}`,
      deposit.uid,
      'Pending',
      'Rejected',
      req
    );

    db.saveToDisk();

    return res.json({ success: true, deposit });
  });

  // Admin Manual Create Deposit for Client
  app.post('/api/admin/deposits/manual-create', (req, res) => {
    const { uid, amount, utrReference, paymentMethod, adminNote, adminUsername } = req.body;
    if (!uid) return res.status(400).json({ error: 'User UID is required' });
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });

    let user = db.getUser(uid);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    const prevBal = Number(user.walletBalance || 0);
    const depId = `DEP-MANUAL-${Date.now()}`;
    const utr = utrReference && String(utrReference).trim() ? String(utrReference).trim() : `ADMIN-DEP-${Date.now()}`;
    const method = paymentMethod || 'Admin Manual Recharge';
    const note = adminNote || `Direct Deposit by Admin ${adminUsername || 'SuperAdmin'}`;

    const bonusAmount = Number(((numAmount * 5) / 100).toFixed(2));
    const totalCredited = Number((numAmount + bonusAmount).toFixed(2));
    user.walletBalance = Number((prevBal + totalCredited).toFixed(2));
    user.totalDeposit = Number(((user.totalDeposit || 0) + numAmount).toFixed(2));
    
    // 1X Rolling Requirement: Deposit + 5% Bonus (Carries forward, does not reset)
    const rollingToAdd = totalCredited;
    user.requiredRolling = Number(((user.requiredRolling || 0) + rollingToAdd).toFixed(2));
    user.remainingRolling = Number(((user.remainingRolling || 0) + rollingToAdd).toFixed(2));
    user.requiredTurnover = user.requiredRolling;
    user.remainingTurnover = user.remainingRolling;

    // Automatically recalculate VIP Level and EXP progression based on new total deposit
    recalculateUserVip(user);

    db.users.set(user.uid, user);

    const depositRecord: any = {
      id: depId,
      uid: user.uid,
      username: user.username,
      amount: numAmount,
      utrReference: utr,
      paymentMethod: method,
      status: 'approved',
      adminNote: note,
      processedBy: adminUsername || 'SuperAdmin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.deposits.unshift(depositRecord);

    // Referral Deposit Commission: Level 1 (5% first / 2% subsequent) & Level 2 (1%)
    creditReferralDepositCommission(user, numAmount, depId);

    const noteStr = bonusAmount > 0 
      ? `Manual deposit ₹${numAmount} + 5% Bonus ₹${bonusAmount}: ${note} (UTR: ${utr})`
      : `Manual deposit: ${note} (UTR: ${utr})`;

    db.transactions.unshift({
      id: `TX-${depId}`,
      uid: user.uid,
      type: 'deposit',
      amount: totalCredited,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: depId,
      utrReference: utr,
      paymentMethod: method,
      createdBy: adminUsername || 'SuperAdmin',
      adminNote: note,
      note: noteStr,
      createdAt: new Date().toISOString(),
    });

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Manual Client Deposit',
      `Admin credited manual deposit of ₹${numAmount} for UID ${user.uid} (${user.username}). UTR: ${utr}`,
      user.uid,
      `₹${prevBal.toFixed(2)}`,
      `₹${user.walletBalance.toFixed(2)}`,
      req
    );

    db.saveToDisk();

    return res.json({
      success: true,
      message: `Successfully credited ₹${numAmount} deposit to ${user.username} (UID: ${user.uid})!`,
      deposit: depositRecord,
      newBalance: user.walletBalance
    });
  });

  // Admin Manual Create Withdrawal for Client
  app.post('/api/admin/withdrawals/manual-create', (req, res) => {
    const { uid, amount, payoutUtr, bankDetails, adminNote, adminUsername } = req.body;
    if (!uid) return res.status(400).json({ error: 'User UID is required' });
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });

    let user = db.getUser(uid);
    if (!user) return res.status(404).json({ error: 'User account not found' });

    const prevBal = Number(user.walletBalance || 0);
    if (prevBal < numAmount) {
      return res.status(400).json({ error: `User balance (₹${prevBal.toFixed(2)}) is less than withdrawal amount (₹${numAmount})` });
    }

    // Rollover requirement check (रोलओवर जांच)
    const completedTurnover = Number(user.completedTurnover ?? 0);
    const requiredTurnover = Number(user.requiredTurnover || 0);
    const remainingTurnover = user.remainingTurnover !== undefined 
      ? Number(user.remainingTurnover) 
      : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2)));

    if (remainingTurnover > 0) {
      return res.status(400).json({ 
        error: `Rollover Incomplete (रोलओवर अधूरा है)! User has ₹${remainingTurnover.toFixed(2)} pending rollover requirement (Played: ₹${completedTurnover.toFixed(2)} / Required: ₹${requiredTurnover.toFixed(2)}). Manual withdrawal cannot be processed until rollover is completed.` 
      });
    }

    const wthId = `WTH-MANUAL-${Date.now()}`;
    const utr = payoutUtr && String(payoutUtr).trim() ? String(payoutUtr).trim() : `PAYOUT-${Date.now()}`;
    const note = adminNote || `Direct Payout Processed by Admin ${adminUsername || 'SuperAdmin'}`;

    user.walletBalance = Number((prevBal - numAmount).toFixed(2));
    user.totalWithdrawal = Number(((user.totalWithdrawal || 0) + numAmount).toFixed(2));

    db.users.set(user.uid, user);

    const userBank = (user.bankAccounts && user.bankAccounts[0]) || {};
    const finalBank = bankDetails || userBank;

    const withdrawalRecord: any = {
      id: wthId,
      uid: user.uid,
      username: user.username,
      name: finalBank.accountHolderName || finalBank.accountHolder || user.username,
      amount: numAmount,
      bankName: finalBank.bankName || 'Bank Transfer',
      accountNumber: finalBank.accountNumber || '---',
      ifscCode: finalBank.ifscCode || finalBank.ifsc || '---',
      bankUpiDetails: finalBank,
      status: 'approved',
      adminNote: `${note} (Ref/UTR: ${utr})`,
      processedBy: adminUsername || 'SuperAdmin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requiredTurnover,
      completedTurnover,
      remainingTurnover: 0,
      rolloverProgress: 100,
      isRolloverCompleted: true,
    };
    db.withdrawals.unshift(withdrawalRecord);

    db.transactions.unshift({
      id: `TX-${wthId}`,
      uid: user.uid,
      type: 'withdrawal',
      amount: -numAmount,
      status: 'completed',
      previousBalance: prevBal,
      newBalance: user.walletBalance,
      reference: wthId,
      createdBy: adminUsername || 'SuperAdmin',
      note: `Manual withdrawal payout: ${note} (Payout Ref: ${utr})`,
      createdAt: new Date().toISOString(),
    });

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Manual Client Withdrawal',
      `Admin processed manual payout withdrawal of ₹${numAmount} for UID ${user.uid} (${user.username}). Ref: ${utr}`,
      user.uid,
      `₹${prevBal.toFixed(2)}`,
      `₹${user.walletBalance.toFixed(2)}`,
      req
    );

    db.saveToDisk();

    return res.json({
      success: true,
      message: `Successfully processed ₹${numAmount} withdrawal for ${user.username} (UID: ${user.uid})!`,
      withdrawal: withdrawalRecord,
      newBalance: user.walletBalance
    });
  });

  // Withdrawal Management
  app.get('/api/admin/withdrawals', (req, res) => {
    const { status, search } = req.query;
    let list = [...db.withdrawals].map(w => {
      const user = db.users.get(w.uid);
      const userBanks = user?.bankAccounts || [];
      const matchedBank = (w.accountNumber || w.bankUpiDetails?.accountNumber)
        ? userBanks.find(b => b.accountNumber === (w.accountNumber || w.bankUpiDetails?.accountNumber))
        : (userBanks[0] || null);

      const exactBankName = w.bankName || w.bankUpiDetails?.bankName || matchedBank?.bankName || '';
      const exactAccountNumber = w.accountNumber || w.bankUpiDetails?.accountNumber || matchedBank?.accountNumber || '';
      const exactIfsc = (w as any).ifscCode || (w as any).ifsc || w.bankUpiDetails?.ifsc || (w.bankUpiDetails as any)?.ifscCode || matchedBank?.ifsc || (matchedBank as any)?.ifscCode || '';
      const exactHolder = (w as any).accountHolderName || (w as any).accountHolder || w.bankUpiDetails?.accountHolder || matchedBank?.accountHolder || (matchedBank as any)?.holderName || w.name || user?.username || w.username || '';
      const exactUpi = w.bankUpiDetails?.upiId || matchedBank?.upiId || '';

      const completedTurnover = Number(user?.completedTurnover ?? 0);
      const requiredTurnover = Number(user?.requiredTurnover || 0);
      const remainingTurnover = user?.remainingTurnover !== undefined 
        ? Number(user.remainingTurnover) 
        : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2)));
      const rolloverProgress = requiredTurnover > 0 
        ? Math.min(100, parseFloat(((completedTurnover / requiredTurnover) * 100).toFixed(1))) 
        : 100;

      return {
        ...w,
        name: exactHolder || w.name || w.username,
        accountHolderName: exactHolder,
        accountHolder: exactHolder,
        bankName: exactBankName,
        accountNumber: exactAccountNumber,
        ifscCode: exactIfsc,
        ifsc: exactIfsc,
        requiredTurnover,
        completedTurnover,
        remainingTurnover,
        rolloverProgress,
        isRolloverCompleted: remainingTurnover <= 0,
        bankUpiDetails: {
          accountHolder: exactHolder,
          bankName: exactBankName,
          accountNumber: exactAccountNumber,
          ifsc: exactIfsc,
          upiId: exactUpi,
          ...(w.bankUpiDetails || {}),
        }
      };
    });

    if (status && status !== 'all') list = list.filter(w => w.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(w => 
        w.uid.toLowerCase().includes(q) || 
        w.username.toLowerCase().includes(q) || 
        w.id.toLowerCase().includes(q) ||
        (w.bankName && w.bankName.toLowerCase().includes(q)) ||
        (w.accountNumber && w.accountNumber.toLowerCase().includes(q)) ||
        (w.ifscCode && w.ifscCode.toLowerCase().includes(q)) ||
        (w.name && w.name.toLowerCase().includes(q))
      );
    }
    return res.json({ withdrawals: list });
  });

  app.post('/api/admin/withdrawals/:id/approve', async (req, res) => {
    const { id } = req.params;
    const { adminNote, adminUsername, forceApprove, payoutRef, accountDetails } = req.body;
    const withdrawal = db.withdrawals.find(w => w.id === id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return res.status(400).json({ error: 'Withdrawal is already settled' });
    }

    const user = db.users.get(withdrawal.uid);
    if (user) {
      const completedTurnover = Number(user.completedTurnover ?? 0);
      const requiredTurnover = Number(user.requiredTurnover || 0);
      const remainingTurnover = user.remainingTurnover !== undefined 
        ? Number(user.remainingTurnover) 
        : Math.max(0, parseFloat((requiredTurnover - completedTurnover).toFixed(2)));

      if (remainingTurnover > 0 && !forceApprove) {
        return res.status(400).json({ 
          error: `User rollover requirement not completed! Remaining rollover needed: ₹${remainingTurnover.toFixed(2)} (Played: ₹${completedTurnover.toFixed(2)} / Required: ₹${requiredTurnover.toFixed(2)}). Cannot approve payout until rollover is completed.` 
        });
      }
    }

    const finalPayoutRef = payoutRef || adminNote || ('62660' + Date.now().toString().slice(-7));
    withdrawal.status = 'approved';
    withdrawal.adminNote = payoutRef ? `UTR/Ref: ${payoutRef}` : (adminNote || 'Payout Transferred via Banking Gateway');
    withdrawal.processedBy = adminUsername || 'SuperAdmin';
    withdrawal.updatedAt = new Date().toISOString();

    if (user) {
      user.totalWithdrawal += withdrawal.amount;
      await saveUserPermanently(user).catch(() => {});
    }

    const existingTx = db.transactions.find(t => t.reference === withdrawal.id || t.id === `TX-${withdrawal.id}` || t.id === `TX-WTH-${withdrawal.id}`);
    if (existingTx) {
      existingTx.status = 'completed';
      existingTx.adminNote = withdrawal.adminNote;
      existingTx.note = `Withdrawal approved & payout transferred: ${withdrawal.adminNote}`;
      existingTx.createdBy = adminUsername || 'SuperAdmin';
      await saveTransactionPermanently(existingTx).catch(() => {});
    }

    await saveWithdrawalPermanently(withdrawal).catch(() => {});

    // Automatically record into Google Sheet Withdrawal Ledger (Approved only)
    try {
      db.addGoogleSheetWithdrawal(
        withdrawal,
        finalPayoutRef,
        accountDetails || 'SARKAR TRANSPORT'
      );
    } catch (sheetErr) {
      console.error('Failed to append to Google Sheet Withdrawal Ledger:', sheetErr);
    }

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Approve Withdrawal',
      `Approved withdrawal ${id} for ₹${withdrawal.amount} on UID ${withdrawal.uid}`,
      withdrawal.uid,
      'Pending',
      'Approved',
      req
    );

    db.saveToDisk();

    return res.json({ success: true, withdrawal });
  });

  app.post('/api/admin/withdrawals/:id/reject', async (req, res) => {
    const { id } = req.params;
    const { adminNote, adminUsername } = req.body;
    const withdrawal = db.withdrawals.find(w => w.id === id);
    if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found' });
    if (withdrawal.status !== 'pending' && withdrawal.status !== 'processing') {
      return res.status(400).json({ error: 'Withdrawal is already settled' });
    }

    withdrawal.status = 'rejected';
    withdrawal.adminNote = adminNote || 'Rejected by Admin. Amount Refunded to Wallet.';
    withdrawal.processedBy = adminUsername || 'SuperAdmin';
    withdrawal.updatedAt = new Date().toISOString();

    const user = db.users.get(withdrawal.uid);
    if (user) {
      user.walletBalance = Number((user.walletBalance + withdrawal.amount).toFixed(2));
      db.users.set(user.uid, user);
      await saveUserPermanently(user).catch(() => {});

      // Single card update: update the existing withdrawal transaction to rejected status
      const existingTx = db.transactions.find(t => t.reference === withdrawal.id || t.id === `TX-${withdrawal.id}` || t.id === `TX-WTH-${withdrawal.id}`);
      if (existingTx) {
        existingTx.status = 'rejected';
        existingTx.adminNote = withdrawal.adminNote;
        existingTx.note = `Withdrawal rejected & refunded: ${withdrawal.adminNote}`;
        existingTx.newBalance = user.walletBalance;
        existingTx.createdBy = adminUsername || 'SuperAdmin';
        await saveTransactionPermanently(existingTx).catch(() => {});
      }
    }

    await saveWithdrawalPermanently(withdrawal).catch(() => {});

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Reject Withdrawal',
      `Rejected withdrawal ${id} for ₹${withdrawal.amount} on UID ${withdrawal.uid}. Refunded to wallet.`,
      withdrawal.uid,
      'Pending',
      'Rejected',
      req
    );

    db.saveToDisk();

    return res.json({ success: true, withdrawal });
  });

  // ==================== GOOGLE SHEET LEDGER APIS ====================
  app.get('/api/admin/google-sheet-ledger', (req, res) => {
    const deposits = db.googleSheetDeposits || [];
    const withdrawals = db.googleSheetWithdrawals || [];
    const bankAccounts = db.adminBankAccounts || ['SARKAR TRANSPORT', 'SARKAR TRA.', 'HDFC BANK', 'ICICI BANK', 'SBI BANK'];
    const platforms = db.googleSheetPlatforms || ['AROWCLUB', 'SKY EXCH', 'RADHE EXCH', 'ARMANI'];

    // Calculate recalculations & running cumulative if needed
    let runningCum = 0;
    const depositsWithCum = deposits.map((d) => {
      const amt = Number(d.amt || 0);
      runningCum += amt;
      return {
        ...d,
        cumulative: d.cumulative !== undefined ? d.cumulative : runningCum,
      };
    });

    const totalApprovedDeposits = deposits.reduce((sum, d) => sum + Number(d.amt || 0), 0);
    const totalApprovedWithdrawals = withdrawals.reduce((sum, w) => sum + Math.abs(Number(w.amt || 0)), 0);
    const netBalance = totalApprovedDeposits - totalApprovedWithdrawals;

    return res.json({
      success: true,
      deposits: depositsWithCum,
      withdrawals,
      bankAccounts,
      platforms,
      webhookUrl: db.googleSheetWebhookUrl || '',
      stats: {
        totalApprovedDeposits,
        totalApprovedWithdrawals,
        netBalance,
        totalDepositCount: deposits.length,
        totalWithdrawalCount: withdrawals.length,
      },
    });
  });

  // Add or edit Deposit row in Google Sheet
  app.post('/api/admin/google-sheet-ledger/deposits', (req, res) => {
    const { id, tid, date, userId, amt, utr, accountDetails, platform, bonus } = req.body;
    if (!db.googleSheetDeposits) db.googleSheetDeposits = [];

    if (id) {
      const idx = db.googleSheetDeposits.findIndex(d => d.id === id);
      if (idx !== -1) {
        const item = db.googleSheetDeposits[idx];
        if (tid !== undefined) item.tid = tid;
        if (date !== undefined) item.date = date;
        if (userId !== undefined) item.userId = userId;
        if (amt !== undefined) item.amt = Number(amt);
        if (utr !== undefined) item.utr = utr;
        if (accountDetails !== undefined) item.accountDetails = accountDetails;
        if (platform !== undefined) item.platform = platform;
        if (bonus !== undefined) item.bonus = Number(bonus);
        item.total = Number(item.amt || 0) + Number(item.bonus || 0);
        db.saveToDisk();
        return res.json({ success: true, row: item, deposits: db.googleSheetDeposits });
      }
    }

    const seq = db.googleSheetDepositSeq++;
    const generatedTid = tid || `CRN01D${String(seq).padStart(5, '0')}`;
    const d = new Date();
    const formattedDate = date || `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    const numAmt = Number(amt || 0);
    const numBonus = Number(bonus || 0);

    const newRow = {
      id: `GSD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tid: generatedTid,
      date: formattedDate,
      userId: userId || 'user1',
      amt: numAmt,
      utr: utr || ('66' + Date.now().toString().slice(-10)),
      accountDetails: accountDetails || 'SARKAR TRANSPORT',
      platform: platform || 'AROWCLUB',
      bonus: numBonus,
      total: numAmt + numBonus,
      cumulative: 0,
      createdAt: new Date().toISOString(),
    };

    db.googleSheetDeposits.push(newRow);
    db.saveToDisk();
    return res.json({ success: true, row: newRow, deposits: db.googleSheetDeposits });
  });

  // Delete Deposit row
  app.delete('/api/admin/google-sheet-ledger/deposits/:id', (req, res) => {
    const { id } = req.params;
    if (!db.googleSheetDeposits) db.googleSheetDeposits = [];
    db.googleSheetDeposits = db.googleSheetDeposits.filter(d => d.id !== id);
    db.saveToDisk();
    return res.json({ success: true, deposits: db.googleSheetDeposits });
  });

  // Add or edit Withdrawal row in Google Sheet
  app.post('/api/admin/google-sheet-ledger/withdrawals', (req, res) => {
    const { id, tid, date, accountDetails, utr, userId, amt, status } = req.body;
    if (!db.googleSheetWithdrawals) db.googleSheetWithdrawals = [];

    if (id) {
      const idx = db.googleSheetWithdrawals.findIndex(w => w.id === id);
      if (idx !== -1) {
        const item = db.googleSheetWithdrawals[idx];
        if (tid !== undefined) item.tid = tid;
        if (date !== undefined) item.date = date;
        if (accountDetails !== undefined) item.accountDetails = accountDetails;
        if (utr !== undefined) item.utr = utr;
        if (userId !== undefined) item.userId = userId;
        if (amt !== undefined) item.amt = -Math.abs(Number(amt));
        if (status !== undefined) item.status = status;
        db.saveToDisk();
        return res.json({ success: true, row: item, withdrawals: db.googleSheetWithdrawals });
      }
    }

    const seq = db.googleSheetWithdrawSeq++;
    const generatedTid = tid || `CRN01W${String(seq).padStart(5, '0')}`;
    const d = new Date();
    const formattedDate = date || `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;

    const newRow = {
      id: `GSW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tid: generatedTid,
      date: formattedDate,
      accountDetails: accountDetails || 'SARKAR TRANSPORT',
      utr: utr || ('62660' + Date.now().toString().slice(-7)),
      userId: userId || 'user1',
      amt: -Math.abs(Number(amt || 0)),
      status: (status as any) || 'DONE',
      createdAt: new Date().toISOString(),
    };

    db.googleSheetWithdrawals.push(newRow);
    db.saveToDisk();
    return res.json({ success: true, row: newRow, withdrawals: db.googleSheetWithdrawals });
  });

  // Delete Withdrawal row
  app.delete('/api/admin/google-sheet-ledger/withdrawals/:id', (req, res) => {
    const { id } = req.params;
    if (!db.googleSheetWithdrawals) db.googleSheetWithdrawals = [];
    db.googleSheetWithdrawals = db.googleSheetWithdrawals.filter(w => w.id !== id);
    db.saveToDisk();
    return res.json({ success: true, withdrawals: db.googleSheetWithdrawals });
  });

  // Update bank accounts list
  app.post('/api/admin/google-sheet-ledger/bank-accounts', (req, res) => {
    const { bankAccounts } = req.body;
    if (Array.isArray(bankAccounts)) {
      db.adminBankAccounts = bankAccounts.map((b: string) => String(b).trim()).filter(Boolean);
      db.saveToDisk();
    }
    return res.json({ success: true, bankAccounts: db.adminBankAccounts });
  });

  // Update platforms list
  app.post('/api/admin/google-sheet-ledger/platforms', (req, res) => {
    const { platforms } = req.body;
    if (Array.isArray(platforms)) {
      db.googleSheetPlatforms = platforms.map((p: string) => String(p).trim()).filter(Boolean);
      db.saveToDisk();
    }
    return res.json({ success: true, platforms: db.googleSheetPlatforms });
  });

  // Set Google Sheets Webhook URL
  app.post('/api/admin/google-sheet-ledger/webhook', (req, res) => {
    const { webhookUrl } = req.body;
    db.googleSheetWebhookUrl = String(webhookUrl || '').trim();
    db.saveToDisk();
    return res.json({ success: true, webhookUrl: db.googleSheetWebhookUrl });
  });

  // Synchronize already approved deposits and withdrawals from the database
  app.post('/api/admin/google-sheet-ledger/sync-existing', (req, res) => {
    if (!db.googleSheetDeposits) db.googleSheetDeposits = [];
    if (!db.googleSheetWithdrawals) db.googleSheetWithdrawals = [];

    const approvedDeposits = db.deposits.filter(d => d.status === 'approved');
    let addedDeposits = 0;
    for (const dep of approvedDeposits) {
      const exists = db.googleSheetDeposits.some(g => g.depositId === dep.id || (g.utr === dep.utrReference && g.amt === dep.amount));
      if (!exists) {
        db.addGoogleSheetDeposit(dep, dep.paymentMethod || 'SARKAR TRANSPORT', 'AROWCLUB', 0);
        addedDeposits++;
      }
    }

    const approvedWithdrawals = db.withdrawals.filter(w => w.status === 'approved');
    let addedWithdrawals = 0;
    for (const withdr of approvedWithdrawals) {
      const exists = db.googleSheetWithdrawals.some(g => g.withdrawalId === withdr.id);
      if (!exists) {
        db.addGoogleSheetWithdrawal(withdr, withdr.adminNote, 'SARKAR TRANSPORT');
        addedWithdrawals++;
      }
    }

    return res.json({
      success: true,
      addedDeposits,
      addedWithdrawals,
      depositsCount: db.googleSheetDeposits.length,
      withdrawalsCount: db.googleSheetWithdrawals.length,
    });
  });

  // Reset Google Sheet Ledger: Close old and start fresh from CRN01D00000 & CRN01W00000
  app.post('/api/admin/google-sheet-ledger/reset', (req, res) => {
    const result = db.resetGoogleSheetLedger();
    return res.json(result);
  });

  // Global System Reset: Zero out all transactions, bets, deposits, withdrawals, results, and user balances for fresh start
  app.post('/api/admin/system/reset-all-data', (req, res) => {
    const { adminUsername } = req.body;
    const result = db.resetAllSystemData();
    logAdminAction(
      adminUsername || 'SuperAdmin',
      'System Global Fresh Reset',
      'Reset all transactions, bets, deposits, withdrawals, results, and balances to 0 for a fresh new start.',
      undefined,
      undefined,
      undefined,
      req
    );
    return res.json(result);
  });

  // Wingo Game Live & Result Control
  app.get('/api/admin/game/current/:gameType', (req, res) => {
    const gameType = req.params.gameType as GameType;
    const now = Date.now();
    const period = gameEngine.ensureActivePeriod(gameType, now);
    if (!period) return res.status(404).json({ error: 'Game type not found' });

    const remainingMs = Math.max(0, period.endTime - now);
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const activeBets = db.bets.filter(b => b.periodId === period.periodId && b.gameType === gameType);

    return res.json({
      period: {
        ...period,
        remainingSeconds,
        isLocked: remainingSeconds <= 5,
      },
      bets: activeBets,
      stats: {
        totalBets: activeBets.length,
        totalAmount: activeBets.reduce((s, b) => s + b.totalAmount, 0),
        colorBets: {
          green: activeBets.filter(b => b.selection === 'green').reduce((s, b) => s + b.totalAmount, 0),
          red: activeBets.filter(b => b.selection === 'red').reduce((s, b) => s + b.totalAmount, 0),
          violet: activeBets.filter(b => b.selection === 'violet').reduce((s, b) => s + b.totalAmount, 0),
        },
        sizeBets: {
          big: activeBets.filter(b => b.selection === 'big').reduce((s, b) => s + b.totalAmount, 0),
          small: activeBets.filter(b => b.selection === 'small').reduce((s, b) => s + b.totalAmount, 0),
        },
        numberBets: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
          number: n,
          amount: activeBets.filter(b => b.selection === String(n)).reduce((s, b) => s + b.totalAmount, 0),
        })),
      },
    });
  });

  app.post('/api/admin/game/set-result', (req, res) => {
    const { gameType, periodId, manualResultNumber, adminUsername } = req.body;
    const period = db.currentPeriods.get(gameType);
    if (!period) return res.status(404).json({ error: 'Game not found' });

    const targetPeriod = (periodId && period.periodId === periodId) ? period : period;
    const num = Number(manualResultNumber);
    if (isNaN(num) || num < 0 || num > 9) {
      return res.status(400).json({ error: 'Result number must be between 0 and 9' });
    }

    targetPeriod.manualResultNumber = num;

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Set Manual Game Result',
      `Configured manual winning number [${num}] for Period #${targetPeriod.periodId} (${gameType})`,
      undefined,
      'Auto-random',
      `Manual: ${num}`,
      req
    );

    return res.json({ success: true, message: `Result number ${num} scheduled for Period #${targetPeriod.periodId}!`, period: targetPeriod });
  });

  app.post('/api/admin/game/settle-now', (req, res) => {
    const { gameType, forceNumber, adminUsername } = req.body;
    const period = db.currentPeriods.get(gameType);
    if (!period) return res.status(404).json({ error: 'Game not found' });

    const num = forceNumber !== undefined ? Number(forceNumber) : undefined;
    gameEngine.settlePeriod(gameType, period, num);

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Force Settle Game Period',
      `Force settled Period #${period.periodId} (${gameType}) with result number ${period.resultNumber}`,
      undefined,
      undefined,
      `Number: ${period.resultNumber}`,
      req
    );

    return res.json({ success: true, message: `Period settled with result ${period.resultNumber}!`, period });
  });

  // Game Settings
  app.get('/api/admin/game/settings', (req, res) => {
    return res.json(db.platformGameSettings);
  });

  app.post('/api/admin/game/settings/update', (req, res) => {
    const { adminUsername, ...updatedSettings } = req.body;
    db.platformGameSettings = {
      ...db.platformGameSettings,
      ...updatedSettings,
    };

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Update Global Game Settings',
      `Updated platform multipliers & betting limits`,
      undefined,
      undefined,
      JSON.stringify(db.platformGameSettings),
      req
    );

    return res.json({ success: true, settings: db.platformGameSettings });
  });

  // Bets & Results
  app.get('/api/admin/bets', (req, res) => {
    const { search, gameType, status, betType } = req.query;
    let list = [...db.bets];

    if (gameType && gameType !== 'all') list = list.filter(b => b.gameType === gameType);
    if (status && status !== 'all') list = list.filter(b => b.status === status);
    if (betType && betType !== 'all') list = list.filter(b => b.betType === betType);
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(b => b.uid.includes(q) || b.username.toLowerCase().includes(q) || b.periodId.includes(q) || b.id.toLowerCase().includes(q));
    }

    return res.json({ bets: list.slice(0, 200) });
  });

  app.get('/api/admin/results', (req, res) => {
    const { gameType, search } = req.query;
    const gt = (gameType as GameType) || 'wingo_30s';
    let history = db.resultsHistory.get(gt) || [];
    if (search) {
      const q = String(search);
      history = history.filter(h => h.periodId.includes(q) || String(h.resultNumber) === q);
    }
    return res.json({ results: history });
  });

  // Helper to calculate real-time live admin metrics & date-filtered analytics
  const getLiveAdminMetrics = (query: any = {}) => {
    // Deduplicate users by uid
    const userMap = new Map<string, any>();
    for (const u of db.users.values()) {
      if (u && u.uid) {
        userMap.set(u.uid, u);
      }
    }
    const usersList = Array.from(userMap.values());
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter(u => u.status !== 'blocked').length;
    const blockedUsers = usersList.filter(u => u.status === 'blocked').length;

    const pendingDeposits = (db.deposits || []).filter(d => d && d.status === 'pending').length;
    const pendingWithdrawals = (db.withdrawals || []).filter(w => w && (w.status === 'pending' || w.status === 'processing')).length;
    const openTickets = (db.supportTickets || []).filter(t => t && t.status === 'open' && (t.unreadCountByAdmin || 0) > 0).length;
    const escalatedTickets = (db.supportTickets || []).filter(t => t && t.status === 'open' && t.escalatedToAdmin && (t.unreadCountByAdmin || 0) > 0).length;
    const totalEscalatedTickets = (db.supportTickets || []).filter(t => t && t.status === 'open' && t.escalatedToAdmin).length;

    const totalBets = (db.bets || []).length;
    
    // Aggregate all deposits (user deposits + admin manual deposits)
    const approvedDepositsList = (db.deposits || []).filter(d => d && d.status === 'approved');
    const manualCreditAdjustments = (db.transactions || []).filter(t => t && t.type === 'adjustment' && Number(t.amount || 0) > 0);
    const totalDepositsAmount = approvedDepositsList.reduce((s, d) => s + Number(d.amount || 0), 0) + 
      manualCreditAdjustments.reduce((s, t) => s + Number(t.amount || 0), 0);

    // Aggregate all withdrawals (user withdrawals + admin manual withdrawals)
    const approvedWithdrawalsList = (db.withdrawals || []).filter(w => w && (w.status === 'approved' || w.status === 'completed'));
    const manualDebitAdjustments = (db.transactions || []).filter(t => t && t.type === 'adjustment' && Number(t.amount || 0) < 0);
    const totalWithdrawalsAmount = approvedWithdrawalsList.reduce((s, w) => s + Number(w.amount || 0), 0) + 
      manualDebitAdjustments.reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

    const totalBetVolume = (db.bets || []).reduce((s, b) => s + Number(b.totalAmount || b.amount || 0), 0);
    const totalWinVolume = (db.bets || []).filter(b => b && b.status === 'won').reduce((s, b) => s + Number(b.winAmount || 0), 0);
    const totalProfit = totalDepositsAmount - totalWithdrawalsAmount;

    // Determine target date and target month
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    const currentMonthStr = todayStr.substring(0, 7); // 'YYYY-MM'

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthYear = lastMonthDate.getFullYear();
    const lastMonthNum = String(lastMonthDate.getMonth() + 1).padStart(2, '0');
    const lastMonthStr = `${lastMonthYear}-${lastMonthNum}`;

    const periodType = (query.periodType || query.period || 'today').toLowerCase();
    
    let targetDateStr = todayStr;
    if (periodType === 'yesterday') {
      targetDateStr = yesterdayStr;
    } else if (periodType === 'custom_date' && query.date) {
      targetDateStr = String(query.date).substring(0, 10);
    } else if (query.date) {
      targetDateStr = String(query.date).substring(0, 10);
    }

    let targetMonthStr = currentMonthStr;
    if (periodType === 'last_month') {
      targetMonthStr = lastMonthStr;
    } else if (periodType === 'custom_month' && query.month) {
      targetMonthStr = String(query.month).substring(0, 7);
    } else if (query.month) {
      targetMonthStr = String(query.month).substring(0, 7);
    } else if (periodType === 'custom_date' || periodType === 'today' || periodType === 'yesterday') {
      targetMonthStr = targetDateStr.substring(0, 7);
    }

    // Helper for date matching with multi-format & timezone tolerance
    const matchesDate = (timestamp?: any, targetDate?: string) => {
      if (!timestamp || !targetDate) return false;
      try {
        if (typeof timestamp === 'number') {
          const d = new Date(timestamp);
          if (!isNaN(d.getTime())) {
            const iso = d.toISOString().split('T')[0];
            const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return iso === targetDate || local === targetDate;
          }
        }
        const s = String(timestamp).trim();
        if (s.startsWith(targetDate)) return true;

        // Support DD/MM/YYYY & D/M/YYYY format
        const parts = targetDate.split('-');
        if (parts.length === 3) {
          const [y, m, d] = parts;
          const dNum = parseInt(d, 10);
          const mNum = parseInt(m, 10);
          if (
            s.includes(`${dNum}/${mNum}/${y}`) ||
            s.includes(`${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`) ||
            s.includes(`${dNum}-${mNum}-${y}`) ||
            s.includes(`${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`)
          ) {
            return true;
          }
        }

        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().split('T')[0];
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return iso === targetDate || local === targetDate || s.includes(targetDate);
        }
      } catch {
        // fallback
      }
      return false;
    };

    const matchesMonth = (timestamp?: any, targetMonth?: string) => {
      if (!timestamp || !targetMonth) return false;
      try {
        if (typeof timestamp === 'number') {
          const d = new Date(timestamp);
          if (!isNaN(d.getTime())) {
            const isoMonth = d.toISOString().split('T')[0].substring(0, 7);
            const localMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return isoMonth === targetMonth || localMonth === targetMonth;
          }
        }
        const s = String(timestamp).trim();
        if (s.startsWith(targetMonth)) return true;

        const mParts = targetMonth.split('-');
        if (mParts.length === 2) {
          const [y, m] = mParts;
          const mNum = parseInt(m, 10);
          if (
            s.includes(`/${mNum}/${y}`) ||
            s.includes(`/${m.padStart(2, '0')}/${y}`) ||
            s.includes(`-${mNum}-${y}`) ||
            s.includes(`-${m.padStart(2, '0')}-${y}`)
          ) {
            return true;
          }
        }

        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          const isoMonth = d.toISOString().split('T')[0].substring(0, 7);
          const localMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return isoMonth === targetMonth || localMonth === targetMonth || s.includes(targetMonth);
        }
      } catch {
        // fallback
      }
      return false;
    };

    // Calculate Daily Stats for targetDateStr
    const newUsersOnDate = usersList.filter(u => matchesDate(u.registrationDate || u.createdAt, targetDateStr)).length;
    
    const approvedDepositsOnDate = (db.deposits || []).filter(d => 
      d && d.status === 'approved' && (matchesDate(d.updatedAt, targetDateStr) || matchesDate(d.createdAt, targetDateStr))
    );
    const existingDepositIds = new Set(approvedDepositsOnDate.map(d => d.id));
    const manualCreditTxOnDate = (db.transactions || []).filter(t => 
      t && matchesDate(t.createdAt, targetDateStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) > 0) ||
        (t.type === 'deposit' && (t.status === 'completed' || !t.status) && (!t.reference || !existingDepositIds.has(t.reference)))
      )
    );
    const dailyDepositAmount = approvedDepositsOnDate.reduce((sum, d) => sum + Number(d.amount || 0), 0) +
      manualCreditTxOnDate.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const dailyDepositCount = approvedDepositsOnDate.length + manualCreditTxOnDate.length;

    const pendingDepositsOnDate = (db.deposits || []).filter(d => 
      d && d.status === 'pending' && matchesDate(d.createdAt, targetDateStr)
    );
    const dailyPendingDepositAmount = pendingDepositsOnDate.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const dailyPendingDepositCount = pendingDepositsOnDate.length;

    const approvedWithdrawalsOnDate = (db.withdrawals || []).filter(w => 
      w && (w.status === 'approved' || w.status === 'completed') && (matchesDate(w.updatedAt, targetDateStr) || matchesDate(w.createdAt, targetDateStr))
    );
    const existingWithdrawalIds = new Set(approvedWithdrawalsOnDate.map(w => w.id));
    const manualDebitTxOnDate = (db.transactions || []).filter(t => 
      t && matchesDate(t.createdAt, targetDateStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) < 0) ||
        (t.type === 'withdrawal' && (t.status === 'approved' || t.status === 'completed') && (!t.reference || !existingWithdrawalIds.has(t.reference)))
      )
    );
    const dailyWithdrawalAmount = approvedWithdrawalsOnDate.reduce((sum, w) => sum + Number(w.amount || 0), 0) +
      manualDebitTxOnDate.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);
    const dailyWithdrawalCount = approvedWithdrawalsOnDate.length + manualDebitTxOnDate.length;

    const pendingWithdrawalsOnDate = (db.withdrawals || []).filter(w => 
      w && (w.status === 'pending' || w.status === 'processing') && matchesDate(w.createdAt, targetDateStr)
    );
    const dailyPendingWithdrawalAmount = pendingWithdrawalsOnDate.reduce((sum, w) => sum + Number(w.amount || 0), 0);
    const dailyPendingWithdrawalCount = pendingWithdrawalsOnDate.length;

    const dailyPnlAmount = dailyDepositAmount - dailyWithdrawalAmount;

    const betsOnDate = (db.bets || []).filter(b => 
      b && matchesDate((b as any).settledAt || b.createdAt, targetDateStr)
    );
    const dailyBetsCount = betsOnDate.length;
    const dailyBetsTurnover = betsOnDate.reduce((sum, b) => sum + Number(b.totalAmount || b.amount || 0), 0);

    // Calculate Monthly Stats for targetMonthStr
    const newUsersInMonth = usersList.filter(u => matchesMonth(u.registrationDate || u.createdAt, targetMonthStr)).length;

    const approvedDepositsInMonth = (db.deposits || []).filter(d => 
      d && d.status === 'approved' && (matchesMonth(d.updatedAt, targetMonthStr) || matchesMonth(d.createdAt, targetMonthStr))
    );
    const existingDepositIdsMonth = new Set(approvedDepositsInMonth.map(d => d.id));
    const manualCreditTxInMonth = (db.transactions || []).filter(t => 
      t && matchesMonth(t.createdAt, targetMonthStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) > 0) ||
        (t.type === 'deposit' && (t.status === 'completed' || !t.status) && (!t.reference || !existingDepositIdsMonth.has(t.reference)))
      )
    );
    const monthlyDepositAmount = approvedDepositsInMonth.reduce((sum, d) => sum + Number(d.amount || 0), 0) +
      manualCreditTxInMonth.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const monthlyDepositCount = approvedDepositsInMonth.length + manualCreditTxInMonth.length;

    const approvedWithdrawalsInMonth = (db.withdrawals || []).filter(w => 
      w && (w.status === 'approved' || w.status === 'completed') && (matchesMonth(w.updatedAt, targetMonthStr) || matchesMonth(w.createdAt, targetMonthStr))
    );
    const existingWithdrawalIdsMonth = new Set(approvedWithdrawalsInMonth.map(w => w.id));
    const manualDebitTxInMonth = (db.transactions || []).filter(t => 
      t && matchesMonth(t.createdAt, targetMonthStr) && (
        (t.type === 'adjustment' && Number(t.amount || 0) < 0) ||
        (t.type === 'withdrawal' && (t.status === 'approved' || t.status === 'completed') && (!t.reference || !existingWithdrawalIdsMonth.has(t.reference)))
      )
    );
    const monthlyWithdrawalAmount = approvedWithdrawalsInMonth.reduce((sum, w) => sum + Number(w.amount || 0), 0) +
      manualDebitTxInMonth.reduce((sum, t) => sum + Math.abs(Number(t.amount || 0)), 0);
    const monthlyWithdrawalCount = approvedWithdrawalsInMonth.length + manualDebitTxInMonth.length;

    const monthlyPnlAmount = monthlyDepositAmount - monthlyWithdrawalAmount;

    const betsInMonth = (db.bets || []).filter(b => 
      b && matchesMonth((b as any).settledAt || b.createdAt, targetMonthStr)
    );
    const monthlyBetsCount = betsInMonth.length;
    const monthlyBetsTurnover = betsInMonth.reduce((sum, b) => sum + Number(b.totalAmount || b.amount || 0), 0);

    // Format human-readable date & month label
    const parseDateToDisplay = (dStr: string) => {
      try {
        const parts = dStr.split('-');
        if (parts.length === 3) {
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return dObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      } catch {
        // fallback
      }
      return dStr;
    };

    const parseMonthToDisplay = (mStr: string) => {
      try {
        const parts = mStr.split('-');
        if (parts.length === 2) {
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
          return dObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        }
      } catch {
        // fallback
      }
      return mStr;
    };

    return {
      // Lifetime overview
      totalUsers,
      activeUsers,
      blockedUsers,
      pendingDeposits,
      pendingWithdrawals,
      openTickets,
      escalatedTickets,
      totalEscalatedTickets,
      totalBets,
      totalDeposits: totalDepositsAmount,
      totalDepositsAmount,
      totalWithdrawals: totalWithdrawalsAmount,
      totalWithdrawalsAmount,
      totalBetVolume,
      totalWinVolume,
      totalProfit,
      activeBannersCount: (db.banners || []).filter((b: any) => b && b.isActive !== false).length,
      isMaintenanceMode: Boolean(db.maintenanceConfig?.isEnabled || db.platformSettings?.maintenanceMode),

      // Flat compatibility properties
      todayDeposits: dailyDepositAmount,
      todayDepositsCount: dailyDepositCount,
      todayWithdrawals: dailyWithdrawalAmount,
      todayWithdrawalsCount: dailyWithdrawalCount,
      todayTurnover: dailyBetsTurnover,
      todayProfitLoss: dailyPnlAmount,
      todayNewUsers: newUsersOnDate,
      monthlyDeposits: monthlyDepositAmount,
      monthlyWithdrawals: monthlyWithdrawalAmount,
      monthlyProfitLoss: monthlyPnlAmount,

      // Filter context
      periodType,
      selectedDate: targetDateStr,
      selectedMonth: targetMonthStr,
      reportForDateLabel: `Report For: ${parseDateToDisplay(targetDateStr)}`,
      monthlyReportLabel: `Monthly Report: ${parseMonthToDisplay(targetMonthStr)}`,
      dateDisplay: parseDateToDisplay(targetDateStr),
      monthDisplay: parseMonthToDisplay(targetMonthStr),

      // 5 Daily Dashboard Cards
      daily: {
        totalUsers,
        newUsersOnDate,
        newUsersBadge: `+${newUsersOnDate} New Today`,
        depositAmount: dailyDepositAmount,
        depositCount: dailyDepositCount,
        pendingDepositAmount: dailyPendingDepositAmount,
        pendingDepositCount: dailyPendingDepositCount,
        allDepositsAmount: dailyDepositAmount + dailyPendingDepositAmount,
        allDepositsCount: dailyDepositCount + dailyPendingDepositCount,
        withdrawalAmount: dailyWithdrawalAmount,
        withdrawalCount: dailyWithdrawalCount,
        pendingWithdrawalAmount: dailyPendingWithdrawalAmount,
        pendingWithdrawalCount: dailyPendingWithdrawalCount,
        pnl: dailyPnlAmount,
        isProfit: dailyPnlAmount >= 0,
        betsCount: dailyBetsCount,
        turnover: dailyBetsTurnover,
      },

      // 5 Monthly Overview Cards
      monthly: {
        newUsersInMonth,
        totalUsers,
        depositAmount: monthlyDepositAmount,
        depositCount: monthlyDepositCount,
        withdrawalAmount: monthlyWithdrawalAmount,
        withdrawalCount: monthlyWithdrawalCount,
        pnl: monthlyPnlAmount,
        isProfit: monthlyPnlAmount >= 0,
        betsCount: monthlyBetsCount,
        turnover: monthlyBetsTurnover,
      },
    };
  };

  // Live real-time badge counts & admin metrics
  app.get('/api/admin/live-counts', (req, res) => {
    return res.json(getLiveAdminMetrics(req.query));
  });

  // Admin Dashboard Statistics with Date & Month filtering support
  app.get('/api/admin/dashboard-stats', (req, res) => {
    return res.json(getLiveAdminMetrics(req.query));
  });

  // Games Catalog Management
  app.get('/api/admin/games-catalog', (req, res) => {
    return res.json({ games: db.gameCatalog || [] });
  });

  app.post('/api/admin/games-catalog/:gameKey/toggle', (req, res) => {
    const { gameKey } = req.params;
    const { adminUsername } = req.body;
    const game = (db.gameCatalog || []).find((g: any) => g.gameKey === gameKey || g.id === gameKey);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    game.status = game.status === 'active' ? 'inactive' : 'active';
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Toggle Game Status',
      `Toggled game ${game.name} (${gameKey}) to ${game.status.toUpperCase()}`,
      undefined,
      undefined,
      game.status,
      req
    );

    return res.json({ success: true, game, games: db.gameCatalog });
  });

  app.post('/api/admin/games-catalog/:gameKey/update', (req, res) => {
    const { gameKey } = req.params;
    const { minBet, maxBet, status, rtp, houseCutPercent, adminUsername } = req.body;
    const game = (db.gameCatalog || []).find((g: any) => g.gameKey === gameKey || g.id === gameKey);
    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (minBet !== undefined) game.minBet = Number(minBet);
    if (maxBet !== undefined) game.maxBet = Number(maxBet);
    if (status !== undefined) game.status = status;
    if (rtp !== undefined) game.rtp = Number(rtp);
    if (houseCutPercent !== undefined) game.houseCutPercent = Number(houseCutPercent);

    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Update Game Config',
      `Updated settings for ${game.name}: Min ₹${game.minBet}, Max ₹${game.maxBet}, Cut: ${game.houseCutPercent}%`,
      undefined,
      undefined,
      JSON.stringify(game),
      req
    );

    return res.json({ success: true, game, games: db.gameCatalog });
  });

  // Notifications API (Public & Admin)
  app.get('/api/notifications', (req, res) => {
    const uid = req.headers['x-user-uid'] as string || req.query.uid as string;
    const notifs = (db.adminNotifications || []).filter((n: any) => {
      if (n.status === 'draft') return false;
      if (n.targetType === 'all') return true;
      if (uid && n.targetType === 'single' && n.targetUid === uid) return true;
      return false;
    });
    return res.json({ notifications: notifs });
  });

  app.get('/api/admin/notifications', (req, res) => {
    return res.json({ notifications: db.adminNotifications || [] });
  });

  app.post('/api/admin/notifications/create', (req, res) => {
    const { title, message, targetType, targetUid, targetGame, imageUrl, scheduledTime, adminUsername } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    const newNotification = {
      id: `notif-${Date.now()}`,
      title: String(title).trim(),
      message: String(message).trim(),
      targetType: targetType || 'all',
      targetUid: targetUid || undefined,
      targetGame: targetGame || undefined,
      imageUrl: imageUrl || undefined,
      scheduledTime: scheduledTime || undefined,
      status: scheduledTime ? 'scheduled' : 'sent',
      sentAt: scheduledTime ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (!db.adminNotifications) db.adminNotifications = [];
    db.adminNotifications.unshift(newNotification);
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Send Notification',
      `Broadcast notification: "${title}" to target: ${targetType}`,
      targetUid,
      undefined,
      undefined,
      req
    );

    return res.json({ success: true, notification: newNotification, notifications: db.adminNotifications });
  });

  app.post('/api/admin/notifications/send', (req, res) => {
    const { title, message, targetType, targetUid, targetGame, imageUrl, scheduledTime, adminUsername } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

    const newNotification = {
      id: `notif-${Date.now()}`,
      title: String(title).trim(),
      message: String(message).trim(),
      targetType: targetType || 'all',
      targetUid: targetUid || undefined,
      targetGame: targetGame || undefined,
      imageUrl: imageUrl || undefined,
      scheduledTime: scheduledTime || undefined,
      status: scheduledTime ? 'scheduled' : 'sent',
      sentAt: scheduledTime ? undefined : new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    if (!db.adminNotifications) db.adminNotifications = [];
    db.adminNotifications.unshift(newNotification);
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Send Notification',
      `Broadcast notification: "${title}" to target: ${targetType}`,
      targetUid,
      undefined,
      undefined,
      req
    );

    return res.json({ success: true, notification: newNotification, notifications: db.adminNotifications });
  });

  app.delete('/api/admin/notifications/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (db.adminNotifications) {
      db.adminNotifications = db.adminNotifications.filter((n: any) => n.id !== id);
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Delete Notification', `Deleted notification ID ${id}`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, notifications: db.adminNotifications });
  });

  // Support Links API
  const handleGetSupportLinks = (req: any, res: any) => {
    const raw = db.supportPlatforms || [];
    const normalized = raw.map((s: any) => ({
      id: s.id,
      platform: s.platform || s.name || 'Support Link',
      name: s.name || s.platform || 'Support Link',
      iconKey: s.iconKey || s.icon || 'whatsapp',
      icon: s.icon || s.iconKey || 'whatsapp',
      url: s.url || s.link || '',
      link: s.link || s.url || '',
      description: s.description || s.copyText || '',
      copyText: s.copyText || s.description || '',
      status: s.status || (s.isActive !== false ? 'active' : 'inactive'),
      isActive: s.isActive !== false && s.status !== 'inactive',
      updatedAt: s.updatedAt || new Date().toISOString(),
    }));
    return res.json({ links: normalized });
  };

  app.get('/api/admin/support-links', handleGetSupportLinks);
  app.get('/api/public/support-links', handleGetSupportLinks);
  app.get('/api/support-links', handleGetSupportLinks);

  app.post('/api/admin/support-links', (req, res) => {
    const { platform, name, link, url, icon, iconKey, copyText, description, isActive, status, adminUsername } = req.body;
    const pName = platform || name;
    const pUrl = url || link;
    if (!pName || !pUrl) return res.status(400).json({ error: 'Platform name and link are required' });

    const newLink = {
      id: `sp-${Date.now()}`,
      platform: String(pName).trim(),
      name: String(pName).trim(),
      link: String(pUrl).trim(),
      url: String(pUrl).trim(),
      icon: iconKey || icon || 'whatsapp',
      iconKey: iconKey || icon || 'whatsapp',
      copyText: description || copyText || '',
      description: description || copyText || '',
      isActive: isActive !== false && status !== 'inactive',
      status: status || (isActive !== false ? 'active' : 'inactive'),
      updatedAt: new Date().toISOString(),
    };

    if (!db.supportPlatforms) db.supportPlatforms = [];
    db.supportPlatforms.push(newLink);
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Add Support Link', `Added support link: ${pName} (${pUrl})`, undefined, undefined, undefined, req);
    return res.json({ success: true, link: newLink, links: db.supportPlatforms });
  });

  app.put('/api/admin/support-links/:id', (req, res) => {
    const { id } = req.params;
    const { name, platform, link, url, icon, iconKey, copyText, description, isActive, status, adminUsername } = req.body;
    const target = (db.supportPlatforms || []).find((s: any) => s.id === id);
    if (!target) return res.status(404).json({ error: 'Support link not found' });

    const pName = platform || name;
    const pUrl = url || link;
    if (pName !== undefined) {
      target.name = String(pName).trim();
      target.platform = String(pName).trim();
    }
    if (pUrl !== undefined) {
      target.link = String(pUrl).trim();
      target.url = String(pUrl).trim();
    }
    if (iconKey !== undefined || icon !== undefined) {
      target.icon = iconKey || icon;
      target.iconKey = iconKey || icon;
    }
    if (description !== undefined || copyText !== undefined) {
      target.description = description || copyText;
      target.copyText = description || copyText;
    }
    if (isActive !== undefined) target.isActive = isActive;
    if (status !== undefined) target.status = status;
    target.updatedAt = new Date().toISOString();

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Support Link', `Updated support link: ${target.platform || target.name}`, undefined, undefined, undefined, req);
    return res.json({ success: true, link: target, links: db.supportPlatforms });
  });

  app.delete('/api/admin/support-links/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (db.supportPlatforms) {
      db.supportPlatforms = db.supportPlatforms.filter((s: any) => s.id !== id);
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Delete Support Link', `Deleted support platform ID ${id}`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, links: db.supportPlatforms });
  });

  // Maintenance Mode API
  app.get('/api/admin/maintenance', (req, res) => {
    return res.json({
      config: db.maintenanceConfig || {
        isEnabled: false,
        title: 'WEBSITE MAINTENANCE',
        message: 'WE ARE CURRENTLY WORKING ON SOME UPDATES TO SERVE YOU BETTER',
        imageUrl: '/maintenance_arowclub_bg.jpg',
        bannerUrl: '/maintenance_arowclub_bg.jpg',
        startTime: '06:16 PM',
        endTime: '06:18 PM',
        history: [],
      }
    });
  });

  app.get('/api/maintenance/status', (req, res) => {
    const isEnabled = Boolean(db.maintenanceConfig?.isEnabled ?? db.platformSettings?.maintenanceMode);
    return res.json({
      isEnabled,
      enabled: isEnabled,
      title: db.maintenanceConfig?.title || 'WEBSITE MAINTENANCE',
      message: db.maintenanceConfig?.message || 'WE ARE CURRENTLY WORKING ON SOME UPDATES TO SERVE YOU BETTER',
      bannerUrl: db.maintenanceConfig?.bannerUrl || db.maintenanceConfig?.imageUrl || '/maintenance_arowclub_bg.jpg',
      imageUrl: db.maintenanceConfig?.imageUrl || db.maintenanceConfig?.bannerUrl || '/maintenance_arowclub_bg.jpg',
      startTime: db.maintenanceConfig?.startTime || '06:16 PM',
      endTime: db.maintenanceConfig?.endTime || '06:18 PM',
    });
  });

  app.post('/api/admin/maintenance/toggle', (req, res) => {
    const { isEnabled, enabled, reason, adminUsername } = req.body;
    const targetState = Boolean(isEnabled !== undefined ? isEnabled : enabled);
    if (!db.maintenanceConfig) {
      db.maintenanceConfig = { isEnabled: false, title: 'Platform Maintenance', message: '', history: [] };
    }

    const prev = db.maintenanceConfig.isEnabled;
    db.maintenanceConfig.isEnabled = targetState;
    db.platformSettings.maintenanceMode = targetState;

    if (targetState && !prev) {
      db.maintenanceConfig.startTime = db.maintenanceConfig.startTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (!db.maintenanceConfig.history) db.maintenanceConfig.history = [];
      db.maintenanceConfig.history.unshift({
        id: `maint-${Date.now()}`,
        enabledBy: adminUsername || 'SuperAdmin',
        startTime: db.maintenanceConfig.startTime,
        reason: reason || 'Admin toggled maintenance mode',
      });
    } else if (!targetState && prev) {
      db.maintenanceConfig.endTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      if (db.maintenanceConfig.history && db.maintenanceConfig.history[0]) {
        db.maintenanceConfig.history[0].endTime = db.maintenanceConfig.endTime;
      }
    }

    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Toggle Maintenance Mode',
      `Maintenance mode set to ${targetState ? 'ON' : 'OFF'}. Reason: ${reason || 'Manual toggle'}`,
      undefined,
      String(prev),
      String(targetState),
      req
    );

    return res.json({ success: true, config: db.maintenanceConfig });
  });

  app.post('/api/admin/maintenance/update', (req, res) => {
    const { enabled, isEnabled, title, message, bannerUrl, imageUrl, startTime, endTime, adminUsername } = req.body;
    if (!db.maintenanceConfig) {
      db.maintenanceConfig = { isEnabled: false, title: 'Platform Maintenance', message: '', history: [] };
    }

    if (enabled !== undefined || isEnabled !== undefined) {
      const targetState = Boolean(enabled !== undefined ? enabled : isEnabled);
      db.maintenanceConfig.isEnabled = targetState;
      db.platformSettings.maintenanceMode = targetState;
    }
    if (title !== undefined) db.maintenanceConfig.title = title;
    if (message !== undefined) db.maintenanceConfig.message = message;
    if (bannerUrl !== undefined) db.maintenanceConfig.bannerUrl = bannerUrl;
    if (imageUrl !== undefined) {
      db.maintenanceConfig.imageUrl = imageUrl;
      db.maintenanceConfig.bannerUrl = imageUrl;
    }
    if (startTime !== undefined) db.maintenanceConfig.startTime = startTime;
    if (endTime !== undefined) db.maintenanceConfig.endTime = endTime;

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Maintenance Config', 'Updated maintenance notice & timings', undefined, undefined, undefined, req);
    return res.json({ success: true, config: db.maintenanceConfig });
  });

  // Admin Staff & Role Management API
  app.get('/api/admin/admins', (req, res) => {
    return res.json({ admins: db.adminStaff || [] });
  });

  app.post('/api/admin/admins/create', (req, res) => {
    const { username, name, email, role, password, adminUsername } = req.body;
    if (!username || !role) return res.status(400).json({ error: 'Username and role are required' });

    const newStaff = {
      id: `adm-${Date.now()}`,
      username: String(username).trim(),
      name: name ? String(name).trim() : String(username).trim(),
      email: email ? String(email).trim() : `${username}@arowclub.pro`,
      role: role || 'viewer',
      status: 'active' as const,
      lastLogin: undefined,
      createdAt: new Date().toISOString(),
    };

    if (!db.adminStaff) db.adminStaff = [];
    db.adminStaff.push(newStaff);
    db.saveToDisk();

    logAdminAction(
      adminUsername || 'SuperAdmin',
      'Create Admin Account',
      `Created admin user ${newStaff.username} with role ${newStaff.role}`,
      undefined,
      undefined,
      undefined,
      req
    );

    return res.json({ success: true, admin: newStaff, admins: db.adminStaff });
  });

  app.put('/api/admin/admins/:id', (req, res) => {
    const { id } = req.params;
    const { name, email, role, status, adminUsername } = req.body;
    const staff = (db.adminStaff || []).find((a: any) => a.id === id);
    if (!staff) return res.status(404).json({ error: 'Admin account not found' });

    if (name !== undefined) staff.name = name;
    if (email !== undefined) staff.email = email;
    if (role !== undefined) staff.role = role;
    if (status !== undefined) staff.status = status;

    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Admin Account', `Updated admin ${staff.username} (Role: ${staff.role}, Status: ${staff.status})`, undefined, undefined, undefined, req);
    return res.json({ success: true, admin: staff, admins: db.adminStaff });
  });

  app.delete('/api/admin/admins/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (id === 'adm-01') return res.status(400).json({ error: 'Cannot delete primary Master Super Admin' });

    if (db.adminStaff) {
      db.adminStaff = db.adminStaff.filter((a: any) => a.id !== id);
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Delete Admin Account', `Deleted admin ID ${id}`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, admins: db.adminStaff });
  });

  // Universal Transactions & Financial Ledger
  app.get('/api/admin/transactions', (req, res) => {
    const { search, type, status, startDate, endDate } = req.query;
    let list = [...db.transactions];

    if (type && type !== 'all') {
      list = list.filter(t => t.type === type);
    }
    if (status && status !== 'all') {
      list = list.filter(t => t.status === status);
    }
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(t =>
        t.uid.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        (t.reference && t.reference.toLowerCase().includes(q)) ||
        (t.utrReference && t.utrReference.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q))
      );
    }
    if (startDate) {
      const s = new Date(startDate as string).getTime();
      list = list.filter(t => new Date(t.createdAt).getTime() >= s);
    }
    if (endDate) {
      const e = new Date(endDate as string).getTime() + 86400000;
      list = list.filter(t => new Date(t.createdAt).getTime() <= e);
    }

    return res.json({ transactions: list.slice(0, 500) });
  });

  // Banners & Promotions
  app.get('/api/banners', (req, res) => {
    const banners = (db.banners || []).filter(p => p.isActive !== false).map(p => ({
      id: p.id,
      title: p.title,
      subtitle: p.description || '',
      imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
      linkUrl: p.buttonLink || '',
      tag: 'HOT EVENT',
      status: p.isActive ? 'active' : 'inactive',
    }));
    return res.json({ banners });
  });

  app.get('/api/admin/banners', (req, res) => {
    return res.json({ banners: db.banners || [] });
  });

  const handleBannerCreate = (req: any, res: any) => {
    const { title, description, imageUrl, buttonText, buttonLink, position, startDate, endDate, isActive, adminUsername } = req.body;
    if (!title) return res.status(400).json({ error: 'Banner title is required' });

    const newBanner = {
      id: `b-${Date.now()}`,
      title: String(title).trim(),
      description: description || '',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&auto=format&fit=crop&q=80',
      buttonText: buttonText || 'Play Now',
      buttonLink: buttonLink || '/wallet',
      position: Number(position || (db.banners ? db.banners.length + 1 : 1)),
      startDate: startDate || new Date().toISOString().slice(0, 10),
      endDate: endDate || '2026-12-31',
      isActive: isActive !== false,
      createdAt: new Date().toISOString(),
    };

    if (!db.banners) db.banners = [];
    db.banners.push(newBanner);
    db.banners.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Create Banner', `Created banner: "${title}"`, undefined, undefined, undefined, req);
    return res.json({ success: true, banner: newBanner, banners: db.banners });
  };

  app.post('/api/admin/banners', handleBannerCreate);
  app.post('/api/admin/banners/create', handleBannerCreate);

  app.put('/api/admin/banners/:id', (req, res) => {
    const { id } = req.params;
    const { title, description, imageUrl, buttonText, buttonLink, position, startDate, endDate, isActive, adminUsername } = req.body;
    const banner = (db.banners || []).find((b: any) => b.id === id);
    if (!banner) return res.status(404).json({ error: 'Banner not found' });

    if (title !== undefined) banner.title = title;
    if (description !== undefined) banner.description = description;
    if (imageUrl !== undefined) banner.imageUrl = imageUrl;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (buttonLink !== undefined) banner.buttonLink = buttonLink;
    if (position !== undefined) banner.position = Number(position);
    if (startDate !== undefined) banner.startDate = startDate;
    if (endDate !== undefined) banner.endDate = endDate;
    if (isActive !== undefined) banner.isActive = isActive;

    if (db.banners) {
      db.banners.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    }
    db.saveToDisk();

    logAdminAction(adminUsername || 'SuperAdmin', 'Update Banner', `Updated banner: "${banner.title}"`, undefined, undefined, undefined, req);
    return res.json({ success: true, banner, banners: db.banners });
  });

  app.delete('/api/admin/banners/:id', (req, res) => {
    const { id } = req.params;
    const { adminUsername } = req.body || {};
    if (db.banners) {
      db.banners = db.banners.filter((b: any) => b.id !== id);
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Delete Banner', `Deleted banner ID ${id}`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, banners: db.banners });
  });

  // VIP Management
  app.get('/api/admin/vip-levels', (req, res) => {
    return res.json({ vipLevels: db.vipLevels });
  });

  app.post('/api/admin/vip-levels/update', (req, res) => {
    const { vipLevels, adminUsername } = req.body;
    if (Array.isArray(vipLevels)) {
      db.vipLevels = vipLevels;
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update VIP Levels', 'Updated VIP tier reward and EXP requirements', undefined, undefined, undefined, req);
      return res.json({ success: true, vipLevels: db.vipLevels });
    }
    return res.status(400).json({ error: 'vipLevels array is required' });
  });

  // Admin: Referrals & Hierarchy Tree
  app.get('/api/admin/referrals', (req, res) => {
    const users = Array.from(db.users.values());
    const comms = db.referralDepositCommissions || [];

    const referralList = users.map(u => {
      // Level 1: Direct Subordinates
      const directSubs = users.filter(sub => sub.referredBy === u.uid || (u.referralCode && sub.referredBy === u.referralCode));
      const directUids = new Set(directSubs.map(s => s.uid));

      // Level 2: Second-Level / Team Subordinates
      const teamSubs = users.filter(sub => sub.referredBy && directUids.has(sub.referredBy) && sub.uid !== u.uid);

      // Commissions breakdown from logged deposit records
      const userComms = comms.filter(r => r.referrerUid === u.uid);
      const l1FirstComms = userComms.filter(r => r.level === 1 && r.isFirstDeposit).reduce((s, r) => s + r.commissionAmount, 0);
      const l1SubsequentComms = userComms.filter(r => r.level === 1 && !r.isFirstDeposit).reduce((s, r) => s + r.commissionAmount, 0);
      const l1Total = Number((l1FirstComms + l1SubsequentComms).toFixed(2));
      const l2Total = Number(userComms.filter(r => r.level === 2).reduce((s, r) => s + r.commissionAmount, 0).toFixed(2));
      const totalComm = Number((l1Total + l2Total).toFixed(2));

      // Total deposit volume of subordinates
      const directDepositVol = directSubs.reduce((s, sub) => s + Number(sub.totalDeposit || 0), 0);
      const teamDepositVol = teamSubs.reduce((s, sub) => s + Number(sub.totalDeposit || 0), 0);

      return {
        uid: u.uid,
        username: u.username,
        phone: u.phone,
        code: u.referralCode,
        referredBy: u.referredBy || null,
        level1Count: directSubs.length,
        level2Count: teamSubs.length,
        totalInvites: directSubs.length + teamSubs.length,
        level1DepositVolume: Number(directDepositVol.toFixed(2)),
        level2DepositVolume: Number(teamDepositVol.toFixed(2)),
        level1FirstDepositCommission: Number(l1FirstComms.toFixed(2)),
        level1SubsequentCommission: Number(l1SubsequentComms.toFixed(2)),
        level1Commission: l1Total,
        level2Commission: l2Total,
        commissionEarned: totalComm,
        directSubordinates: directSubs.map(s => ({
          uid: s.uid,
          username: s.username,
          phone: s.phone,
          totalDeposit: s.totalDeposit || 0,
          registrationDate: s.registrationDate,
          status: s.status,
        })),
        teamSubordinates: teamSubs.map(s => ({
          uid: s.uid,
          username: s.username,
          phone: s.phone,
          referredBy: s.referredBy,
          totalDeposit: s.totalDeposit || 0,
          registrationDate: s.registrationDate,
          status: s.status,
        })),
      };
    });

    return res.json({ referrals: referralList });
  });

  // Admin: Complete Referral Tree & Commission History
  app.get('/api/admin/referral-tree', (req, res) => {
    const users = Array.from(db.users.values());
    const comms = db.referralDepositCommissions || [];

    // Filter to users who have either invited someone or were invited
    const activeAffiliates = users.filter(u => {
      const hasDirect = users.some(sub => sub.referredBy === u.uid || (u.referralCode && sub.referredBy === u.referralCode));
      return hasDirect || (u.referralEarnings && u.referralEarnings > 0);
    });

    const tree = activeAffiliates.map(u => {
      const directSubs = users.filter(sub => sub.referredBy === u.uid || (u.referralCode && sub.referredBy === u.referralCode));
      const directUids = new Set(directSubs.map(s => s.uid));
      const teamSubs = users.filter(sub => sub.referredBy && directUids.has(sub.referredBy) && sub.uid !== u.uid);

      const userComms = comms.filter(r => r.referrerUid === u.uid);
      const l1Total = Number(userComms.filter(r => r.level === 1).reduce((s, r) => s + r.commissionAmount, 0).toFixed(2));
      const l2Total = Number(userComms.filter(r => r.level === 2).reduce((s, r) => s + r.commissionAmount, 0).toFixed(2));

      return {
        uid: u.uid,
        username: u.username,
        referralCode: u.referralCode,
        referredBy: u.referredBy || null,
        level1: {
          count: directSubs.length,
          depositVolume: directSubs.reduce((s, sub) => s + Number(sub.totalDeposit || 0), 0),
          commissionEarned: l1Total,
          members: directSubs.map(s => ({
            uid: s.uid,
            username: s.username,
            phone: s.phone,
            totalDeposit: s.totalDeposit || 0,
            registrationDate: s.registrationDate,
          })),
        },
        level2: {
          count: teamSubs.length,
          depositVolume: teamSubs.reduce((s, sub) => s + Number(sub.totalDeposit || 0), 0),
          commissionEarned: l2Total,
          members: teamSubs.map(s => ({
            uid: s.uid,
            username: s.username,
            phone: s.phone,
            referredBy: s.referredBy,
            totalDeposit: s.totalDeposit || 0,
            registrationDate: s.registrationDate,
          })),
        },
        totalCommission: Number((l1Total + l2Total).toFixed(2)),
      };
    });

    return res.json({
      success: true,
      tree,
      commissionHistory: comms.slice(0, 300),
      summary: {
        totalCommissionsAwarded: Number(comms.reduce((s, r) => s + r.commissionAmount, 0).toFixed(2)),
        level1CommissionsAwarded: Number(comms.filter(r => r.level === 1).reduce((s, r) => s + r.commissionAmount, 0).toFixed(2)),
        level2CommissionsAwarded: Number(comms.filter(r => r.level === 2).reduce((s, r) => s + r.commissionAmount, 0).toFixed(2)),
        totalCommissionRecords: comms.length,
      }
    });
  });

  // Reports
  app.get('/api/admin/reports/:reportType', (req, res) => {
    const { reportType } = req.params;
    const now = new Date();

    const days = [];
    let sumBet = 0;
    let sumWin = 0;
    let sumDep = 0;
    let sumWth = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(now.getTime() - (i * 86400000));
      const dateStr = d.toISOString().slice(0, 10);
      
      const dayBets = (db.bets || []).filter(b => b.createdAt && String(b.createdAt).startsWith(dateStr));
      const dayDeposits = (db.deposits || []).filter(dep => dep.status === 'approved' && dep.createdAt && String(dep.createdAt).startsWith(dateStr));
      const dayWithdrawals = (db.withdrawals || []).filter(w => (w.status === 'approved' || w.status === 'completed') && w.createdAt && String(w.createdAt).startsWith(dateStr));
      
      const dayBet = dayBets.reduce((s, b) => s + Number(b.totalAmount || b.amount || 0), 0);
      const dayWin = dayBets.filter(b => b.status === 'won').reduce((s, b) => s + Number(b.winAmount || 0), 0);
      const dayDep = dayDeposits.reduce((s, dep) => s + Number(dep.amount || 0), 0);
      const dayWth = dayWithdrawals.reduce((s, w) => s + Number(w.amount || 0), 0);
      const net = dayBet - dayWin;

      sumBet += dayBet;
      sumWin += dayWin;
      sumDep += dayDep;
      sumWth += dayWth;

      days.push({
        date: dateStr,
        activePlayers: new Set(dayBets.map(b => b.uid)).size,
        totalBets: dayBets.length,
        betTurnover: dayBet,
        winPayout: dayWin,
        netProfit: net,
        depositAmount: dayDep,
        withdrawalAmount: dayWth,
      });
    }

    return res.json({
      summary: {
        totalBetAmount: sumBet,
        totalWinAmount: sumWin,
        netProfit: sumBet - sumWin,
        totalDeposits: sumDep,
        totalWithdrawals: sumWth,
      },
      dailyBreakdown: days,
    });
  });

  // Staff Management
  app.get('/api/admin/staff', (req, res) => {
    return res.json({ admins: Array.from(db.adminUsers.values()) });
  });

  app.post('/api/admin/staff/create', (req, res) => {
    const { username, email, role, adminUsername } = req.body;
    const newId = `admin-0${db.adminUsers.size + 1}`;
    const staff = {
      id: newId,
      username,
      email,
      role: (role as AdminRole) || 'operator',
      status: 'active' as const,
      permissions: {
        users: true,
        payments: role === 'admin' || role === 'super_admin' || role === 'manager',
        games: true,
        resultControl: role === 'super_admin' || role === 'admin',
        reports: role !== 'operator',
        promotions: role === 'super_admin',
        system: role === 'super_admin',
      },
      lastLogin: 'Never',
      createdAt: new Date().toISOString(),
    };
    db.adminUsers.set(newId, staff);
    logAdminAction(adminUsername || 'SuperAdmin', 'Create Staff', `Created staff account ${username} (${role})`, undefined, undefined, undefined, req);
    return res.json({ success: true, staff });
  });

  app.get('/api/admin/activity-logs', (req, res) => {
    return res.json({ logs: db.activityLogs });
  });

  // System & Platform Settings
  app.get('/api/platform/settings', (req, res) => {
    return res.json(db.platformSettings);
  });

  app.get('/api/admin/system/settings', (req, res) => {
    return res.json(db.platformSettings);
  });

  app.post('/api/admin/system/settings/update', (req, res) => {
    const { adminUsername, ...updated } = req.body;
    db.platformSettings = {
      ...db.platformSettings,
      ...updated,
    };
    db.saveToDisk();
    logAdminAction(adminUsername || 'SuperAdmin', 'Update Platform Settings', `Updated merchant and system settings`, undefined, undefined, undefined, req);
    return res.json({ success: true, settings: db.platformSettings });
  });

  // Auto Result Rules API
  app.get('/api/admin/auto-rules', (req, res) => {
    return res.json({ rules: (db as any).autoResultRules || [
      { id: '1', maxAmount: 50000, mode: 'lowest_bets' },
      { id: '2', maxAmount: 100000, mode: 'house_best' },
    ]});
  });

  app.post('/api/admin/auto-rules', (req, res) => {
    const { rules, adminUsername } = req.body;
    if (Array.isArray(rules)) {
      (db as any).autoResultRules = rules;
      db.saveToDisk();
      logAdminAction(adminUsername || 'SuperAdmin', 'Update Auto Rules', `Updated automated game result payout rules`, undefined, undefined, undefined, req);
    }
    return res.json({ success: true, rules: (db as any).autoResultRules });
  });

  // ===================== 1. BIG / SMALL CHAT PREDICTION APIS =====================
  // Robust time string parser (supports 12-hour AM/PM and 24-hour formats)
  const parseTimeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;
    const str = String(timeStr).trim().toUpperCase();
    const isPM = str.includes('PM');
    const isAM = str.includes('AM');
    const cleanStr = str.replace(/[APM\s]/g, '');
    const parts = cleanStr.split(':').map(p => parseInt(p, 10));
    let hours = parts[0] || 0;
    const minutes = parts[1] || 0;
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Helper to check if a prediction session is currently active by date, time window, and gameType
  const isSessionCurrentlyActive = (session: any, checkGameType?: string): boolean => {
    if (!session || session.status !== 'active') return false;
    if (checkGameType && session.targetGame && session.targetGame !== checkGameType) return false;
    try {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = String(now.getMonth() + 1).padStart(2, '0');
      const curDay = String(now.getDate()).padStart(2, '0');
      const curDateStr = `${curYear}-${curMonth}-${curDay}`;

      const startDate = session.startDate || '2000-01-01';
      const endDate = session.endDate || '2099-12-31';

      // Check date range
      if (curDateStr < startDate || curDateStr > endDate) return false;

      // Check time range
      if (session.startTime && session.endTime) {
        const curMinutes = now.getHours() * 60 + now.getMinutes();
        const startMin = parseTimeToMinutes(session.startTime);
        const endMin = parseTimeToMinutes(session.endTime);

        if (startMin <= endMin) {
          if (curMinutes < startMin || curMinutes > endMin) return false;
        } else {
          // Overnight window
          if (curMinutes < startMin && curMinutes > endMin) return false;
        }
      }
      return true;
    } catch {
      return session.status === 'active';
    }
  };

  // Admin: Get all prediction sessions & active status
  app.get('/api/admin/predictions/sessions', (req, res) => {
    try {
      const sessions = db.bigSmallSessions || [];
      const requestedGame = (req.query.game as string) || 'wingo_30s';
      
      // Match active session for requested game, or any matching session, or fallback
      const matchingActive = sessions.find(s => s.status === 'active' && s.targetGame === requestedGame);
      const matchingAny = sessions.find(s => s.targetGame === requestedGame);
      const anyActive = sessions.find(s => s.status === 'active');
      const activeSession = matchingActive || matchingAny || anyActive || sessions[0] || null;

      // Build live periods map for all 4 games: 30s, 1m, 3m, 5m
      const gameTypesList: GameType[] = ['wingo_30s', 'wingo_1m', 'wingo_3m', 'wingo_5m'];
      const allGamePeriods: Record<string, { currentPeriodId: string; lastPeriodNumber: string; lastDigit: number; historyCount: number }> = {};

      gameTypesList.forEach(gt => {
        const cur = db.currentPeriods.get(gt);
        const hist = db.resultsHistory.get(gt) || [];
        const lastP = hist[0];
        allGamePeriods[gt] = {
          currentPeriodId: cur?.periodId || '',
          lastPeriodNumber: lastP?.periodId || cur?.periodId || '2026083110500',
          lastDigit: typeof lastP?.resultNumber === 'number' ? lastP.resultNumber : (parseInt((lastP?.periodId || '0').slice(-1), 10) || 5),
          historyCount: hist.length,
        };
      });

      // Target game status
      const targetStatus = allGamePeriods[requestedGame] || allGamePeriods['wingo_30s'];

      return res.json({
        success: true,
        sessions,
        activeSession,
        allGamePeriods,
        liveStatus: targetStatus,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create or Update Prediction Session (with 10 rounds & target periods)
  app.post('/api/admin/predictions/sessions', (req, res) => {
    try {
      const {
        id,
        sessionName,
        startDate,
        startTime,
        endDate,
        endTime,
        targetGame = 'wingo_30s',
        referenceStartingPeriod,
        status,
        totalRounds = 10,
        autoStart = true,
        autoContinue = true,
        rounds,
        adminUsername,
      } = req.body;

      if (!sessionName) {
        return res.status(400).json({ error: 'Session Name is required' });
      }

      // Default 10 rounds matching the screenshot exactly
      const defaultPreds: ('BIG' | 'SMALL')[] = ['BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL', 'BIG', 'SMALL'];
      const defaultColors: ('GREEN' | 'RED' | 'VIOLET')[] = ['GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN', 'GREEN'];
      const defaultNumbers = ['5, 7, 9', '1, 3', '5, 7, 9', '1, 3', '5, 7, 9', '1, 3', '5, 7, 9', '1, 3', '5, 7, 9', '1, 3'];
      const defaultMessages = [
        'Big chance',
        'Small chance',
        'Big confirmed',
        'Small chance',
        'Big high probability',
        'Small chance',
        'Big confirmed',
        'Small chance',
        'Big jackpot chance',
        'Small chance',
      ];
      const defaultAccuracy: ('win' | 'miss')[] = ['win', 'win', 'miss', 'win', 'win', 'miss', 'win', 'miss', 'win', 'miss']; // 6 Correct / 4 Wrong

      let formattedRounds = Array.isArray(rounds) ? rounds : [];
      if (formattedRounds.length < 10) {
        const basePeriodNum = referenceStartingPeriod ? parseInt(referenceStartingPeriod, 10) : 2026083113149;
        formattedRounds = defaultPreds.map((pred, idx) => ({
          round: idx + 1,
          targetPeriod: String(basePeriodNum + idx + 1),
          previousLastDigit: idx % 10,
          prediction: pred,
          color: defaultColors[idx],
          numbers: defaultNumbers[idx],
          message: defaultMessages[idx],
          accuracy: defaultAccuracy[idx],
        }));
      } else {
        // Sanitize 10 rounds
        formattedRounds = formattedRounds.slice(0, 10).map((r: any, idx: number) => ({
          round: idx + 1,
          targetPeriod: String(r.targetPeriod || (referenceStartingPeriod ? (parseInt(referenceStartingPeriod, 10) + idx + 1) : `20260831131${50 + idx}`)),
          previousLastDigit: Number(r.previousLastDigit ?? (idx % 10)),
          prediction: (String(r.prediction).toUpperCase() === 'SMALL') ? 'SMALL' : 'BIG',
          color: (['RED', 'VIOLET', 'GREEN'].includes(String(r.color).toUpperCase()) ? String(r.color).toUpperCase() : 'GREEN') as 'GREEN' | 'RED' | 'VIOLET',
          numbers: String(r.numbers || (r.prediction === 'BIG' ? '5, 7, 9' : '1, 3')).trim(),
          message: String(r.message || defaultMessages[idx] || (r.prediction === 'SMALL' ? 'Small chance' : 'Big chance')).trim(),
          accuracy: (r.accuracy === 'miss' ? 'miss' : 'win') as 'win' | 'miss',
        }));
      }

      let existingIndex = -1;
      if (id) {
        existingIndex = (db.bigSmallSessions || []).findIndex(s => s.id === id);
      }

      const sessionObj = {
        id: id || `pred-session-${Date.now()}`,
        sessionName: String(sessionName).trim(),
        startDate: startDate || new Date().toISOString().slice(0, 10),
        startTime: startTime || '09:01 PM',
        endDate: endDate || new Date().toISOString().slice(0, 10),
        endTime: endTime || '09:31 PM',
        targetGame: targetGame || 'wingo_30s',
        referenceStartingPeriod: referenceStartingPeriod || '2026083113149',
        status: (status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
        totalRounds: 10,
        autoStart: autoStart !== false,
        autoContinue: autoContinue !== false,
        rounds: formattedRounds,
        createdAt: existingIndex >= 0 ? db.bigSmallSessions[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (!db.bigSmallSessions) db.bigSmallSessions = [];

      // If this session is active, set other sessions to inactive
      if (sessionObj.status === 'active') {
        db.bigSmallSessions.forEach(s => {
          if (s.id !== sessionObj.id) s.status = 'inactive';
        });
      }

      if (existingIndex >= 0) {
        db.bigSmallSessions[existingIndex] = sessionObj;
      } else {
        db.bigSmallSessions.unshift(sessionObj);
      }

      db.saveToDisk();
      logAdminAction(
        adminUsername || 'SuperAdmin',
        'Save Prediction Session',
        `Saved 10-round Prediction Session "${sessionObj.sessionName}"`,
        undefined,
        undefined,
        undefined,
        req
      );

      return res.json({ success: true, session: sessionObj, message: 'Prediction session saved successfully' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete a prediction session
  app.delete('/api/admin/predictions/sessions/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { adminUsername } = req.body || {};
      if (!db.bigSmallSessions) db.bigSmallSessions = [];

      const session = db.bigSmallSessions.find(s => s.id === id);
      db.bigSmallSessions = db.bigSmallSessions.filter(s => s.id !== id);
      db.saveToDisk();

      logAdminAction(
        adminUsername || 'SuperAdmin',
        'Delete Prediction Session',
        `Deleted Prediction Session ${session?.sessionName || id}`,
        undefined,
        undefined,
        undefined,
        req
      );

      return res.json({ success: true, message: 'Prediction session deleted' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // User Side: Clean Big/Small Prediction Chat API (STRICT PRIVACY - NO NEXT DIGIT, NO CURRENT RESULT, NO INTERNAL RULES)
  app.get('/api/user/prediction-chat', (req, res) => {
    try {
      const sessions = db.bigSmallSessions || [];
      const userGame = (req.query.game as string) || 'wingo_30s';
      
      // Find active session matching requested game type
      const matchingSession = sessions.find(s => s.status === 'active' && (!s.targetGame || s.targetGame === userGame));
      const fallbackSession = sessions.find(s => s.status === 'active') || sessions[0];
      const activeSession = matchingSession || fallbackSession;

      if (!activeSession) {
        return res.json({
          success: true,
          active: false,
          targetGame: userGame,
          message: 'No active prediction session configured right now.',
        });
      }

      // Check if session is active for the current time AND this exact game type
      const isGameMatch = !activeSession.targetGame || activeSession.targetGame === userGame;
      const isTimeActive = isSessionCurrentlyActive(activeSession, userGame);
      const isActiveNow = isGameMatch && isTimeActive;

      // 1. Fetch latest completed period & last digit from game engine results for this game
      const gameType = (userGame || activeSession.targetGame || 'wingo_30s') as GameType;
      const history = db.resultsHistory.get(gameType) || db.resultsHistory.get('wingo_30s') || [];
      const currentPeriodObj = db.currentPeriods.get(gameType);
      const latestPeriod = history[0];

      let lastPeriodNumber = currentPeriodObj?.periodId || '2026083113149';
      let lastDigit = 5;

      if (latestPeriod) {
        lastPeriodNumber = latestPeriod.periodId;
        lastDigit = typeof latestPeriod.resultNumber === 'number'
          ? latestPeriod.resultNumber
          : (parseInt(latestPeriod.periodId.slice(-1), 10) || 5);
      }

      // 2. Find target round by matching current period or next period
      const rounds = activeSession.rounds || [];
      const curPeriodId = currentPeriodObj?.periodId;
      
      let matchedRound = rounds.find((r: any) => r.targetPeriod === curPeriodId);

      if (!matchedRound) {
        matchedRound = rounds.find((r: any) => Number(r.previousLastDigit) === lastDigit);
      }

      if (!matchedRound && rounds.length > 0) {
        const roundIdx = lastDigit % rounds.length;
        matchedRound = rounds[roundIdx] || rounds[0];
      }

      const prediction = matchedRound?.prediction || (lastDigit >= 5 ? 'BIG' : 'SMALL');
      const color = matchedRound?.color || 'GREEN';
      const numbers = matchedRound?.numbers || (prediction === 'BIG' ? '5, 7, 9' : '1, 3');
      const roundMsg = matchedRound?.message || (prediction === 'BIG' ? 'Big chance' : 'Small chance');
      const roundNum = matchedRound?.round || 1;
      const targetPeriod = matchedRound?.targetPeriod || curPeriodId || `${parseInt(lastPeriodNumber, 10) + 1}`;

      // Calculate accuracy stats
      const correctCount = rounds.filter((r: any) => r.accuracy !== 'miss').length;
      const wrongCount = rounds.length - correctCount;

      // Format clean time
      const now = new Date();
      const timeFormatted = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const sessionTimeStr = `${activeSession.startTime || '09:01 PM'} - ${activeSession.endTime || '09:31 PM'}`;

      // Build history of past completed prediction rounds
      const pastPredictions = rounds.map((r: any) => {
        const foundResult = history.find(h => h.periodId === r.targetPeriod);
        return {
          round: r.round,
          targetPeriod: r.targetPeriod,
          prediction: r.prediction,
          color: r.color,
          numbers: r.numbers,
          message: r.message,
          resultNumber: foundResult ? foundResult.resultNumber : null,
          resultColor: foundResult ? foundResult.resultColor : null,
          resultBigSmall: foundResult ? foundResult.resultBigSmall : null,
          isCompleted: Boolean(foundResult),
          isWin: foundResult ? (r.accuracy !== 'miss') : null,
        };
      });

      // Strictly return ONLY User-Safe fields
      return res.json({
        success: true,
        active: isActiveNow,
        targetGame: activeSession.targetGame || 'wingo_30s',
        sessionName: activeSession.sessionName || 'Official VIP Big/Small Prediction',
        targetPeriod,
        lastPeriodNumber,
        lastDigit,
        prediction, // "BIG" or "SMALL"
        color, // "GREEN" | "RED" | "VIOLET"
        numbers, // "5, 7, 9"
        predictionTime: timeFormatted,
        sessionTime: sessionTimeStr,
        message: roundMsg,
        round: roundNum,
        totalRounds: 10,
        accuracyStats: {
          correct: correctCount,
          wrong: wrongCount,
        },
        pastPredictions,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ===================== 2. GIFT CODE APIS =====================
  // Admin: Get all gift codes & stats
  app.get('/api/admin/gift-codes', async (req, res) => {
    try {
      if (!db.giftCodes) db.giftCodes = [];

      // Hydrate from Cloud Firestore if memory is fresh or empty
      try {
        const cloudCodes = await loadAllGiftCodesFromFirestore();
        if (cloudCodes && cloudCodes.length > 0) {
          const existingMap = new Map(db.giftCodes.map(g => [String(g.code).trim().toUpperCase(), g]));
          cloudCodes.forEach(cg => {
            const key = String(cg.code).trim().toUpperCase();
            if (!existingMap.has(key)) {
              db.giftCodes.push(cg);
              existingMap.set(key, cg);
            } else {
              // Merge preserving latest claim counts
              const existing = existingMap.get(key);
              if ((cg.claimedUsers?.length || 0) >= (existing?.claimedUsers?.length || 0)) {
                Object.assign(existing, cg);
              }
            }
          });
        }
      } catch (e) {
        // Continue with memory
      }

      const giftCodes = db.giftCodes || [];
      const totalCodes = giftCodes.length;
      const activeCodes = giftCodes.filter(g => g.status === 'active').length;
      const totalRedeemed = giftCodes.reduce((sum, g) => sum + (g.usedCount || (g.claimedUsers?.length || 0)), 0);
      const totalDistributed = giftCodes.reduce((sum, g) => {
        const claims = g.claimedUsers || [];
        return sum + claims.reduce((cSum, c) => cSum + (c.amount || g.rewardAmount || 0), 0);
      }, 0);

      return res.json({
        success: true,
        giftCodes,
        stats: { totalCodes, activeCodes, totalRedeemed, totalDistributed }
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Create new gift code with permanent Cloud Firestore persistence
  app.post('/api/admin/gift-codes', async (req, res) => {
    try {
      const { code, title, rewardAmount, totalLimit, minVipLevel, minTotalDeposit, expiresAt, status, createdBy, adminUsername } = req.body;
      if (!code) return res.status(400).json({ error: 'Gift code string is required' });

      const formattedCode = String(code).trim().toUpperCase();
      const amount = Number(rewardAmount);
      if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Reward amount must be greater than 0' });

      if (!db.giftCodes) db.giftCodes = [];
      const existing = db.giftCodes.find(g => String(g.code).trim().toUpperCase() === formattedCode);
      if (existing) return res.status(400).json({ error: `Gift code "${formattedCode}" already exists.` });

      const newGiftCode = {
        id: `gift-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: formattedCode,
        title: title || `Promotion Gift ₹${amount}`,
        rewardAmount: amount,
        totalLimit: Number(totalLimit) || 0,
        usedCount: 0,
        claimedUsers: [],
        minVipLevel: Number(minVipLevel) || 0,
        minTotalDeposit: Number(minTotalDeposit) || 0,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        status: status || 'active',
        createdAt: new Date().toISOString(),
        createdBy: createdBy || adminUsername || 'Admin',
      };

      // Add to local database
      db.giftCodes.unshift(newGiftCode);
      db.saveToDisk();

      // Save permanently to Cloud Firestore
      await saveGiftCodePermanently(newGiftCode);

      logAdminAction(
        adminUsername || 'SuperAdmin',
        'Create Gift Code',
        `Created gift code "${formattedCode}" with reward ₹${amount}`,
        undefined,
        undefined,
        undefined,
        req
      );

      return res.json({ success: true, giftCode: newGiftCode, message: `Gift code "${formattedCode}" created and permanently saved!` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Admin: Delete gift code permanently
  app.delete('/api/admin/gift-codes/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { adminUsername } = req.body || {};
      if (!db.giftCodes) db.giftCodes = [];

      const target = db.giftCodes.find(g => g.id === id || String(g.code).trim().toUpperCase() === String(id).trim().toUpperCase());
      const targetCode = target?.code || id;
      db.giftCodes = db.giftCodes.filter(g => g.id !== id && String(g.code).trim().toUpperCase() !== String(id).trim().toUpperCase());
      db.saveToDisk();

      // Delete from Firestore permanently
      await deleteGiftCodePermanently(targetCode, id);

      logAdminAction(
        adminUsername || 'SuperAdmin',
        'Delete Gift Code',
        `Deleted gift code "${targetCode}"`,
        undefined,
        undefined,
        undefined,
        req
      );

      return res.json({ success: true, message: `Gift code "${targetCode}" removed successfully.` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // User: Redeem Gift Code (Instant Wallet Credit & Permanent Cloud Sync)
  app.post('/api/user/redeem-gift', async (req, res) => {
    try {
      const { code, uid, token } = req.body;
      const rawUserId = uid || (req.headers['x-user-id'] as string) || (req.headers['x-user-uid'] as string);
      const sessionToken = token || (req.headers['x-session-token'] as string) || (req.headers['authorization'] as string)?.replace('Bearer ', '');

      if (!code || !String(code).trim()) {
        return res.status(400).json({ error: 'Please enter a valid gift code.' });
      }

      // Robust User Authentication & Resolution
      let user: any = null;
      if (rawUserId) {
        user = db.users.get(String(rawUserId)) || db.getUser(String(rawUserId));
        if (!user) user = await db.getUserAsync(String(rawUserId));
      }
      if (!user && sessionToken) {
        user = Array.from(db.users.values()).find((u: any) => u.activeSessionId === sessionToken);
        if (!user && sessionToken.startsWith('SESSION-')) {
          const extractedUid = sessionToken.split('-')[1];
          if (extractedUid) {
            user = db.users.get(extractedUid) || db.getUser(extractedUid);
          }
        }
      }
      if (!user && rawUserId) {
        const cloudUser = await findUserInFirestore(String(rawUserId));
        if (cloudUser) {
          const cleanUid = String(cloudUser.uid || cloudUser.id).replace(/^u-/, '');
          db.users.set(cleanUid, cloudUser as any);
          user = cloudUser as any;
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Please log in to redeem your gift code.' });
      }

      // Format code for case-insensitive matching
      const formattedCode = String(code).trim().toUpperCase();
      if (!db.giftCodes) db.giftCodes = [];
      let giftCode = db.giftCodes.find(g => String(g.code).trim().toUpperCase() === formattedCode);

      // If not in RAM, query Cloud Firestore directly
      if (!giftCode) {
        const cloudCode = await findGiftCodeInFirestore(formattedCode);
        if (cloudCode) {
          giftCode = cloudCode;
          db.giftCodes.unshift(cloudCode);
        }
      }

      if (!giftCode) {
        return res.status(404).json({ error: `Gift code "${formattedCode}" not found. Please check spelling.` });
      }

      // Validate Status & Expiry
      if (giftCode.status !== 'active') {
        return res.status(400).json({ error: 'This gift code is no longer active.' });
      }
      if (giftCode.expiresAt && Date.now() > new Date(giftCode.expiresAt).getTime()) {
        giftCode.status = 'expired';
        db.saveToDisk();
        await saveGiftCodePermanently(giftCode);
        return res.status(400).json({ error: 'This gift code has expired.' });
      }
      if (giftCode.totalLimit > 0 && (giftCode.usedCount || 0) >= giftCode.totalLimit) {
        giftCode.status = 'exhausted';
        db.saveToDisk();
        await saveGiftCodePermanently(giftCode);
        return res.status(400).json({ error: 'This gift code has reached its maximum claim limit.' });
      }

      // Check VIP requirement
      if (giftCode.minVipLevel && (user.vipLevel || 0) < giftCode.minVipLevel) {
        return res.status(400).json({ error: `This gift code requires VIP level ${giftCode.minVipLevel} or higher.` });
      }

      // Check Deposit requirement
      if (giftCode.minTotalDeposit && (user.totalDeposit || 0) < giftCode.minTotalDeposit) {
        return res.status(400).json({ error: `This gift code requires minimum total deposit of ₹${giftCode.minTotalDeposit}.` });
      }

      // Prevent duplicate claims by the same user
      if (!giftCode.claimedUsers) giftCode.claimedUsers = [];
      const userUidClean = String(user.uid || user.id || '').replace(/^u-/, '');
      const alreadyClaimed = giftCode.claimedUsers.some((c: any) => {
        const cUidClean = String(c.userId || '').replace(/^u-/, '');
        return cUidClean === userUidClean || (user.phone && c.userPhone === user.phone);
      });

      if (alreadyClaimed) {
        return res.status(400).json({ error: 'You have already claimed this gift code!' });
      }

      // Credit User Wallet
      const reward = Number(giftCode.rewardAmount);
      const prevBal = Number(user.walletBalance || 0);
      user.walletBalance = Number((prevBal + reward).toFixed(2));
      // Claimed bonus adds 1X rolling requirement
      user.requiredRolling = Number(((user.requiredRolling || 0) + reward).toFixed(2));
      user.remainingRolling = Number((Math.max(0, user.remainingRolling || 0) + reward).toFixed(2));
      user.requiredTurnover = user.requiredRolling;
      user.remainingTurnover = user.remainingRolling;

      // Record Claim
      const claimRecord = {
        userId: user.uid || user.id,
        username: user.username || user.phone || 'Player',
        userPhone: user.phone || '',
        amount: reward,
        claimedAt: new Date().toISOString(),
        ip: req.ip || '',
      };
      giftCode.claimedUsers.unshift(claimRecord);
      giftCode.usedCount = (giftCode.usedCount || 0) + 1;
      if (giftCode.totalLimit > 0 && giftCode.usedCount >= giftCode.totalLimit) {
        giftCode.status = 'exhausted';
      }

      // Create Completed Transaction Log
      const txRecord = {
        id: `TX-GIFT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        uid: user.uid || user.id,
        type: 'bonus' as any,
        amount: reward,
        previousBalance: prevBal,
        newBalance: user.walletBalance,
        description: `🎁 Gift Code Bonus: ${giftCode.code}`,
        reference: `Gift ${giftCode.code}`,
        status: 'completed' as any,
        createdBy: 'system',
        note: `Redeemed promo code ${giftCode.code} for ₹${reward}`,
        createdAt: new Date().toISOString(),
      };
      if (!db.transactions) db.transactions = [];
      db.transactions.unshift(txRecord);

      // Persist to Disk and permanently to Cloud Firestore
      db.saveToDisk();
      await saveUserPermanently(user);
      await saveGiftCodePermanently(giftCode);
      await saveTransactionPermanently(txRecord);

      console.log(`[Gift Code] User ${user.phone || user.uid} claimed ${giftCode.code} for ₹${reward}. New balance: ₹${user.walletBalance}`);

      return res.json({
        success: true,
        message: `🎉 ₹${reward} bonus credited to your wallet!`,
        amount: reward,
        newBalance: user.walletBalance,
        giftCode: giftCode.code,
      });
    } catch (err: any) {
      console.error('Error redeeming gift code:', err);
      return res.status(500).json({ error: err.message || 'Internal error while claiming gift code.' });
    }
  });

  // Cloud Sync & Backup Status APIs
  app.get('/api/admin/cloud-status', (req, res) => {
    return res.json({
      cloudPersistent: true,
      provider: 'Firebase Firestore',
      totalUsers: db.users.size,
      totalDeposits: db.deposits.length,
      totalWithdrawals: db.withdrawals.length,
      lastSync: new Date().toISOString(),
    });
  });

  app.post('/api/admin/cloud-sync', async (req, res) => {
    try {
      await syncDataToFirestore(db);
      return res.json({ success: true, message: 'Cloud database synced to Firebase successfully.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Sync failed' });
    }
  });

  app.post('/api/admin/cloud-restore', async (req, res) => {
    try {
      const ok = await loadDataFromFirestore(db);
      return res.json({ success: ok, message: ok ? 'Restored all data from Firebase Cloud.' : 'Cloud load encountered an issue.' });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Restore failed' });
    }
  });

  // ===================== CHESS MULTIPLAYER & BOT APIS =====================
  app.post('/api/chess/room/create', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in to create a room' });

    const { entryAmount = 0, preferredColor = 'random' } = req.body;

    const user = db.getUser(uid);
    if (user && Number(entryAmount) > 0) {
      const betCheck = db.isBettingAllowedForUser(user);
      if (!betCheck.allowed) {
        return res.status(403).json({
          error: betCheck.message,
          requiresDeposit: true,
          minDepositRequired: betCheck.minDepositRequired || 100,
          currentDeposit: betCheck.currentDeposit || 0,
        });
      }
    }

    const result = gameManager.createRoom(uid, Number(entryAmount), preferredColor);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, match: result.match, roomCode: result.roomCode });
  });

  app.post('/api/chess/room/join', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in to join a room' });

    const { roomCode } = req.body;
    if (!roomCode) return res.status(400).json({ error: 'Room Code is required' });

    const result = gameManager.joinRoom(uid, String(roomCode));
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, match: result.match });
  });

  app.post('/api/chess/room/cancel', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in' });

    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required' });

    const result = gameManager.cancelRoom(matchId, uid);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true });
  });

  app.post('/api/chess/match/create', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in to play Chess' });

    const { entryAmount = 0, botDifficulty = 'medium', preferredColor = 'random' } = req.body;

    const user = db.getUser(uid);
    if (user && Number(entryAmount) > 0) {
      const betCheck = db.isBettingAllowedForUser(user);
      if (!betCheck.allowed) {
        return res.status(403).json({
          error: betCheck.message,
          requiresDeposit: true,
          minDepositRequired: betCheck.minDepositRequired || 100,
          currentDeposit: betCheck.currentDeposit || 0,
        });
      }
    }

    const result = gameManager.createMatch(uid, Number(entryAmount), botDifficulty, preferredColor);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, match: result.match });
  });

  app.get('/api/chess/match/:id', (req, res) => {
    const { id } = req.params;
    const match = gameManager.getMatch(id);
    if (!match) return res.status(404).json({ error: 'Match not found' });
    return res.json({ success: true, match });
  });

  app.post('/api/chess/match/:id/move', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in to play' });

    const { id } = req.params;
    const { from, to, promotion } = req.body;

    if (!from || !to) return res.status(400).json({ error: 'Invalid move parameters' });

    const result = gameManager.makeMove(id, uid, from, to, promotion);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, match: result.match, move: result.move });
  });

  app.post('/api/chess/match/:id/resign', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || req.body.uid;
    if (!uid) return res.status(401).json({ error: 'Please log in' });

    const { id } = req.params;
    const result = gameManager.resignMatch(id, uid);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ success: true, match: result.match });
  });

  app.get('/api/chess/user-history', (req, res) => {
    const uid = (req.headers['x-user-uid'] as string) || (req.query.uid as string);
    if (!uid) return res.json({ matches: [] });

    const matches = gameManager.getUserMatches(uid);
    return res.json({ matches });
  });

  // Favicon handler to guarantee no 404 console errors
  app.get('/favicon.ico', (req, res) => {
    const iconPath = path.join(process.cwd(), 'public', 'favicon.svg');
    if (fs.existsSync(iconPath)) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.sendFile(iconPath);
    }
    return res.status(204).end();
  });

  // Ensure unmatched /api routes return 404 JSON instead of falling through to Vite HTML
  app.all('/api/*', (req, res) => {
    return res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // ===================== VITE & STATIC SERVING =====================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Load cloud data on startup asynchronously
  loadDataFromFirestore(db).then(loaded => {
    if (loaded) {
      console.log('Firebase Cloud Firestore: Permanent database data loaded and verified.');
    }
  }).catch(e => {
    console.warn('Initial cloud load notice:', e?.message || e);
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Wingo Server running on http://localhost:${PORT}`);
  });
}

startServer();
