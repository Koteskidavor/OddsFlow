import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { BetSlipItem } from '../models/bet-slip.model';
import { MatchesStore } from './matches.store';

export function slipKey(matchId: string, selection: string): string {
  return `${matchId}::${selection}`;
}

const ACTIVE_STATUSES = new Set(['live', 'scheduled']);

@Injectable({
  providedIn: 'root'
})
export class BetSlipStore {
  private readonly _items = signal<Record<string, BetSlipItem>>({});
  public readonly items = computed(() => Object.values(this._items()));

  public readonly totalStake = computed(() =>
    this.items().reduce((sum, item) => sum + item.stake, 0)
  );

  public readonly totalPayout = computed(() =>
    this.items().reduce((sum, item) => sum + item.potentialPayout, 0)
  );

  public readonly hasSelection = (matchId: string, selection: string) =>
    this._items()[slipKey(matchId, selection)] !== undefined;

  constructor() {
    // Evict selections whose match is no longer bettable (finished/cancelled).
    const matchesStore = inject(MatchesStore);
    effect(() => {
      const activeIds = new Set(
        matchesStore
          .matches()
          .filter(m => ACTIVE_STATUSES.has(m.status))
          .map(m => m.id)
      );

      this._items.update(items => {
        let changed = false;
        const next: Record<string, BetSlipItem> = {};
        for (const [key, item] of Object.entries(items)) {
          if (activeIds.has(item.matchId)) {
            next[key] = item;
          } else {
            changed = true;
          }
        }
        return changed ? next : items;
      });
    });
  }

  addSelection(item: BetSlipItem) {
    if (!(item.odds > 0)) return;
    this._items.update(items => ({
      ...items,
      [slipKey(item.matchId, item.selection)]: sanitizeStake(item)
    }));
  }

  removeSelection(matchId: string, selection: string) {
    this._items.update(items => {
      const newItems = { ...items };
      delete newItems[slipKey(matchId, selection)];
      return newItems;
    });
  }

  toggleSelection(item: BetSlipItem) {
    if (this.hasSelection(item.matchId, item.selection)) {
      this.removeSelection(item.matchId, item.selection);
    } else {
      this.addSelection(item);
    }
  }

  updateStake(matchId: string, selection: string, stake: number) {
    this._items.update(items => {
      const key = slipKey(matchId, selection);
      const item = items[key];
      if (!item) return items;

      const safeStake = Math.max(0, stake);
      return {
        ...items,
        [key]: {
          ...item,
          stake: safeStake,
          potentialPayout: Number((safeStake * item.odds).toFixed(2))
        }
      };
    });
  }

  clear() {
    this._items.set({});
  }
}

function sanitizeStake(item: BetSlipItem): BetSlipItem {
  const stake = Math.max(0, item.stake);
  return {
    ...item,
    stake,
    potentialPayout: Number((stake * item.odds).toFixed(2))
  };
}