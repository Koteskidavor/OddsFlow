import { Injectable, signal, computed } from '@angular/core';
import { BetSlipItem } from '../models/bet-slip.model';

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

  addSelection(item: BetSlipItem) {
    this._items.update(items => ({
      ...items,
      [item.matchId]: item
    }));
  }

  removeSelection(matchId: string) {
    this._items.update(items => {
      const newItems = { ...items };
      delete newItems[matchId];
      return newItems;
    });
  }

  updateStake(matchId: string, stake: number) {
    this._items.update(items => {
      const item = items[matchId];
      if (!item) return items;

      return {
        ...items,
        [matchId]: {
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
