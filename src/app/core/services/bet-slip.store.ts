import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { BetSlipItem } from '../models/bet-slip.model';
import { MatchesStore } from './matches.store';
import { MatchStatus } from '../models/match.model';

export function slipKey(matchId: string, selection: string): string {
  return `${matchId}::${selection}`;
}

/** Default stake for a new selection: €10.00, stored as 1000 cents. */
export const DEFAULT_STAKE_CENTS = 1000;

/** Hard cap on a single stake: €100,000.00. */
export const MAX_STAKE_CENTS = 10_000_000;

/**
 * Money (stakes and potential payouts) is stored in integer cents so that
 * arithmetic stays exact (0.1 + 0.2 === 0.3, never 0.30000000000000004).
 */
export function toCents(euros: number): number {
  if (!Number.isFinite(euros)) return 0;
  return Math.round(euros * 100);
}

export function sanitizeStakeCents(stake: number): number {
  if (!Number.isFinite(stake)) return 0;
  return Math.min(MAX_STAKE_CENTS, Math.max(0, Math.round(stake)));
}

export function payoutCents(stakeCents: number, odds: number): number {
  if (!Number.isFinite(odds) || !(odds > 0)) return 0;
  return Math.round(stakeCents * odds);
}

const ACTIVE_STATUSES = new Set<MatchStatus>(['live', 'scheduled']);

@Injectable({
  providedIn: 'root'
})
export class BetSlipStore {
  private readonly matchesStore = inject(MatchesStore);

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
    effect(() => {
      const activeIds = new Set(
        this.matchesStore
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

  /**
   * Selections are only accepted when the backing match is bettable
   * (live/scheduled) and the odds are positive. Finished and cancelled
   * matches are rejected at the source instead of relying on a later eviction.
   */
  addSelection(item: BetSlipItem) {
    if (!(item.odds > 0)) return;
    const match = this.matchesStore.matches().find(m => m.id === item.matchId);
    if (!match || !ACTIVE_STATUSES.has(match.status)) return;

    const stake = sanitizeStakeCents(item.stake);
    this._items.update(items => ({
      ...items,
      [slipKey(item.matchId, item.selection)]: {
        matchId: item.matchId,
        selection: item.selection,
        odds: item.odds,
        stake,
        potentialPayout: payoutCents(stake, item.odds)
      }
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

  /**
   * Updates the stake (in cents). Invalid values (NaN, Infinity) are no-ops,
   * values are clamped to [0, MAX_STAKE_CENTS]. Returns the applied stake so
   * callers can reflect it in the DOM, or null when no selection exists.
   */
  updateStake(matchId: string, selection: string, stake: number): number | null {
    const key = slipKey(matchId, selection);
    const item = this._items()[key];
    if (!item) return null;

    // Non-finite input (NaN, Infinity) is a no-op: never corrupt the stored value.
    if (!Number.isFinite(stake)) return item.stake;

    const sanitized = sanitizeStakeCents(stake);
    const potentialPayout = payoutCents(sanitized, item.odds);

    if (item.stake === sanitized && item.potentialPayout === potentialPayout) {
      return sanitized;
    }

    this._items.update(items => ({
      ...items,
      [key]: { ...item, stake: sanitized, potentialPayout }
    }));
    return sanitized;
  }

  clear() {
    this._items.set({});
  }
}