import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  limit,
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';

// Silence internal Firebase Firestore SDK warning messages
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Active Firestore configuration for permanent cloud storage
const ACTIVE_PROJECT_CONFIG = {
  projectId: "temporal-palace-qr7h4",
  appId: "1:831206456946:web:6c53265c477bc4bcc38ceb",
  apiKey: "AIzaSyChcCLdnS4Oe0isJCYO3o5AMI2HKq8KPGk",
  authDomain: "temporal-palace-qr7h4.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-arowclub-a3ff0ea2-96ba-4acd-9b05-d1859c1a2721",
  storageBucket: "temporal-palace-qr7h4.firebasestorage.app",
  messagingSenderId: "831206456946",
  oAuthClientId: "831206456946-2trsr5ta23dsof3gembbls9nrokseg3l.apps.googleusercontent.com",
};

let firebaseConfig: any = { ...ACTIVE_PROJECT_CONFIG };
let firestoreDb: any = null;

try {
  const candidatePaths = [
    path.join(process.cwd(), 'firebase-applet-config.json'),
    path.join(process.cwd(), 'dist', 'firebase-applet-config.json'),
  ];
  if (typeof __dirname !== 'undefined') {
    candidatePaths.push(
      path.join(__dirname, 'firebase-applet-config.json'),
      path.join(__dirname, '..', 'firebase-applet-config.json')
    );
  }

  for (const configPath of candidatePaths) {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      firebaseConfig = { ...ACTIVE_PROJECT_CONFIG, ...parsed };
      if (parsed.firestoreDatabaseId) {
        firebaseConfig.firestoreDatabaseId = parsed.firestoreDatabaseId;
      }
      break;
    }
  }
} catch {
  // Use embedded config
}

export function getFirestoreInstance() {
  if (firestoreDb) return firestoreDb;
  if (!firebaseConfig || !firebaseConfig.apiKey) {
    return null;
  }

  try {
    const app = getApps().length === 0 ? initializeApp({
      apiKey: firebaseConfig.apiKey,
      authDomain: firebaseConfig.authDomain,
      projectId: firebaseConfig.projectId,
      storageBucket: firebaseConfig.storageBucket,
      messagingSenderId: firebaseConfig.messagingSenderId,
      appId: firebaseConfig.appId,
    }) : getApp();

    const dbId = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
      ? firebaseConfig.firestoreDatabaseId 
      : undefined;

    try {
      firestoreDb = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      }, dbId);
    } catch {
      firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
    }
    
    return firestoreDb;
  } catch (err) {
    console.error('Failed to initialize Firestore:', err);
    return null;
  }
}

// Helper: Strip undefined and functions so Firestore setDoc never rejects with
// "Unsupported field value: undefined"
export function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const clean: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && typeof v !== 'function') {
      clean[k] = sanitizeForFirestore(v);
    }
  }
  return clean;
}

const COLLECTION_META = 'arowclub_meta';

// Helper: Guard against Firestore hang / retry backoff on quota or network limits
function withTimeout<T>(promise: Promise<T>, ms = 2000, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

// Save a user permanently to Cloud Firestore immediately
export async function saveUserPermanently(user: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !user) return false;
  const rawUid = user.uid || (user.id ? String(user.id).replace(/^u-/, '') : null);
  if (!rawUid) return false;

  try {
    const uidStr = String(rawUid);
    const sanitized = sanitizeForFirestore({
      ...user,
      uid: uidStr,
      id: user.id || `u-${uidStr}`,
      updatedAt: new Date().toISOString(),
    });
    const userDocRef = doc(fsInstance, 'users', uidStr);
    return await withTimeout(
      setDoc(userDocRef, sanitized, { merge: true }).then(() => true).catch(() => false),
      2000,
      false
    );
  } catch (err: any) {
    console.warn(`Firestore save user note for ${rawUid}:`, err?.message || err);
    return false;
  }
}

// Purged old test user IDs from initial system wipe (never purge by date/time)
export const PURGED_TEST_UIDS = new Set([
  '84770192', '86374551', '62680610', '60857942', '61737568', 
  '45415789', '49041047', '64531065', '42087686', '108429', '109552', '112890',
  '70772320', '19455588', '51262351'
]);

export function isUserPurged(u: any): boolean {
  if (!u) return true;
  const uid = String(u.uid || u.id || '').replace(/^u-/, '').trim();
  // Only explicitly blacklisted pre-wipe test user IDs are filtered; every valid registered user persists indefinitely
  if (PURGED_TEST_UIDS.has(uid)) return true;
  return false;
}

// Delete user permanently from Cloud Firestore (ONLY called when admin manually deletes user)
export async function deleteUserPermanently(uid: string): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !uid) return false;

  try {
    const uidStr = String(uid).replace(/^u-/, '');
    return await withTimeout(
      deleteDoc(doc(fsInstance, 'users', uidStr)).then(() => {
        console.log(`User ${uidStr} permanently deleted from Firestore by Admin action.`);
        return true;
      }).catch(() => false),
      2000,
      false
    );
  } catch (err: any) {
    console.warn(`Firestore delete user note for ${uid}:`, err?.message || err);
    return false;
  }
}

// Query Firestore for a user by UID, phone, username, or email when not found in memory
export async function findUserInFirestore(identifier: string): Promise<any | null> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !identifier) return null;

  const rawId = String(identifier).trim();
  const digitsOnly = rawId.replace(/\D/g, '');

  const runLookup = async (): Promise<any | null> => {
    try {
      // 1. Direct UID document lookup
      const uidClean = rawId.replace(/^u-/, '');
      if (PURGED_TEST_UIDS.has(uidClean)) return null;

      const directDocSnap = await getDoc(doc(fsInstance, 'users', uidClean));
      if (directDocSnap.exists()) {
        const data = directDocSnap.data();
        if (!isUserPurged(data)) {
          return data;
        }
        return null;
      }

      // 2. Scan users collection to match phone, username, or email
      const usersCol = collection(fsInstance, 'users');
      const snapshot = await getDocs(usersCol);
      if (!snapshot.empty) {
        for (const d of snapshot.docs) {
          const u = d.data() as any;
          if (!u || isUserPurged(u)) continue;
          const uUid = String(u.uid || '').trim();
          const uPhone = String(u.phone || '').trim();
          const uPhoneDigits = uPhone.replace(/\D/g, '');
          const uUsername = String(u.username || '').toLowerCase().trim();
          const uEmail = String(u.email || '').toLowerCase().trim();

          if (uUid === rawId || uUid === uidClean) return u;
          if (uUsername === rawId.toLowerCase()) return u;
          if (uEmail === rawId.toLowerCase()) return u;
          if (uPhone === rawId) return u;

          if (digitsOnly.length >= 7 && uPhoneDigits.length >= 7) {
            if (digitsOnly === uPhoneDigits) return u;
            if (digitsOnly.endsWith(uPhoneDigits) || uPhoneDigits.endsWith(digitsOnly)) return u;
            if (digitsOnly.length >= 10 && uPhoneDigits.length >= 10 && digitsOnly.slice(-10) === uPhoneDigits.slice(-10)) return u;
          }
        }
      }
    } catch (err: any) {
      console.warn('Firestore findUser lookup note:', err?.message || err);
    }
    return null;
  };

  return await withTimeout(runLookup(), 2000, null);
}

// Save transaction permanently
export async function saveTransactionPermanently(tx: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !tx || !tx.id) return false;
  try {
    const txRef = doc(fsInstance, 'transactions', String(tx.id));
    return await withTimeout(
      setDoc(txRef, sanitizeForFirestore(tx), { merge: true }).then(() => true).catch(() => false),
      1500,
      false
    );
  } catch (err) {
    return false;
  }
}

// Save bet permanently
export async function saveBetPermanently(bet: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !bet || !bet.id) return false;
  try {
    const betRef = doc(fsInstance, 'bets', String(bet.id));
    return await withTimeout(
      setDoc(betRef, sanitizeForFirestore(bet), { merge: true }).then(() => true).catch(() => false),
      1500,
      false
    );
  } catch (err) {
    return false;
  }
}

// Save deposit permanently
export async function saveDepositPermanently(dep: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !dep || !dep.id) return false;
  try {
    const depRef = doc(fsInstance, 'deposits', String(dep.id));
    return await withTimeout(
      setDoc(depRef, sanitizeForFirestore(dep), { merge: true }).then(() => true).catch(() => false),
      1500,
      false
    );
  } catch (err) {
    return false;
  }
}

// Save withdrawal permanently
export async function saveWithdrawalPermanently(w: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !w || !w.id) return false;
  try {
    const wRef = doc(fsInstance, 'withdrawals', String(w.id));
    return await withTimeout(
      setDoc(wRef, sanitizeForFirestore(w), { merge: true }).then(() => true).catch(() => false),
      1500,
      false
    );
  } catch (err) {
    return false;
  }
}

// Save Gift Code permanently to Cloud Firestore
export async function saveGiftCodePermanently(giftCode: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !giftCode) return false;
  const rawCode = giftCode.code ? String(giftCode.code).trim().toUpperCase() : null;
  if (!rawCode) return false;

  try {
    const sanitized = sanitizeForFirestore({
      id: giftCode.id || `gift-${Date.now()}`,
      code: rawCode,
      title: giftCode.title || `Gift Code ${rawCode}`,
      rewardAmount: Number(giftCode.rewardAmount) || 0,
      totalLimit: Number(giftCode.totalLimit) || 0,
      usedCount: Number(giftCode.usedCount) || (giftCode.claimedUsers?.length || 0),
      claimedUsers: giftCode.claimedUsers || [],
      minVipLevel: Number(giftCode.minVipLevel) || 0,
      minTotalDeposit: Number(giftCode.minTotalDeposit) || 0,
      expiresAt: giftCode.expiresAt || null,
      status: giftCode.status || 'active',
      createdAt: giftCode.createdAt || new Date().toISOString(),
      createdBy: giftCode.createdBy || 'Admin',
      updatedAt: new Date().toISOString(),
    });

    const codeDocRef = doc(fsInstance, 'gift_codes', rawCode);
    const savePromise = (async () => {
      await setDoc(codeDocRef, sanitized, { merge: true });
      if (giftCode.id && giftCode.id !== rawCode) {
        const idDocRef = doc(fsInstance, 'gift_codes', String(giftCode.id));
        await setDoc(idDocRef, sanitized, { merge: true });
      }
      return true;
    })();

    return await withTimeout(
      savePromise.catch(() => false),
      1500,
      false
    );
  } catch (err: any) {
    console.error(`Error saving gift code ${rawCode} to Firestore:`, err?.message || err);
    return false;
  }
}

// Delete Gift Code permanently from Cloud Firestore
export async function deleteGiftCodePermanently(code: string, id?: string): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return false;

  try {
    if (code) {
      const rawCode = String(code).trim().toUpperCase();
      await deleteDoc(doc(fsInstance, 'gift_codes', rawCode));
    }
    if (id) {
      await deleteDoc(doc(fsInstance, 'gift_codes', String(id)));
    }
    console.log(`[Firestore] Gift code deleted permanently: code=${code}, id=${id}`);
    return true;
  } catch (err: any) {
    console.error('Error deleting gift code from Firestore:', err?.message || err);
    return false;
  }
}

// Query Firestore for a Gift Code by code or ID
export async function findGiftCodeInFirestore(codeOrId: string): Promise<any | null> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !codeOrId) return null;

  const raw = String(codeOrId).trim().toUpperCase();

  try {
    // 1. Check direct document by code
    const directDoc = await getDoc(doc(fsInstance, 'gift_codes', raw));
    if (directDoc.exists()) {
      return directDoc.data();
    }

    // 2. Check if queried by id (e.g. gift-123456)
    const idDoc = await getDoc(doc(fsInstance, 'gift_codes', String(codeOrId).trim()));
    if (idDoc.exists()) {
      return idDoc.data();
    }

    // 3. Query collection to scan for matching code
    const giftCodesCol = collection(fsInstance, 'gift_codes');
    const snapshot = await getDocs(giftCodesCol);
    if (!snapshot.empty) {
      for (const d of snapshot.docs) {
        const item = d.data() as any;
        if (item && item.code && String(item.code).trim().toUpperCase() === raw) {
          return item;
        }
      }
    }
  } catch (err: any) {
    console.warn('Error querying gift code in Firestore:', err?.message || err);
  }

  return null;
}

// Load all Gift Codes from Cloud Firestore
export async function loadAllGiftCodesFromFirestore(): Promise<any[]> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return [];

  try {
    const giftCodesCol = collection(fsInstance, 'gift_codes');
    const snapshot = await getDocs(giftCodesCol);
    if (snapshot.empty) return [];

    const codesMap = new Map<string, any>();
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as any;
      if (data && data.code) {
        const key = String(data.code).trim().toUpperCase();
        // Keep the record with most recent data or largest claimed list
        const existing = codesMap.get(key);
        if (!existing || (data.claimedUsers?.length || 0) >= (existing.claimedUsers?.length || 0)) {
          codesMap.set(key, data);
        }
      }
    });

    return Array.from(codesMap.values());
  } catch (err: any) {
    console.warn('Notice loading gift codes from Firestore:', err?.message || err);
    return [];
  }
}

let isSyncing = false;
let debounceTimer: any = null;

// Debounced background sync for batch sync
export function queueFirestoreSync(dbInstance: any) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    syncDataToFirestore(dbInstance, false).catch(() => {});
  }, 2000);
}

export async function syncUserToFirestore(user: any) {
  return saveUserPermanently(user);
}

// Sync in-memory database to Firestore
export async function syncDataToFirestore(dbInstance: any, force = false) {
  if (isSyncing && !force) return;

  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return;

  isSyncing = true;

  try {
    const usersList = (dbInstance.getAllUniqueUsers ? dbInstance.getAllUniqueUsers() : Array.from(dbInstance.users.values())) as any[];
    
    // 1. Write platform settings document
    const metaDocRef = doc(fsInstance, COLLECTION_META, 'platform_settings');
    await setDoc(metaDocRef, sanitizeForFirestore({
      platformSettings: dbInstance.platformSettings || {},
      platformGameSettings: dbInstance.platformGameSettings || {},
      paymentMethods: dbInstance.paymentMethods || [],
      withdrawSettings: dbInstance.withdrawSettings || {},
      autoResultRules: dbInstance.autoResultRules || [],
      gameAutoModes: dbInstance.gameAutoModes || {},
      bonusCommissionSettings: dbInstance.bonusCommissionSettings || {},
      depositAmountBonusTiers: dbInstance.depositAmountBonusTiers || [],
      bonusTasksConfig: dbInstance.bonusTasksConfig || [],
      activityPromosConfig: dbInstance.activityPromosConfig || [],
      allGameControls: dbInstance.allGameControls || {},
      referralSystemSettings: dbInstance.referralSystemSettings || {},
      supportTickets: (dbInstance.supportTickets || []).slice(0, 50),
      adminUpiDetails: dbInstance.adminUpiDetails || {},
      adminBankDetails: dbInstance.adminBankDetails || {},
      giftCodes: (dbInstance.giftCodes || []).slice(0, 100),
      updatedAt: new Date().toISOString(),
    }), { merge: true });

    // 2. Write permanent gift codes to individual documents in 'gift_codes'
    if (dbInstance.giftCodes && Array.isArray(dbInstance.giftCodes)) {
      for (const g of dbInstance.giftCodes) {
        if (g && g.code) {
          await saveGiftCodePermanently(g);
        }
      }
    }

    // 3. Write individual user documents permanently for ALL users
    // Process in batches of 20 to avoid overwhelming network
    for (let i = 0; i < usersList.length; i += 20) {
      const chunk = usersList.slice(i, i + 20);
      await Promise.all(chunk.map(async (u) => {
        if (u && (u.uid || u.id)) {
          await saveUserPermanently(u);
        }
      }));
    }

    // 3. Write compact consolidated backup snapshot (capped to stay well below 1MB Firestore limit)
    const dataBackupRef = doc(fsInstance, COLLECTION_META, 'data_backup');
    await setDoc(dataBackupRef, sanitizeForFirestore({
      users: usersList.slice(0, 200),
      deposits: (dbInstance.deposits || []).slice(-100),
      withdrawals: (dbInstance.withdrawals || []).slice(-100),
      transactions: (dbInstance.transactions || []).slice(-150),
      bets: (dbInstance.bets || []).slice(-100),
      updatedAt: new Date().toISOString(),
    }), { merge: true });

    // 4. Write permanent Win Go results history to Firestore so it is preserved across domain transfers and remixes
    if (dbInstance.resultsHistory && dbInstance.resultsHistory.size > 0) {
      const wingoResultsRef = doc(fsInstance, COLLECTION_META, 'wingo_results');
      const wingoData: Record<string, any> = {};
      for (const [gt, history] of dbInstance.resultsHistory.entries()) {
        wingoData[gt] = (history || []).slice(0, 150);
      }
      await setDoc(wingoResultsRef, sanitizeForFirestore({
        results: wingoData,
        periodCounters: dbInstance.periodCounters || {},
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    }

  } catch (error: any) {
    console.warn('Firestore sync note:', error?.message || error);
  } finally {
    isSyncing = false;
  }
}

// Hydrate local database from Cloud Firestore on startup
export async function loadDataFromFirestore(dbInstance: any): Promise<number> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return 0;

  let loadedUserCount = 0;

  try {
    // 1. Fetch ALL users directly from the permanent 'users' collection
    try {
      const usersColRef = collection(fsInstance, 'users');
      const userDocsSnap = await getDocs(usersColRef);
      if (!userDocsSnap.empty) {
        userDocsSnap.forEach((docSnap) => {
          const u = docSnap.data() as any;
          if (u && (u.uid || u.id)) {
            if (isUserPurged(u)) {
              deleteDoc(docSnap.ref).catch(() => {});
              return;
            }
            const uidStr = String(u.uid || String(u.id).replace(/^u-/, ''));
            const existing = dbInstance.users.get(uidStr);
            if (!existing) {
              dbInstance.users.set(uidStr, u);
              loadedUserCount++;
            } else {
              // Merge preserving latest state
              dbInstance.users.set(uidStr, { ...existing, ...u });
            }
          }
        });
        console.log(`Loaded ${loadedUserCount} permanent user accounts from Firestore users collection.`);
      }
    } catch (userErr: any) {
      console.warn('Note reading users collection:', userErr?.message || userErr);
    }

    // 2. Load from backup doc if any supplementary records exist
    try {
      const backupRef = doc(fsInstance, COLLECTION_META, 'data_backup');
      const backupSnap = await getDoc(backupRef);

      if (backupSnap.exists()) {
        const data = backupSnap.data();
        if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
          data.users.forEach((u: any) => {
            if (u && (u.uid || u.id)) {
              if (isUserPurged(u)) return;
              const uidStr = String(u.uid || String(u.id).replace(/^u-/, ''));
              const existing = dbInstance.users.get(uidStr);
              if (!existing) {
                dbInstance.users.set(uidStr, u);
                loadedUserCount++;
              } else {
                dbInstance.users.set(uidStr, { ...existing, ...u });
              }
            }
          });
        }
        if (data?.deposits && Array.isArray(data.deposits)) {
          const existingIds = new Set(dbInstance.deposits.map((d: any) => d.id));
          data.deposits.forEach((d: any) => {
            if (!existingIds.has(d.id)) dbInstance.deposits.push(d);
          });
        }
        if (data?.withdrawals && Array.isArray(data.withdrawals)) {
          const existingIds = new Set(dbInstance.withdrawals.map((w: any) => w.id));
          data.withdrawals.forEach((w: any) => {
            if (!existingIds.has(w.id)) dbInstance.withdrawals.push(w);
          });
        }
        if (data?.transactions && Array.isArray(data.transactions)) {
          const existingIds = new Set(dbInstance.transactions.map((t: any) => t.id));
          data.transactions.forEach((t: any) => {
            if (!existingIds.has(t.id)) dbInstance.transactions.push(t);
          });
        }
        if (data?.bets && Array.isArray(data.bets)) {
          const existingIds = new Set(dbInstance.bets.map((b: any) => b.id));
          data.bets.forEach((b: any) => {
            if (!existingIds.has(b.id)) dbInstance.bets.push(b);
          });
        }
      }
    } catch {
      // ignore
    }

    // 3. Load platform meta settings
    try {
      const metaDocRef = doc(fsInstance, COLLECTION_META, 'platform_settings');
      const metaSnap = await getDoc(metaDocRef);
      if (metaSnap.exists()) {
        const meta = metaSnap.data();
        if (meta.platformSettings) {
          dbInstance.platformSettings = { ...dbInstance.platformSettings, ...meta.platformSettings, minDepositToBet: 0 };
          setDoc(metaDocRef, { ...meta, platformSettings: dbInstance.platformSettings }).catch(() => {});
        }
        if (meta.platformGameSettings) dbInstance.platformGameSettings = { ...dbInstance.platformGameSettings, ...meta.platformGameSettings };
        if (meta.paymentMethods && meta.paymentMethods.length > 0) dbInstance.paymentMethods = meta.paymentMethods;
        if (meta.withdrawSettings) dbInstance.withdrawSettings = { ...dbInstance.withdrawSettings, ...meta.withdrawSettings };
        if (meta.autoResultRules && meta.autoResultRules.length > 0) dbInstance.autoResultRules = meta.autoResultRules;
        if (meta.gameAutoModes) dbInstance.gameAutoModes = { ...dbInstance.gameAutoModes, ...meta.gameAutoModes };
        if (meta.bonusCommissionSettings) dbInstance.bonusCommissionSettings = { ...dbInstance.bonusCommissionSettings, ...meta.bonusCommissionSettings };
        if (meta.depositAmountBonusTiers && meta.depositAmountBonusTiers.length > 0) dbInstance.depositAmountBonusTiers = meta.depositAmountBonusTiers;
        if (meta.bonusTasksConfig && meta.bonusTasksConfig.length > 0) dbInstance.bonusTasksConfig = meta.bonusTasksConfig;
        if (meta.activityPromosConfig && meta.activityPromosConfig.length > 0) dbInstance.activityPromosConfig = meta.activityPromosConfig;
        if (meta.allGameControls) dbInstance.allGameControls = { ...dbInstance.allGameControls, ...meta.allGameControls };
        if (meta.referralSystemSettings) dbInstance.referralSystemSettings = { ...dbInstance.referralSystemSettings, ...meta.referralSystemSettings };
        if (meta.supportTickets && meta.supportTickets.length > 0) dbInstance.supportTickets = meta.supportTickets;
        if (meta.adminUpiDetails) dbInstance.adminUpiDetails = { ...dbInstance.adminUpiDetails, ...meta.adminUpiDetails };
        if (meta.adminBankDetails) dbInstance.adminBankDetails = { ...dbInstance.adminBankDetails, ...meta.adminBankDetails };
        if (meta.giftCodes && Array.isArray(meta.giftCodes) && meta.giftCodes.length > 0) {
          if (!dbInstance.giftCodes) dbInstance.giftCodes = [];
          const existingCodes = new Set(dbInstance.giftCodes.map((g: any) => String(g.code).trim().toUpperCase()));
          meta.giftCodes.forEach((g: any) => {
            if (g && g.code) {
              const codeUpper = String(g.code).trim().toUpperCase();
              if (!existingCodes.has(codeUpper)) {
                dbInstance.giftCodes.push(g);
                existingCodes.add(codeUpper);
              }
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // 4. Load from dedicated permanent 'gift_codes' collection
    try {
      const cloudGiftCodes = await loadAllGiftCodesFromFirestore();
      if (cloudGiftCodes && cloudGiftCodes.length > 0) {
        if (!dbInstance.giftCodes) dbInstance.giftCodes = [];
        const existingCodes = new Set(dbInstance.giftCodes.map((g: any) => String(g.code).trim().toUpperCase()));
        cloudGiftCodes.forEach((g: any) => {
          if (g && g.code) {
            const codeUpper = String(g.code).trim().toUpperCase();
            const idx = dbInstance.giftCodes.findIndex((existing: any) => String(existing.code).trim().toUpperCase() === codeUpper);
            if (idx >= 0) {
              // Merge preserving latest claim records
              dbInstance.giftCodes[idx] = { ...dbInstance.giftCodes[idx], ...g };
            } else {
              dbInstance.giftCodes.unshift(g);
              existingCodes.add(codeUpper);
            }
          }
        });
        console.log(`[Firestore] Hydrated ${cloudGiftCodes.length} permanent gift codes from Firestore.`);
      }
    } catch (giftErr: any) {
      console.warn('Notice loading gift codes collection:', giftErr?.message || giftErr);
    }

    // 5. Load permanent Win Go results history from Firestore
    try {
      const wingoResultsRef = doc(fsInstance, COLLECTION_META, 'wingo_results');
      const wingoSnap = await getDoc(wingoResultsRef);
      if (wingoSnap.exists()) {
        const wingoData = wingoSnap.data();
        if (wingoData?.results && typeof wingoData.results === 'object') {
          for (const [gt, history] of Object.entries(wingoData.results)) {
            if (Array.isArray(history) && history.length > 0) {
              const existing = dbInstance.resultsHistory.get(gt) || [];
              const existingIds = new Set(existing.map((p: any) => p.periodId));
              const merged = [...existing];
              (history as any[]).forEach((p: any) => {
                if (p && p.periodId && !existingIds.has(p.periodId)) {
                  merged.push(p);
                  existingIds.add(p.periodId);
                }
              });
              merged.sort((a: any, b: any) => String(b.periodId).localeCompare(String(a.periodId)));
              dbInstance.resultsHistory.set(gt as any, merged);
            }
          }
          if (wingoData?.periodCounters && typeof wingoData.periodCounters === 'object') {
            dbInstance.periodCounters = { ...dbInstance.periodCounters, ...wingoData.periodCounters };
          }
          console.log(`[Firestore] Hydrated Win Go results history from Firestore.`);
        }
      }
    } catch (wingoErr: any) {
      console.warn('Notice loading Win Go results from Firestore:', wingoErr?.message || wingoErr);
    }

    // 6. Load transactions from dedicated Firestore collection if any exist
    try {
      const txColRef = collection(fsInstance, 'transactions');
      const txSnap = await getDocs(query(txColRef, limit(300)));
      if (!txSnap.empty) {
        const existingIds = new Set(dbInstance.transactions.map((t: any) => t.id));
        txSnap.forEach((docSnap) => {
          const t = docSnap.data() as any;
          if (t && t.id && !existingIds.has(t.id)) {
            dbInstance.transactions.unshift(t);
            existingIds.add(t.id);
          }
        });
        dbInstance.transactions.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        console.log(`[Firestore] Hydrated ${txSnap.size} permanent transactions from Firestore.`);
      }
    } catch (txErr: any) {
      console.warn('Notice loading transactions from Firestore:', txErr?.message || txErr);
    }

    // 7. Load deposits from dedicated Firestore collection
    try {
      const depColRef = collection(fsInstance, 'deposits');
      const depSnap = await getDocs(query(depColRef, limit(300)));
      if (!depSnap.empty) {
        const existingIds = new Set(dbInstance.deposits.map((d: any) => d.id));
        depSnap.forEach((docSnap) => {
          const d = docSnap.data() as any;
          if (d && d.id && !existingIds.has(d.id)) {
            dbInstance.deposits.unshift(d);
            existingIds.add(d.id);
          }
        });
        dbInstance.deposits.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        console.log(`[Firestore] Hydrated ${depSnap.size} permanent deposits from Firestore.`);
      }
    } catch (depErr: any) {
      console.warn('Notice loading deposits from Firestore:', depErr?.message || depErr);
    }

    // 8. Load withdrawals from dedicated Firestore collection
    try {
      const wColRef = collection(fsInstance, 'withdrawals');
      const wSnap = await getDocs(query(wColRef, limit(300)));
      if (!wSnap.empty) {
        const existingIds = new Set(dbInstance.withdrawals.map((w: any) => w.id));
        wSnap.forEach((docSnap) => {
          const w = docSnap.data() as any;
          if (w && w.id && !existingIds.has(w.id)) {
            dbInstance.withdrawals.unshift(w);
            existingIds.add(w.id);
          }
        });
        dbInstance.withdrawals.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        console.log(`[Firestore] Hydrated ${wSnap.size} permanent withdrawals from Firestore.`);
      }
    } catch (wErr: any) {
      console.warn('Notice loading withdrawals from Firestore:', wErr?.message || wErr);
    }

    // 9. Load bets from dedicated Firestore collection
    try {
      const betsColRef = collection(fsInstance, 'bets');
      const betsSnap = await getDocs(query(betsColRef, limit(500)));
      if (!betsSnap.empty) {
        const existingIds = new Set(dbInstance.bets.map((b: any) => b.id));
        betsSnap.forEach((docSnap) => {
          const b = docSnap.data() as any;
          if (b && b.id && !existingIds.has(b.id)) {
            dbInstance.bets.unshift(b);
            existingIds.add(b.id);
          }
        });
        dbInstance.bets.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        console.log(`[Firestore] Hydrated ${betsSnap.size} permanent bets from Firestore.`);
      }
    } catch (betsErr: any) {
      console.warn('Notice loading bets from Firestore:', betsErr?.message || betsErr);
    }

    // Save consolidated loaded state to disk
    dbInstance.saveToDisk(false);
    return loadedUserCount;
  } catch (err: any) {
    console.warn('Firestore load notice:', err?.message || err);
    return loadedUserCount;
  }
}
