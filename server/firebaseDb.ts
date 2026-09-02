import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore,
  setLogLevel,
  doc, 
  setDoc, 
  getDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import fs from 'node:fs';
import path from 'node:path';

// Silence all internal Firebase Firestore SDK console messages
try {
  setLogLevel('silent');
} catch {
  // ignore
}

// Default embedded configuration for permanent cloud storage
const DEFAULT_FIREBASE_CONFIG = {
  projectId: "temporal-palace-qr7h4",
  appId: "1:831206456946:web:6c53265c477bc4bcc38ceb",
  apiKey: "AIzaSyChcCLdnS4Oe0isJCYO3o5AMI2HKq8KPGk",
  authDomain: "temporal-palace-qr7h4.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-remixremixarowcl-d878a8ec-fc27-46bf-a0f9-2216547faedc",
  storageBucket: "temporal-palace-qr7h4.firebasestorage.app",
  messagingSenderId: "831206456946",
};

// Load config
let firebaseConfig: any = { ...DEFAULT_FIREBASE_CONFIG };
let firestoreDb: any = null;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    firebaseConfig = { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
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
  } catch {
    return null;
  }
}

// Meta collections
const COLLECTION_META = 'arowclub_meta';
const QUOTA_STATUS_FILE = path.join(process.cwd(), 'data', 'firestore_quota.json');

// Check persistent quota exhaustion status
function isFirestoreQuotaExhausted(): boolean {
  try {
    if (fs.existsSync(QUOTA_STATUS_FILE)) {
      const data = JSON.parse(fs.readFileSync(QUOTA_STATUS_FILE, 'utf-8'));
      const elapsed = Date.now() - (data.exhaustedAt || 0);
      // Daily quota resets in 24 hours (86400000ms)
      if (elapsed < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function setFirestoreQuotaExhausted() {
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(QUOTA_STATUS_FILE, JSON.stringify({
      exhausted: true,
      exhaustedAt: Date.now(),
      notice: 'Firestore free tier daily write limit reached. Local disk persistence active.'
    }, null, 2), 'utf-8');
  } catch {
    // ignore
  }
}

let isSyncing = false;
let lastSyncTime = 0;
let debounceTimer: any = null;

// Automatic debounced sync - calls sync after 3 seconds of quiet
export function queueFirestoreSync(dbInstance: any) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    syncDataToFirestore(dbInstance, false).catch(() => {});
  }, 3000);
}

export async function syncUserToFirestore(user: any) {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance || !user || !user.uid) return;
  try {
    const userDocRef = doc(fsInstance, 'users', String(user.uid));
    await setDoc(userDocRef, { ...user, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err: any) {
    console.warn('Firestore user sync note:', err?.message || err);
  }
}

export async function syncDataToFirestore(dbInstance: any, force = false) {
  if (isSyncing) return;

  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return;

  isSyncing = true;

  try {
    const usersList = (dbInstance.getAllUniqueUsers ? dbInstance.getAllUniqueUsers() : Array.from(dbInstance.users.values())) as any[];
    
    // 1. Write platform settings document
    const metaDocRef = doc(fsInstance, COLLECTION_META, 'platform_settings');
    await setDoc(metaDocRef, {
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
      supportTickets: (dbInstance.supportTickets || []).slice(0, 100),
      adminUpiDetails: dbInstance.adminUpiDetails || {},
      adminBankDetails: dbInstance.adminBankDetails || {},
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 2. Write consolidated backup snapshot
    const dataBackupRef = doc(fsInstance, COLLECTION_META, 'data_backup');
    await setDoc(dataBackupRef, {
      users: usersList.slice(0, 1000),
      deposits: (dbInstance.deposits || []).slice(0, 500),
      withdrawals: (dbInstance.withdrawals || []).slice(0, 500),
      transactions: (dbInstance.transactions || []).slice(0, 500),
      bets: (dbInstance.bets || []).slice(0, 500),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    // 3. Write individual user documents
    for (const u of usersList.slice(0, 50)) {
      if (u && u.uid) {
        try {
          await setDoc(doc(fsInstance, 'users', String(u.uid)), { ...u, updatedAt: new Date().toISOString() }, { merge: true });
        } catch {
          // ignore single doc error
        }
      }
    }

    lastSyncTime = Date.now();
  } catch (error: any) {
    console.warn('Firestore sync note:', error?.message || error);
  } finally {
    isSyncing = false;
  }
}

export async function loadDataFromFirestore(dbInstance: any): Promise<boolean> {
  const fsInstance = getFirestoreInstance();
  if (!fsInstance) return false;

  try {
    let loadedFromBackup = false;

    // 1. Try to load individual users collection
    try {
      const usersColRef = collection(fsInstance, 'users');
      const userDocsSnap = await getDocs(usersColRef);
      if (!userDocsSnap.empty) {
        userDocsSnap.forEach((docSnap) => {
          const u = docSnap.data() as any;
          if (u && u.uid) {
            const uidStr = String(u.uid);
            const existing = dbInstance.users.get(uidStr);
            if (!existing) {
              dbInstance.users.set(uidStr, u);
            } else {
              dbInstance.users.set(uidStr, { ...u, ...existing });
            }
            loadedFromBackup = true;
          }
        });
      }
    } catch {
      // fallback to data_backup
    }

    // 2. Try to load from backup doc
    const backupRef = doc(fsInstance, COLLECTION_META, 'data_backup');
    const backupSnap = await getDoc(backupRef);

    if (backupSnap.exists()) {
      const data = backupSnap.data();
      if (data?.users && Array.isArray(data.users) && data.users.length > 0) {
        data.users.forEach((u: any) => {
          if (u && u.uid) {
            const uidStr = String(u.uid);
            // If already in local memory, keep the one with latest balance/turnover or merge
            const existing = dbInstance.users.get(uidStr);
            if (!existing) {
              dbInstance.users.set(uidStr, u);
            } else {
              dbInstance.users.set(uidStr, { ...u, ...existing });
            }
          }
        });
        loadedFromBackup = true;
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

    // 2. Load platform meta settings
    const metaDocRef = doc(fsInstance, COLLECTION_META, 'platform_settings');
    const metaSnap = await getDoc(metaDocRef);
    if (metaSnap.exists()) {
      const meta = metaSnap.data();
      if (meta.platformSettings) dbInstance.platformSettings = { ...dbInstance.platformSettings, ...meta.platformSettings };
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
    }

    dbInstance.saveToDisk(false); // save merged state to disk without re-triggering sync loop
    return loadedFromBackup;
  } catch (err: any) {
    console.warn('Firestore load notice:', err?.message || err);
    return false;
  }
}
