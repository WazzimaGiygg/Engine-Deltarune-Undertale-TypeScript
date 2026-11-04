import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  deleteDoc,
  getDocFromServer,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameSaveData, PlayerStats } from '../types/game';

// 1. Initialize Firebase App and Services
export const firebaseApp = initializeApp(firebaseConfig);
// CRITICAL: Must pass database ID as per skill instructions
export const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(firebaseApp);

// 2. Error handling as required by Firebase skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// 3. Test connection upon initialization (as required by skill)
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network unavailable.');
    }
    return false;
  }
}
testConnection();

// 4. Authentication functions (Using Google Auth with popup)
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

export async function loginWithGoogle(): Promise<User> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = cred.user;

    // Record / update user profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Humano',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return user;
  } catch (error) {
    console.error('Google Sign-In failed:', error);
    throw error;
  }
}

export async function logoutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out failed:', error);
    throw error;
  }
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

// 5. Cloud Save / Slot Management in Firestore
export interface CloudSaveSlotDoc {
  userId: string;
  slot: number;
  roomName: string;
  currentRoom: string;
  positionX: number;
  positionY: number;
  playtimeSeconds: number;
  timestamp: number;
  stats: any;
  flags: Record<string, boolean>;
  visitedRooms: string[];
  updatedAt: string;
}

/**
 * Saves a local GameSaveData to the user's Firestore cloud storage
 */
export async function saveSlotToCloud(
  userId: string,
  slotNumber: number,
  saveData: GameSaveData
): Promise<boolean> {
  const path = `users/${userId}/saves/slot_${slotNumber}`;
  try {
    const slotDocRef = doc(db, 'users', userId, 'saves', `slot_${slotNumber}`);
    const cloudPayload: CloudSaveSlotDoc = {
      userId,
      slot: slotNumber,
      roomName: saveData.roomName || 'Ruínas Antigas',
      currentRoom: saveData.currentRoom || 'room_awakening',
      positionX: saveData.playerPos?.x ?? 320,
      positionY: saveData.playerPos?.y ?? 380,
      playtimeSeconds: saveData.playtimeSeconds || 0,
      timestamp: saveData.timestamp || Date.now(),
      stats: saveData.stats,
      flags: saveData.flags || {},
      visitedRooms: [],
      updatedAt: new Date().toISOString(),
    };

    await setDoc(slotDocRef, cloudPayload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Retrieves a specific save slot from the cloud
 */
export async function loadSlotFromCloud(
  userId: string,
  slotNumber: number
): Promise<GameSaveData | null> {
  const path = `users/${userId}/saves/slot_${slotNumber}`;
  try {
    const slotDocRef = doc(db, 'users', userId, 'saves', `slot_${slotNumber}`);
    const snapshot = await getDoc(slotDocRef);
    if (!snapshot.exists()) {
      return null;
    }
    const data = snapshot.data() as CloudSaveSlotDoc;
    const restoredSave: GameSaveData = {
      slot: data.slot,
      stats: data.stats,
      currentRoom: data.currentRoom,
      roomName: data.roomName,
      playerPos: { x: data.positionX, y: data.positionY },
      flags: data.flags || {},
      timestamp: data.timestamp || Date.now(),
      playtimeSeconds: data.playtimeSeconds || 0,
      bestiary: {},
    };
    return restoredSave;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Retrieves all 3 cloud save slots for the user
 */
export async function loadAllCloudSlots(
  userId: string
): Promise<{ [slotNumber: number]: GameSaveData }> {
  const path = `users/${userId}/saves`;
  try {
    const savesColRef = collection(db, 'users', userId, 'saves');
    const snapshot = await getDocs(savesColRef);
    const result: { [slotNumber: number]: GameSaveData } = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as CloudSaveSlotDoc;
      if (data && data.slot) {
        result[data.slot] = {
          slot: data.slot,
          stats: data.stats,
          currentRoom: data.currentRoom,
          roomName: data.roomName,
          playerPos: { x: data.positionX, y: data.positionY },
          flags: data.flags || {},
          timestamp: data.timestamp || Date.now(),
          playtimeSeconds: data.playtimeSeconds || 0,
          bestiary: {},
        };
      }
    });

    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {};
  }
}

/**
 * Deletes a slot from cloud storage
 */
export async function deleteCloudSlot(
  userId: string,
  slotNumber: number
): Promise<boolean> {
  const path = `users/${userId}/saves/slot_${slotNumber}`;
  try {
    const slotDocRef = doc(db, 'users', userId, 'saves', `slot_${slotNumber}`);
    await deleteDoc(slotDocRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    return false;
  }
}

// 6. Global Leaderboard / Placar de Pontos entre Jogadores
export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  score: number;
  lv: number;
  exp: number;
  gold: number;
  kills: number;
  spares: number;
  route: string;
  roomName: string;
  playtimeSeconds: number;
  updatedAt: string;
}

export function calculatePlayerScore(stats: PlayerStats, playtimeSeconds = 0): number {
  const lvPoints = (stats.lv || 1) * 150;
  const expPoints = (stats.exp || 0) * 10;
  const goldPoints = (stats.gold || 0) * 2;
  const sparesPoints = (stats.spares || 0) * 60;
  const killsPoints = (stats.kills || 0) * 15;
  const pacifistBonus = stats.kills === 0 ? 500 : 0;
  const timeBonus = Math.min(300, Math.floor(playtimeSeconds / 10));

  return lvPoints + expPoints + goldPoints + sparesPoints + killsPoints + pacifistBonus + timeBonus;
}

/**
 * Submits or updates the current player's score to the global leaderboard
 */
export async function submitScoreToLeaderboard(
  user: User,
  stats: PlayerStats,
  roomName: string,
  playtimeSeconds: number
): Promise<LeaderboardEntry> {
  const path = `leaderboard/${user.uid}`;
  const totalScore = calculatePlayerScore(stats, playtimeSeconds);
  const route = stats.kills === 0 ? 'PACIFISTA' : `NEUTRO (${stats.kills} Kills)`;

  const entry: LeaderboardEntry = {
    userId: user.uid,
    displayName: (user.displayName || stats.name || 'Humano').substring(0, 64),
    photoURL: user.photoURL || '',
    score: totalScore,
    lv: stats.lv || 1,
    exp: stats.exp || 0,
    gold: stats.gold || 0,
    kills: stats.kills || 0,
    spares: stats.spares || 0,
    route,
    roomName: (roomName || 'Ruínas').substring(0, 64),
    playtimeSeconds: playtimeSeconds || 0,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, 'leaderboard', user.uid);
    await setDoc(docRef, entry);
    return entry;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Fetches the top player scores from the global leaderboard
 */
export async function fetchLeaderboard(maxLimit = 25): Promise<LeaderboardEntry[]> {
  const path = 'leaderboard';
  try {
    const colRef = collection(db, 'leaderboard');
    const q = query(colRef, orderBy('score', 'desc'), limit(maxLimit));
    const snapshot = await getDocs(q);
    const list: LeaderboardEntry[] = [];
    snapshot.forEach((snap) => {
      list.push(snap.data() as LeaderboardEntry);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// 7. Player Achievements in Firestore
export interface CloudAchievementDoc {
  userId: string;
  achievementId: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  category: string;
  unlockedAt: string;
}

/**
 * Persists an unlocked achievement to the user's Firestore document
 */
export async function saveAchievementToCloud(
  userId: string,
  achievement: {
    id: string;
    title: string;
    description: string;
    icon: string;
    points: number;
    category: string;
    unlockedAt?: string;
  }
): Promise<boolean> {
  const path = `users/${userId}/achievements/${achievement.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'achievements', achievement.id);
    const payload: CloudAchievementDoc = {
      userId,
      achievementId: achievement.id,
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      points: achievement.points,
      category: achievement.category,
      unlockedAt: achievement.unlockedAt || new Date().toISOString(),
    };
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

/**
 * Loads all unlocked achievements for a user from Firestore
 */
export async function loadAchievementsFromCloud(
  userId: string
): Promise<Record<string, { unlockedAt: string }>> {
  const path = `users/${userId}/achievements`;
  try {
    const colRef = collection(db, 'users', userId, 'achievements');
    const snapshot = await getDocs(colRef);
    const result: Record<string, { unlockedAt: string }> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as CloudAchievementDoc;
      if (data && data.achievementId) {
        result[data.achievementId] = {
          unlockedAt: data.unlockedAt || new Date().toISOString(),
        };
      }
    });
    return result;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return {};
  }
}

