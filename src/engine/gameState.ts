import { ALL_ITEMS, INITIAL_PLAYER_STATS } from '../data/defaultData';
import { GameItem, GameSaveData, PlayerStats } from '../types/game';

type StateListener = (stats: PlayerStats) => void;

class GameStateManager {
  private stats: PlayerStats;
  private currentRoom: string = 'room_awakening';
  private playerPos = { x: 180, y: 260 };
  private flags: Record<string, boolean> = { frisk_awoken: false };
  private listeners: Set<StateListener> = new Set();

  constructor() {
    this.stats = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATS));
    this.loadFromStorage();
  }

  public getStats(): PlayerStats {
    return this.stats;
  }

  public getCurrentRoom(): string {
    return this.currentRoom;
  }

  public setCurrentRoom(room: string, x?: number, y?: number) {
    this.currentRoom = room;
    if (x !== undefined && y !== undefined) {
      this.playerPos = { x, y };
    }
  }

  public getPlayerPos() {
    return { ...this.playerPos };
  }

  public setPlayerPos(x: number, y: number) {
    this.playerPos = { x, y };
  }

  public getFlag(key: string): boolean {
    return !!this.flags[key];
  }

  public setFlag(key: string, value: boolean) {
    this.flags[key] = value;
  }

  public subscribe(fn: StateListener): () => void {
    this.listeners.add(fn);
    fn(this.stats);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const copy = JSON.parse(JSON.stringify(this.stats));
    this.listeners.forEach((fn) => fn(copy));
  }

  // Damage / Healing
  public takeDamage(amount: number): boolean {
    const effectiveDef = this.stats.def + this.stats.armor.value;
    const finalDamage = Math.max(1, amount - Math.floor(effectiveDef / 5));
    this.stats.hp = Math.max(0, this.stats.hp - finalDamage);
    this.notify();
    return this.stats.hp <= 0;
  }

  public heal(amount: number) {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    this.notify();
  }

  public restoreFullHp() {
    this.stats.hp = this.stats.maxHp;
    this.notify();
  }

  // Inventory & Equipment
  public addItem(item: GameItem): boolean {
    if (this.stats.inventory.length >= 8) return false;
    this.stats.inventory.push({ ...item });
    this.notify();
    return true;
  }

  public useItem(index: number): { success: boolean; message: string } {
    const item = this.stats.inventory[index];
    if (!item) return { success: false, message: 'Item não encontrado.' };

    if (item.type === 'heal') {
      const prevHp = this.stats.hp;
      this.heal(item.value);
      const healed = this.stats.hp - prevHp;
      this.stats.inventory.splice(index, 1);
      this.notify();
      return {
        success: true,
        message: `* Você usou o ${item.name}. Recuperou ${healed} HP!`,
      };
    } else if (item.type === 'weapon') {
      const oldWeapon = this.stats.weapon;
      this.stats.weapon = item;
      this.stats.inventory.splice(index, 1);
      if (oldWeapon.id !== 'stick') {
        this.stats.inventory.push(oldWeapon);
      }
      this.notify();
      return {
        success: true,
        message: `* Você equipou a arma ${item.name} (${item.flavor})!`,
      };
    } else if (item.type === 'armor') {
      const oldArmor = this.stats.armor;
      this.stats.armor = item;
      this.stats.inventory.splice(index, 1);
      if (oldArmor.id !== 'bandage') {
        this.stats.inventory.push(oldArmor);
      }
      this.notify();
      return {
        success: true,
        message: `* Você equipou a armadura ${item.name} (${item.flavor})!`,
      };
    }

    return { success: false, message: 'Item inutilizável.' };
  }

  public dropItem(index: number): boolean {
    if (index >= 0 && index < this.stats.inventory.length) {
      this.stats.inventory.splice(index, 1);
      this.notify();
      return true;
    }
    return false;
  }

  // Leveling and Rewards
  public addRewards(exp: number, gold: number): { leveledUp: boolean; newLv?: number } {
    this.stats.gold += gold;
    this.stats.exp += exp;

    let leveledUp = false;
    while (this.stats.exp >= this.stats.expNext && this.stats.lv < 20) {
      this.stats.lv += 1;
      this.stats.maxHp += 4;
      this.stats.hp = this.stats.maxHp;
      this.stats.atk += 2;
      this.stats.def += 1;
      this.stats.expNext = Math.floor(this.stats.expNext * 1.8);
      leveledUp = true;
    }

    this.notify();
    return { leveledUp, newLv: leveledUp ? this.stats.lv : undefined };
  }

  public recordVictory(isSpare: boolean) {
    if (isSpare) {
      this.stats.spares += 1;
    } else {
      this.stats.kills += 1;
    }
    this.notify();
  }

  // Save / Load via LocalStorage
  public saveGame(): boolean {
    try {
      const data: GameSaveData = {
        stats: this.stats,
        currentRoom: this.currentRoom,
        playerPos: this.playerPos,
        flags: this.flags,
        timestamp: Date.now(),
      };
      localStorage.setItem('undertale_save_data', JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  public loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem('undertale_save_data');
      if (!raw) return false;
      const data: GameSaveData = JSON.parse(raw);
      if (data && data.stats) {
        this.stats = data.stats;
        this.currentRoom = data.currentRoom || 'ruins_entrance';
        this.playerPos = data.playerPos || { x: 320, y: 340 };
        this.flags = data.flags || {};
        this.notify();
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  }

  public resetGame() {
    this.stats = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATS));
    this.currentRoom = 'room_awakening';
    this.playerPos = { x: 180, y: 260 };
    this.flags = { frisk_awoken: false };
    localStorage.removeItem('undertale_save_data');
    this.notify();
  }
}

export const gameState = new GameStateManager();
