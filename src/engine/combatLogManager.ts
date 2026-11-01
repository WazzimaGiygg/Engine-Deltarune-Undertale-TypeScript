export type CombatLogSource = 'player' | 'enemy' | 'system';

export type CombatActionType =
  | 'intro'
  | 'turn_start'
  | 'fight'
  | 'act'
  | 'item'
  | 'mercy'
  | 'dodge'
  | 'dialogue'
  | 'attack_pattern'
  | 'damage'
  | 'spared'
  | 'fled'
  | 'defeated'
  | 'rescue';

export interface CombatLogEntry {
  id: string;
  timestamp: number;
  turn: number;
  source: CombatLogSource;
  actionType: CombatActionType;
  actor: string;
  title: string;
  description: string;
  reaction?: string;
  statsChange?: {
    hpChange?: number;
    mercyChange?: number;
    defChange?: number;
    atkChange?: number;
  };
}

type LogListener = (entries: CombatLogEntry[]) => void;
type NewEntryListener = (entry: CombatLogEntry) => void;

class CombatLogManager {
  private entries: CombatLogEntry[] = [];
  private listeners: Set<LogListener> = new Set();
  private newEntryListeners: Set<NewEntryListener> = new Set();

  public addEntry(
    rawEntry: Omit<CombatLogEntry, 'id' | 'timestamp'>
  ): CombatLogEntry {
    const entry: CombatLogEntry = {
      ...rawEntry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    this.entries.push(entry);

    // Limit log size to prevent unbounded memory growth
    if (this.entries.length > 150) {
      this.entries.shift();
    }

    this.notify();
    this.notifyNew(entry);
    return entry;
  }

  public getEntries(): CombatLogEntry[] {
    return [...this.entries];
  }

  public getLatestEntry(): CombatLogEntry | null {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
  }

  public clearLog(): void {
    this.entries = [];
    this.notify();
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    listener(this.getEntries());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onNewEntry(listener: NewEntryListener): () => void {
    this.newEntryListeners.add(listener);
    return () => {
      this.newEntryListeners.delete(listener);
    };
  }

  private notify(): void {
    const copy = this.getEntries();
    this.listeners.forEach((listener) => {
      try {
        listener(copy);
      } catch (err) {
        console.error('CombatLog listener error:', err);
      }
    });
  }

  private notifyNew(entry: CombatLogEntry): void {
    this.newEntryListeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error('CombatLog new entry listener error:', err);
      }
    });
  }
}

export const combatLogManager = new CombatLogManager();
