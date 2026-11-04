import { INITIAL_ACHIEVEMENTS } from '../data/achievementsData';
import { auth, loadAchievementsFromCloud, saveAchievementToCloud } from '../services/firebase';
import { soundManager } from '../services/soundSynthesizer';
import { Achievement, AchievementUnlockNotification } from '../types/achievement';
import { gameState } from './gameState';

type AchievementListener = (achievements: Achievement[]) => void;
type NotificationListener = (notification: AchievementUnlockNotification) => void;

class AchievementManager {
  private achievements: Achievement[];
  private listeners: Set<AchievementListener> = new Set();
  private notificationListeners: Set<NotificationListener> = new Set();
  private notificationQueue: AchievementUnlockNotification[] = [];
  private isProcessingNotification = false;
  private isSyncing = false;

  constructor() {
    this.achievements = JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS));
    this.loadFromLocalStorage();

    // Re-evaluate automatic triggers when game state changes
    gameState.subscribe(() => {
      this.evaluateStateTriggers();
    });

    gameState.subscribeGraphics((gfx) => {
      if (gfx.crtFilter) {
        this.unlock('ach_crt_vintage');
      }
    });

    // Listen to Firebase Auth state changes
    if (typeof window !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          this.unlock('ach_cloud_sync');
          this.syncWithCloud(user.uid);
        }
      });
    }
  }

  private loadFromLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('undertale_achievements');
      if (saved) {
        const parsed: Record<string, { unlockedAt: string }> = JSON.parse(saved);
        this.achievements.forEach((ach) => {
          if (parsed[ach.id]) {
            ach.unlocked = true;
            ach.unlockedAt = parsed[ach.id].unlockedAt;
          }
        });
      }
    } catch {
      // Fallback
    }
  }

  private saveToLocalStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const dataToSave: Record<string, { unlockedAt: string }> = {};
      this.achievements.forEach((ach) => {
        if (ach.unlocked && ach.unlockedAt) {
          dataToSave[ach.id] = { unlockedAt: ach.unlockedAt };
        }
      });
      localStorage.setItem('undertale_achievements', JSON.stringify(dataToSave));
    } catch {
      // Ignore
    }
  }

  public subscribe(fn: AchievementListener): () => void {
    this.listeners.add(fn);
    fn(this.getAchievements());
    return () => this.listeners.delete(fn);
  }

  public onNotification(fn: NotificationListener): () => void {
    this.notificationListeners.add(fn);
    return () => this.notificationListeners.delete(fn);
  }

  public getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  public getStats() {
    const total = this.achievements.length;
    const unlocked = this.achievements.filter((a) => a.unlocked).length;
    const points = this.achievements
      .filter((a) => a.unlocked)
      .reduce((acc, curr) => acc + curr.points, 0);
    const maxPoints = this.achievements.reduce((acc, curr) => acc + curr.points, 0);
    const rate = Math.round((unlocked / Math.max(1, total)) * 100);

    return { total, unlocked, points, maxPoints, rate };
  }

  /**
   * Unlocks an achievement by ID, plays fanfare, displays pop-up and syncs to Firestore
   */
  public async unlock(achievementId: string): Promise<boolean> {
    const ach = this.achievements.find((a) => a.id === achievementId);
    if (!ach || ach.unlocked) {
      return false;
    }

    ach.unlocked = true;
    ach.unlockedAt = new Date().toISOString();

    this.saveToLocalStorage();
    this.notifyListeners();

    // Trigger celebratory audio chime
    soundManager.playSave();

    // Send visual notification toast
    const notif: AchievementUnlockNotification = {
      id: ach.id,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      points: ach.points,
      timestamp: Date.now(),
    };
    this.queueNotification(notif);

    // If user is currently signed in to Firebase, persist to Firestore
    if (auth.currentUser) {
      try {
        await saveAchievementToCloud(auth.currentUser.uid, ach);
      } catch (e) {
        console.warn('Could not sync achievement to Firestore:', e);
      }
    }

    return true;
  }

  private queueNotification(notif: AchievementUnlockNotification) {
    this.notificationListeners.forEach((fn) => fn(notif));
  }

  private notifyListeners(): void {
    const list = this.getAchievements();
    this.listeners.forEach((fn) => fn(list));
  }

  /**
   * Syncs locally unlocked achievements with Firestore cloud collection
   */
  public async syncWithCloud(userId: string): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      const cloudMap = await loadAchievementsFromCloud(userId);
      let changed = false;

      // 1. Apply any cloud achievements to local state
      this.achievements.forEach((ach) => {
        if (!ach.unlocked && cloudMap[ach.id]) {
          ach.unlocked = true;
          ach.unlockedAt = cloudMap[ach.id].unlockedAt;
          changed = true;
        }
      });

      // 2. Upload any locally unlocked achievements that aren't in the cloud yet
      for (const ach of this.achievements) {
        if (ach.unlocked && !cloudMap[ach.id]) {
          await saveAchievementToCloud(userId, ach);
        }
      }

      if (changed) {
        this.saveToLocalStorage();
        this.notifyListeners();
      }
    } catch (e) {
      console.warn('Sync achievements with cloud error:', e);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Automatically checks game progression triggers
   */
  private evaluateStateTriggers(): void {
    // 1. Frisk Awoken
    if (gameState.getFlag('frisk_awoken')) {
      this.unlock('ach_awakening');
    }

    // 2. Flowey Encounter
    if (gameState.getFlag('flowey_intro_finished') || gameState.getFlag('flowey_met')) {
      this.unlock('ach_flowey_lesson');
    }

    // 3. Toriel Rescued Frisk
    if (gameState.getFlag('toriel_intro_spoken') || gameState.getFlag('toriel_at_entrance')) {
      this.unlock('ach_toriel_rescue');
    }

    // 4. Candy taken
    if (gameState.getFlag('candy_taken') || gameState.getFlag('candy_greed')) {
      this.unlock('ach_candy_greed');
    }

    // 5. Dummy combat
    if (gameState.getFlag('dummy_talked') || gameState.getFlag('dummy_struck')) {
      this.unlock('ach_dummy_training');
    }

    // 6. First mercy
    const stats = gameState.getStats();
    if (stats.spares > 0) {
      this.unlock('ach_first_mercy');
    }

    // 7. Napstablook encountered
    if (gameState.getFlag('napstablook_spared') || gameState.getFlag('napstablook_encountered')) {
      this.unlock('ach_blooky_chill');
    }

    // 8. Warm pie found
    if (gameState.getFlag('pie_taken') || gameState.getFlag('room_toriel_bedroom_visited')) {
      this.unlock('ach_warm_pie');
    }

    // 9. Toriel Boss battle completed
    if (
      gameState.getFlag('toriel_spared') ||
      gameState.getFlag('toriel_defeated') ||
      gameState.getFlag('toriel_battle_complete')
    ) {
      this.unlock('ach_toriel_boss');
    }

    // 10. Snowdin Gate
    const curRoom = gameState.getCurrentRoom();
    if (
      curRoom === 'room_snowdin_forest' ||
      gameState.getFlag('entered_snowdin') ||
      gameState.getFlag('toriel_corridor_spoken')
    ) {
      this.unlock('ach_snowdin_gate');

      // 11. Pure Pacifist
      if (stats.kills === 0 && stats.lv === 1) {
        this.unlock('ach_pure_pacifist');
      }
    }

    // 12. Sans encounter
    if (gameState.getFlag('sans_forest_met') || gameState.getFlag('sans_talked')) {
      this.unlock('ach_sans_encounter');
    }

    // 13. Gear Equipped
    if (
      (stats.weapon && stats.weapon.id !== 'stick') ||
      (stats.armor && stats.armor.id !== 'bandage')
    ) {
      this.unlock('ach_gear_up');
    }

    // 14. Secret room or secret switches
    if (
      gameState.getFlag('secret_switch_found') ||
      gameState.getFlag('secret_room_entered') ||
      curRoom === 'room_secret_chamber'
    ) {
      this.unlock('ach_secret_room');
    }
  }
}

export const achievementManager = new AchievementManager();
