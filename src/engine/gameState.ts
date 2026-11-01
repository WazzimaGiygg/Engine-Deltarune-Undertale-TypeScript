import { ALL_ITEMS, INITIAL_ARMOR, INITIAL_PLAYER_STATS, INITIAL_WEAPON } from '../data/defaultData';
import { GameItem, GameSaveData, MonsterBestiaryData, PlayerStats } from '../types/game';

export interface PositionState {
  room: string;
  roomName: string;
  x: number;
  y: number;
  activeScene: string;
}

type StateListener = (stats: PlayerStats) => void;
type PositionListener = (pos: PositionState) => void;

class GameStateManager {
  private stats: PlayerStats;
  private currentRoom: string = 'room_awakening';
  private playerPos = { x: 130, y: 240 };
  private activeScene: string = 'IntroScene';
  private flags: Record<string, boolean> = { frisk_awoken: false };
  private bestiaryData: Record<string, MonsterBestiaryData> = {};
  private listeners: Set<StateListener> = new Set();
  private posListeners: Set<PositionListener> = new Set();
  private sessionStartTime: number = Date.now();
  private savedPlaytimeSeconds: number = 0;
  private currentRoomName: string = 'Ruínas - Entrada';

  private activeSlot: number = 1;

  constructor() {
    this.stats = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATS));
    try {
      const savedSlot = localStorage.getItem('undertale_active_slot');
      if (savedSlot) {
        const parsed = parseInt(savedSlot, 10);
        if (parsed >= 1 && parsed <= 3) {
          this.activeSlot = parsed;
        }
      }
    } catch {
      this.activeSlot = 1;
    }
    this.loadFromStorage();
  }

  public getStats(): PlayerStats {
    return this.stats;
  }

  public getCurrentRoom(): string {
    return this.currentRoom;
  }

  public getCurrentRoomName(): string {
    return this.currentRoomName;
  }

  public setCurrentRoomName(name: string) {
    this.currentRoomName = name;
    this.notifyPosition();
  }

  public setCurrentRoom(room: string, x?: number, y?: number, roomName?: string) {
    this.currentRoom = room;
    if (roomName) {
      this.currentRoomName = roomName;
    }
    if (x !== undefined && y !== undefined) {
      this.playerPos = { x, y };
    }
    this.notifyPosition();
  }

  public setActiveScene(scene: string) {
    if (this.activeScene !== scene) {
      this.activeScene = scene;
      this.notifyPosition();
    }
  }

  public getActiveScene(): string {
    return this.activeScene;
  }

  public getPositionState(): PositionState {
    return {
      room: this.currentRoom,
      roomName: this.currentRoomName,
      x: this.playerPos.x,
      y: this.playerPos.y,
      activeScene: this.activeScene,
    };
  }

  public subscribePosition(fn: PositionListener): () => void {
    this.posListeners.add(fn);
    fn(this.getPositionState());
    return () => this.posListeners.delete(fn);
  }

  private notifyPosition() {
    const state = this.getPositionState();
    this.posListeners.forEach((fn) => fn(state));
  }

  public getPlaytimeSeconds(): number {
    const elapsedSession = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    return Math.max(0, this.savedPlaytimeSeconds + elapsedSession);
  }

  public getFormattedPlaytime(): string {
    const total = this.getPlaytimeSeconds();
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}:${pad(remMins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }


  public getPlayerPos() {
    return { ...this.playerPos };
  }

  public setPlayerPos(x: number, y: number) {
    if (this.playerPos.x !== x || this.playerPos.y !== y) {
      this.playerPos = { x, y };
      this.notifyPosition();
    }
  }

  public getFlag(key: string): boolean {
    return !!this.flags[key];
  }

  public getAllFlags(): Record<string, boolean> {
    return { ...this.flags };
  }

  public setFlag(key: string, value: boolean) {
    this.flags[key] = value;
    this.notify();
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

  // Toggle / Equip specific weapon from inventory
  public equipWeaponFromInventory(inventoryIndex: number): { success: boolean; message: string } {
    const item = this.stats.inventory[inventoryIndex];
    if (!item || item.type !== 'weapon') {
      return { success: false, message: '* O item selecionado não é uma arma válida.' };
    }
    const oldWeapon = this.stats.weapon;
    this.stats.weapon = item;
    this.stats.inventory.splice(inventoryIndex, 1);
    if (oldWeapon.id !== INITIAL_WEAPON.id) {
      this.stats.inventory.push(oldWeapon);
    }
    this.notify();
    return {
      success: true,
      message: `* Você equipou a arma [${item.name}]! (${item.flavor})`,
    };
  }

  // Toggle / Equip specific armor from inventory
  public equipArmorFromInventory(inventoryIndex: number): { success: boolean; message: string } {
    const item = this.stats.inventory[inventoryIndex];
    if (!item || item.type !== 'armor') {
      return { success: false, message: '* O item selecionado não é uma armadura válida.' };
    }
    const oldArmor = this.stats.armor;
    this.stats.armor = item;
    this.stats.inventory.splice(inventoryIndex, 1);
    if (oldArmor.id !== INITIAL_ARMOR.id) {
      this.stats.inventory.push(oldArmor);
    }
    this.notify();
    return {
      success: true,
      message: `* Você equipou a armadura [${item.name}]! (${item.flavor})`,
    };
  }

  // Unequip weapon back to standard stick
  public unequipWeapon(): { success: boolean; message: string } {
    if (this.stats.weapon.id === INITIAL_WEAPON.id) {
      return { success: false, message: '* Você já está usando a arma padrão (Graveto).' };
    }
    if (this.stats.inventory.length >= 8) {
      return { success: false, message: '* Mochila cheia! Não há espaço para guardar a arma desequipada.' };
    }
    const currentWeapon = this.stats.weapon;
    this.stats.inventory.push(currentWeapon);
    this.stats.weapon = { ...INITIAL_WEAPON };
    this.notify();
    return {
      success: true,
      message: `* Você desequipou [${currentWeapon.name}] e voltou para [${INITIAL_WEAPON.name}].`,
    };
  }

  // Unequip armor back to standard bandage
  public unequipArmor(): { success: boolean; message: string } {
    if (this.stats.armor.id === INITIAL_ARMOR.id) {
      return { success: false, message: '* Você já está usando a armadura padrão (Curativo).' };
    }
    if (this.stats.inventory.length >= 8) {
      return { success: false, message: '* Mochila cheia! Não há espaço para guardar a armadura desequipada.' };
    }
    const currentArmor = this.stats.armor;
    this.stats.inventory.push(currentArmor);
    this.stats.armor = { ...INITIAL_ARMOR };
    this.notify();
    return {
      success: true,
      message: `* Você desequipou [${currentArmor.name}] e voltou para [${INITIAL_ARMOR.name}].`,
    };
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

  public addGold(amount: number) {
    this.stats.gold += amount;
    this.notify();
  }

  public recordVictory(isSpare: boolean) {
    if (isSpare) {
      this.stats.spares += 1;
    } else {
      this.stats.kills += 1;
    }
    this.notify();
  }

  // --- BESTIARY & ENCOUNTER TRACKING ---
  public recordEncounter(enemyId: string): void {
    if (!enemyId) return;
    this.flags[`enemy_encountered_${enemyId}`] = true;
    if (!this.bestiaryData[enemyId]) {
      this.bestiaryData[enemyId] = {
        encounters: 0,
        defeated: 0,
        spared: 0,
        fled: 0,
        lastEncounterTime: Date.now(),
      };
    }
    this.bestiaryData[enemyId].encounters += 1;
    this.bestiaryData[enemyId].lastEncounterTime = Date.now();
    this.notify();
  }

  public recordEnemyOutcome(enemyId: string, outcome: 'defeated' | 'spared' | 'fled'): void {
    if (!enemyId) return;
    this.flags[`enemy_encountered_${enemyId}`] = true;
    if (!this.bestiaryData[enemyId]) {
      this.bestiaryData[enemyId] = {
        encounters: 1,
        defeated: 0,
        spared: 0,
        fled: 0,
        lastEncounterTime: Date.now(),
      };
    }
    if (outcome === 'defeated') {
      this.bestiaryData[enemyId].defeated += 1;
    } else if (outcome === 'spared') {
      this.bestiaryData[enemyId].spared += 1;
    } else if (outcome === 'fled') {
      this.bestiaryData[enemyId].fled += 1;
    }
    this.notify();
  }

  public isMonsterEncountered(enemyId: string): boolean {
    if (this.flags[`enemy_encountered_${enemyId}`]) return true;
    if (this.bestiaryData[enemyId]?.encounters > 0) return true;
    if (
      enemyId === 'dummy' &&
      (this.flags['dummy_practiced'] ||
        this.flags['dummy_spared'] ||
        this.flags['dummy_defeated'] ||
        this.flags['dummy_fled'])
    ) {
      return true;
    }
    if (enemyId === 'flowey' && (this.flags['flowey_met'] || this.flags['reached_room_toriel_entrance'])) {
      return true;
    }
    if (
      this.flags[`enemy_defeated_${enemyId}`] ||
      this.flags[`enemy_spared_${enemyId}`] ||
      this.flags[`enemy_resolved_${enemyId}`]
    ) {
      return true;
    }
    return false;
  }

  public getBestiaryData(): Record<string, MonsterBestiaryData> {
    const result: Record<string, MonsterBestiaryData> = { ...this.bestiaryData };
    const knownEnemies = ['dummy', 'froggit', 'sir_ossos', 'deltajester', 'flowey'];
    knownEnemies.forEach((id) => {
      if (this.isMonsterEncountered(id)) {
        if (!result[id]) {
          result[id] = {
            encounters: 1,
            defeated:
              this.flags[`enemy_defeated_${id}`] || (id === 'dummy' && this.flags['dummy_defeated'])
                ? 1
                : 0,
            spared:
              this.flags[`enemy_spared_${id}`] ||
              (id === 'dummy' && this.flags['dummy_spared']) ||
              (id === 'flowey' && this.flags['flowey_met'])
                ? 1
                : 0,
            fled:
              this.flags[`enemy_fled_${id}`] || (id === 'dummy' && this.flags['dummy_fled'])
                ? 1
                : 0,
            lastEncounterTime: Date.now(),
          };
        }
      }
    });
    return result;
  }

  public getEncounteredMonsterIds(): string[] {
    const known = ['dummy', 'froggit', 'sir_ossos', 'deltajester', 'flowey'];
    return known.filter((id) => this.isMonsterEncountered(id));
  }

  public getActiveSlot(): number {
    return this.activeSlot;
  }

  public setActiveSlot(slot: number) {
    if (slot >= 1 && slot <= 3) {
      this.activeSlot = slot;
      try {
        localStorage.setItem('undertale_active_slot', String(slot));
      } catch {
        // ignore
      }
      this.notify();
    }
  }

  private getSlotStorageKey(slot?: number): string {
    const s = slot !== undefined ? slot : this.activeSlot;
    return `undertale_save_data_slot_${s}`;
  }

  public getSaveSlotData(slot: number): GameSaveData | null {
    try {
      const key = `undertale_save_data_slot_${slot}`;
      let raw = localStorage.getItem(key);
      // Fallback for slot 1 backward compatibility
      if (!raw && slot === 1) {
        raw = localStorage.getItem('undertale_save_data');
      }
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public getAllSaveSlots(): { slot: number; data: GameSaveData | null; isActive: boolean }[] {
    return [1, 2, 3].map((slot) => ({
      slot,
      data: this.getSaveSlotData(slot),
      isActive: this.activeSlot === slot,
    }));
  }

  public getLastSavedData(): GameSaveData | null {
    return this.getSaveSlotData(this.activeSlot) || this.getSaveSlotData(1);
  }

  // --- SHOPPING: BUY & SELL ITEMS ---
  public canBuyItem(price: number): { canAfford: boolean; hasSpace: boolean } {
    return {
      canAfford: this.stats.gold >= price,
      hasSpace: this.stats.inventory.length < 8,
    };
  }

  public buyItem(item: GameItem, price: number): { success: boolean; message: string } {
    if (this.stats.inventory.length >= 8) {
      return {
        success: false,
        message: '* Seu inventário já está cheio! (Limite de 8 itens)',
      };
    }
    if (this.stats.gold < price) {
      return {
        success: false,
        message: `* Você não tem ouro suficiente! (Precisa de ${price} G, tem ${this.stats.gold} G)`,
      };
    }

    this.stats.gold -= price;
    this.stats.inventory.push({ ...item });
    this.notify();
    return {
      success: true,
      message: `* Você comprou [${item.name}] por ${price} G!`,
    };
  }

  public sellItem(index: number, price: number): { success: boolean; message: string } {
    const item = this.stats.inventory[index];
    if (!item) {
      return { success: false, message: '* Item inválido selecionado.' };
    }
    if (item.type === 'key') {
      return {
        success: false,
        message: '* "Ei, pivete! Não posso comprar esse item precioso de você!"',
      };
    }

    const itemName = item.name;
    this.stats.gold += price;
    this.stats.inventory.splice(index, 1);
    this.notify();
    return {
      success: true,
      message: `* Você vendeu [${itemName}] e recebeu ${price} G!`,
    };
  }

  // Save / Load via LocalStorage (supporting up to 3 distinct slots + autoSave)
  public saveGame(roomName?: string, targetSlot?: number): boolean {
    try {
      const slotToUse = targetSlot && targetSlot >= 1 && targetSlot <= 3 ? targetSlot : this.activeSlot;
      this.activeSlot = slotToUse;
      this.flags['game_saved_at_least_once'] = true;
      if (roomName) {
        this.currentRoomName = roomName;
      }
      this.restoreFullHp();

      const totalPlaytime = this.getPlaytimeSeconds();
      this.savedPlaytimeSeconds = totalPlaytime;
      this.sessionStartTime = Date.now();

      const data: GameSaveData = {
        slot: slotToUse,
        stats: this.stats,
        currentRoom: this.currentRoom,
        roomName: this.currentRoomName,
        playerPos: this.playerPos,
        flags: this.flags,
        timestamp: Date.now(),
        playtimeSeconds: totalPlaytime,
        bestiary: this.getBestiaryData(),
      };

      const key = `undertale_save_data_slot_${slotToUse}`;
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      localStorage.setItem('undertale_active_slot', String(slotToUse));

      // Mirror slot 1 to legacy key for compatibility
      if (slotToUse === 1) {
        localStorage.setItem('undertale_save_data', serialized);
      }

      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  // Auto-save mechanism triggered when entering a new room
  public autoSave(roomName?: string): boolean {
    try {
      if (roomName) {
        this.currentRoomName = roomName;
      }
      const totalPlaytime = this.getPlaytimeSeconds();
      this.savedPlaytimeSeconds = totalPlaytime;
      this.sessionStartTime = Date.now();

      const data: GameSaveData = {
        slot: this.activeSlot,
        stats: this.stats,
        currentRoom: this.currentRoom,
        roomName: this.currentRoomName,
        playerPos: this.playerPos,
        flags: this.flags,
        timestamp: Date.now(),
        playtimeSeconds: totalPlaytime,
        bestiary: this.getBestiaryData(),
      };

      const key = `undertale_save_data_slot_${this.activeSlot}`;
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      localStorage.setItem('undertale_active_slot', String(this.activeSlot));

      if (this.activeSlot === 1) {
        localStorage.setItem('undertale_save_data', serialized);
      }

      return true;
    } catch {
      return false;
    }
  }

  public loadFromSlot(slot: number): boolean {
    try {
      const data = this.getSaveSlotData(slot);
      if (data && data.stats) {
        this.activeSlot = slot;
        localStorage.setItem('undertale_active_slot', String(slot));
        this.stats = data.stats;
        this.currentRoom = data.currentRoom || 'ruins_entrance';
        this.currentRoomName = data.roomName || 'Ruínas - Entrada';
        this.playerPos = data.playerPos || { x: 320, y: 340 };
        this.flags = data.flags || {};
        this.bestiaryData = data.bestiary || {};
        this.savedPlaytimeSeconds = data.playtimeSeconds || 0;
        this.sessionStartTime = Date.now();
        this.notify();
        this.notifyPosition();
        return true;
      }
    } catch {
      // fallback
    }
    return false;
  }

  public loadFromStorage(targetSlot?: number): boolean {
    const slotToLoad = targetSlot || this.activeSlot;
    return this.loadFromSlot(slotToLoad);
  }

  public hasSavedGame(slot?: number): boolean {
    try {
      const targetSlot = slot || this.activeSlot;
      const data = this.getSaveSlotData(targetSlot);
      return Boolean(data && data.stats && data.stats.name && data.currentRoom);
    } catch {
      return false;
    }
  }

  public deleteSlot(slot: number): boolean {
    try {
      localStorage.removeItem(`undertale_save_data_slot_${slot}`);
      if (slot === 1) {
        localStorage.removeItem('undertale_save_data');
      }
      this.notify();
      return true;
    } catch {
      return false;
    }
  }

  public deleteSave(): boolean {
    return this.deleteSlot(this.activeSlot);
  }

  public exportSaveAsJson(slot?: number): string | null {
    try {
      const targetSlot = slot || this.activeSlot;
      const data = this.getSaveSlotData(targetSlot);
      return data ? JSON.stringify(data, null, 2) : null;
    } catch {
      return null;
    }
  }

  public importSaveFromJson(jsonString: string, targetSlot?: number): boolean {
    try {
      const data: GameSaveData = JSON.parse(jsonString);
      if (!data || !data.stats || !data.currentRoom) return false;
      const slot = targetSlot || this.activeSlot;
      data.slot = slot;
      const key = `undertale_save_data_slot_${slot}`;
      localStorage.setItem(key, JSON.stringify(data));
      if (slot === 1) {
        localStorage.setItem('undertale_save_data', JSON.stringify(data));
      }
      return this.loadFromSlot(slot);
    } catch {
      return false;
    }
  }

  public resetGame() {
    this.stats = JSON.parse(JSON.stringify(INITIAL_PLAYER_STATS));
    this.currentRoom = 'room_awakening';
    this.currentRoomName = 'Ruínas - Despertar';
    this.playerPos = { x: 180, y: 260 };
    this.flags = { frisk_awoken: false };
    this.bestiaryData = {};
    this.savedPlaytimeSeconds = 0;
    this.sessionStartTime = Date.now();
    this.deleteSlot(this.activeSlot);
    this.notify();
    this.notifyPosition();
  }
}

export const gameState = new GameStateManager();

