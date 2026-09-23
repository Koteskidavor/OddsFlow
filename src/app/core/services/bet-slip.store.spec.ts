import { TestBed } from '@angular/core/testing';
import { BetSlipStore } from './bet-slip.store';
import { BetSlipItem } from '../models/bet-slip.model';

function item(matchId: string, selection: string, odds: number, stake: number): BetSlipItem {
  return {
    matchId,
    selection,
    odds,
    stake,
    potentialPayout: Number((stake * odds).toFixed(2))
  };
}

describe('BetSlipStore', () => {
  let store: BetSlipStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(BetSlipStore);
    store.clear();
  });

  describe('totals', () => {
    it('computes zero totals for an empty slip', () => {
      expect(store.items()).toEqual([]);
      expect(store.totalStake()).toBe(0);
      expect(store.totalPayout()).toBe(0);
    });

    it('computes correct totals for a single selection', () => {
      store.addSelection(item('m1', '1', 2.0, 10));

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(10);
      expect(store.totalPayout()).toBe(20);
    });

    it('computes correct totals for multiple selections', () => {
      store.addSelection(item('m1', '1', 2.0, 10));
      store.addSelection(item('m1', 'X', 3.5, 20));
      store.addSelection(item('m3', 'home', 1.9, 5));

      expect(store.items().length).toBe(3);
      expect(store.totalStake()).toBe(35);
      expect(store.totalPayout()).toBeCloseTo(99.5, 2);
    });
  });

  describe('removing selections', () => {
    it('decreases the total amount correctly', () => {
      store.addSelection(item('m1', '1', 2.0, 10));
      store.addSelection(item('m3', 'home', 1.9, 15));
      expect(store.totalStake()).toBe(25);

      store.removeSelection('m3', 'home');

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(10);
      expect(store.totalPayout()).toBe(20);
    });

    it('is a no-op when the selection does not exist', () => {
      store.addSelection(item('m1', '1', 2.0, 10));

      store.removeSelection('m1', 'X');
      store.removeSelection('m9', '1');

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(10);
    });
  });

  describe('adding the same selection again', () => {
    it('replaces the existing selection instead of duplicating it', () => {
      store.addSelection(item('m1', '1', 2.0, 10));
      store.addSelection(item('m1', '1', 4.0, 25));

      expect(store.items().length).toBe(1);
      expect(store.hasSelection('m1', '1')).toBe(true);
      const only = store.items()[0];
      expect(only.odds).toBe(4.0);
      expect(only.stake).toBe(25);
      expect(only.potentialPayout).toBe(100);
      expect(store.totalStake()).toBe(25);
    });

    it('keeps the same match with a different selection as separate entries', () => {
      store.addSelection(item('m1', '1', 2.0, 10));
      store.addSelection(item('m1', 'X', 3.5, 20));

      expect(store.items().length).toBe(2);
      expect(store.totalStake()).toBe(30);
    });
  });

  describe('stake safety', () => {
    it('accepts a zero stake without throwing', () => {
      expect(() => store.addSelection(item('m1', '1', 2.0, 0))).not.toThrow();
      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);
    });

    it('accepts a negative stake without throwing', () => {
      expect(() => store.addSelection(item('m1', '1', 2.0, -10))).not.toThrow();
      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(-10);
    });

    it('updates stake to zero or negative values without throwing', () => {
      store.addSelection(item('m1', '1', 2.0, 10));

      expect(() => store.updateStake('m1', '1', 0)).not.toThrow();
      expect(store.items()[0].stake).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);

      expect(() => store.updateStake('m1', '1', -5)).not.toThrow();
      expect(store.items()[0].stake).toBe(-5);
    });
  });

  describe('invalid odds', () => {
    it('refuses a selection with zero odds', () => {
      store.addSelection(item('m1', '1', 0, 10));

      expect(store.items().length).toBe(0);
      expect(store.totalStake()).toBe(0);
      expect(store.hasSelection('m1', '1')).toBe(false);
    });

    it('refuses a selection with negative odds', () => {
      store.addSelection(item('m1', '2', -1.5, 10));

      expect(store.items().length).toBe(0);
      expect(store.totalStake()).toBe(0);
      expect(store.hasSelection('m1', '2')).toBe(false);
    });

    it('toggleSelection does not add a selection with zero or negative odds', () => {
      store.toggleSelection(item('m1', '1', 0, 10));
      store.toggleSelection(item('m3', 'home', -2, 10));

      expect(store.items().length).toBe(0);
      expect(store.hasSelection('m1', '1')).toBe(false);
      expect(store.hasSelection('m3', 'home')).toBe(false);
    });

    it('keeps existing valid selections when an invalid one is added', () => {
      store.addSelection(item('m1', '1', 2.0, 10));
      store.addSelection(item('m1', 'X', 0, 10));

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(10);
      expect(store.hasSelection('m1', '1')).toBe(true);
      expect(store.hasSelection('m1', 'X')).toBe(false);
    });
  });
});