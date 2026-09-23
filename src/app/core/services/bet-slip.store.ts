import { Injectable, signal, computed } from '@angular/core';
import { BetSlipItem } from '../models/bet-slip.model';

export function slipKey(matchId: string, selection: string): string {
  return `${matchId}::${selection}`;
}

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

  addSelection(item: BetSlipItem) {
    this._items.update(items => ({
      ...items,
      [slipKey(item.matchId, item.selection)]: item
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

      return {
        ...items,
        [key]: {
          ...item,
          stake,
          potentialPayout: Number((stake * item.odds).toFixed(2))
        }
      };
    });
  }

  clear() {
    this._items.set({});
  }
}