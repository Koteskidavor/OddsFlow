import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { BetSlipStore } from './bet-slip.store';
import { BetSlipItem } from '../models/bet-slip.model';
import { OddsSelection } from '../models/match.model';
import { MockLiveEventService } from './mock-live-event.service';
import { LiveEvent } from '../models/live-event.model';

class FakeLiveEventService {
  readonly subject = new Subject<LiveEvent>();
  readonly events$ = this.subject.asObservable();

  setMatchesSource(): void {}

  emit(event: LiveEvent) {
    this.subject.next(event);
  }
}

/** Money values are stored in integer cents (€10 -> 1000). */
function item(matchId: string, selection: OddsSelection, odds: number, stakeCents: number): BetSlipItem {
  return {
    matchId,
    selection,
    odds,
    stake: stakeCents,
    potentialPayout: Math.round(stakeCents * odds)
  };
}

describe('BetSlipStore', () => {
  let store: BetSlipStore;
  let events: FakeLiveEventService;

  beforeEach(() => {
    events = new FakeLiveEventService();
    TestBed.configureTestingModule({
      providers: [{ provide: MockLiveEventService, useValue: events }]
    });
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
      store.addSelection(item('m1', '1', 2.0, 1000));

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(1000);
      expect(store.totalPayout()).toBe(2000);
    });

    it('computes correct totals for multiple selections', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m1', 'X', 3.5, 2000));
      store.addSelection(item('m3', 'home', 1.9, 500));

      expect(store.items().length).toBe(3);
      expect(store.totalStake()).toBe(3500);
      expect(store.totalPayout()).toBe(9950);
    });
  });

  describe('removing selections', () => {
    it('decreases the total amount correctly', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m3', 'home', 1.9, 1500));
      expect(store.totalStake()).toBe(2500);

      store.removeSelection('m3', 'home');

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(1000);
      expect(store.totalPayout()).toBe(2000);
    });

    it('is a no-op when the selection does not exist', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));

      store.removeSelection('m1', 'X');
      store.removeSelection('m9', '1');

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(1000);
    });
  });

  describe('adding the same selection again', () => {
    it('replaces the existing selection instead of duplicating it', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m1', '1', 4.0, 2500));

      expect(store.items().length).toBe(1);
      expect(store.hasSelection('m1', '1')).toBe(true);
      const only = store.items()[0];
      expect(only.odds).toBe(4.0);
      expect(only.stake).toBe(2500);
      expect(only.potentialPayout).toBe(10000);
      expect(store.totalStake()).toBe(2500);
    });

    it('keeps the same match with a different selection as separate entries', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m1', 'X', 3.5, 2000));

      expect(store.items().length).toBe(2);
      expect(store.totalStake()).toBe(3000);
    });
  });

  describe('money in integer cents', () => {
    it('sums decimal stakes exactly instead of accumulating float error', () => {
      store.addSelection(item('m1', '1', 2.0, 10)); // €0.10
      store.addSelection(item('m1', 'X', 2.0, 20)); // €0.20

      expect(store.totalStake()).toBe(30); // €0.30, not 0.30000000000000004
    });

    it('stores fractional euro stakes as rounded cents', () => {
      store.addSelection(item('m1', '1', 2.0, 1250)); // €12.50

      expect(store.items()[0].stake).toBe(1250);
      expect(store.items()[0].potentialPayout).toBe(2500);
    });
  });

  describe('stake safety', () => {
    it('accepts a zero stake without throwing', () => {
      expect(() => store.addSelection(item('m1', '1', 2.0, 0))).not.toThrow();
      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);
    });

    it('clamps a negative stake to zero on add', () => {
      expect(() => store.addSelection(item('m1', '1', 2.0, -1000))).not.toThrow();
      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(0);
      expect(store.items()[0].stake).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);
    });

    it('clamps negative stake updates to zero', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));

      expect(store.updateStake('m1', '1', 0)).toBe(0);
      expect(store.items()[0].stake).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);

      expect(store.updateStake('m1', '1', -500)).toBe(0);
      expect(store.items()[0].stake).toBe(0);
      expect(store.items()[0].potentialPayout).toBe(0);
      expect(store.totalPayout()).toBe(0);
    });

    it('ignores NaN stakes at the store level', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));

      store.updateStake('m1', '1', NaN);

      expect(store.items()[0].stake).toBe(1000);
      expect(store.items()[0].potentialPayout).toBe(2000);
      expect(store.totalStake()).toBe(1000);
      expect(store.totalPayout()).toBe(2000);
      expect(Number.isNaN(store.totalStake())).toBe(false);
      expect(Number.isNaN(store.totalPayout())).toBe(false);
    });

    it('ignores Infinity stakes at the store level', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));

      store.updateStake('m1', '1', Infinity);

      expect(store.items()[0].stake).toBe(1000);
      expect(store.items()[0].potentialPayout).toBe(2000);
      expect(store.totalStake()).toBe(1000);
    });

    it('caps stakes at the maximum', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));

      store.updateStake('m1', '1', 99_999_999);

      expect(store.items()[0].stake).toBe(10_000_000);
      expect(store.items()[0].potentialPayout).toBe(20_000_000);
    });
  });

  describe('evicting non-active matches', () => {
    it('removes selections when their finished match disappears from the store', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m3', 'home', 1.9, 500));
      store.addSelection(item('m5', '1', 1.8, 1000));

      events.emit({
        type: 'STATUS_CHANGE',
        matchId: 'm3',
        oldStatus: 'live',
        newStatus: 'finished'
      });
      TestBed.flushEffects();

      expect(store.hasSelection('m3', 'home')).toBe(false);
      expect(store.hasSelection('m1', '1')).toBe(true);
      expect(store.hasSelection('m5', '1')).toBe(true);
      expect(store.totalStake()).toBe(2000);
    });

    it('keeps selections for matches that remain live or scheduled', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m2', 'X', 3.8, 1000));
      store.addSelection(item('m5', '1', 1.8, 1000));

      events.emit({
        type: 'STATUS_CHANGE',
        matchId: 'm5',
        oldStatus: 'live',
        newStatus: 'cancelled'
      });
      TestBed.flushEffects();

      expect(store.hasSelection('m5', '1')).toBe(false);
      expect(store.hasSelection('m1', '1')).toBe(true);
      expect(store.hasSelection('m2', 'X')).toBe(true);
      expect(store.totalStake()).toBe(2000);
    });
  });

  describe('rejecting finished matches at the source', () => {
    it('does not add a selection once its match has finished', () => {
      events.emit({
        type: 'STATUS_CHANGE',
        matchId: 'm1',
        oldStatus: 'live',
        newStatus: 'finished'
      });
      TestBed.flushEffects();

      store.addSelection(item('m1', '1', 2.0, 1000));

      expect(store.items().length).toBe(0);
      expect(store.hasSelection('m1', '1')).toBe(false);
    });

    it('does not add a selection for a cancelled or unknown match', () => {
      events.emit({
        type: 'STATUS_CHANGE',
        matchId: 'm5',
        oldStatus: 'live',
        newStatus: 'cancelled'
      });
      TestBed.flushEffects();

      store.addSelection(item('m5', '1', 1.8, 1000));
      store.addSelection(item('m404', '1', 1.8, 1000));

      expect(store.items().length).toBe(0);
    });

    it('still accepts selections for scheduled matches', () => {
      store.addSelection(item('m2', '1', 1.7, 1000));

      expect(store.items().length).toBe(1);
      expect(store.hasSelection('m2', '1')).toBe(true);
    });
  });

  describe('invalid odds', () => {
    it('refuses a selection with zero odds', () => {
      store.addSelection(item('m1', '1', 0, 1000));

      expect(store.items().length).toBe(0);
      expect(store.totalStake()).toBe(0);
      expect(store.hasSelection('m1', '1')).toBe(false);
    });

    it('refuses a selection with negative odds', () => {
      store.addSelection(item('m1', '2', -1.5, 1000));

      expect(store.items().length).toBe(0);
      expect(store.totalStake()).toBe(0);
      expect(store.hasSelection('m1', '2')).toBe(false);
    });

    it('toggleSelection does not add a selection with zero or negative odds', () => {
      store.toggleSelection(item('m1', '1', 0, 1000));
      store.toggleSelection(item('m3', 'home', -2, 1000));

      expect(store.items().length).toBe(0);
      expect(store.hasSelection('m1', '1')).toBe(false);
      expect(store.hasSelection('m3', 'home')).toBe(false);
    });

    it('keeps existing valid selections when an invalid one is added', () => {
      store.addSelection(item('m1', '1', 2.0, 1000));
      store.addSelection(item('m1', 'X', 0, 1000));

      expect(store.items().length).toBe(1);
      expect(store.totalStake()).toBe(1000);
      expect(store.hasSelection('m1', '1')).toBe(true);
      expect(store.hasSelection('m1', 'X')).toBe(false);
    });
  });
});