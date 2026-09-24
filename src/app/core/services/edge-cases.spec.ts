import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { Match, OddsSelection } from '../models/match.model';
import { LiveEvent } from '../models/live-event.model';
import { BetSlipItem } from '../models/bet-slip.model';
import { MockLiveEventService } from './mock-live-event.service';
import { MatchesStore, parseLoadDelay, emptyTennisScore } from './matches.store';
import { BetSlipStore, MAX_STAKE_CENTS, toCents, sanitizeStakeCents, payoutCents } from './bet-slip.store';
import { ThemeService } from './theme.service';
import { BetSlipComponent } from '../../features/bet-slip/bet-slip.component';

class FakeLiveEventService {
  readonly subject = new Subject<LiveEvent>();
  readonly events$ = this.subject.asObservable();

  setMatchesSource(): void { }

  emit(event: LiveEvent) {
    this.subject.next(event);
  }
}

export function slipItem(matchId: string, selection: OddsSelection, odds: number, stakeCents: number): BetSlipItem {
  return { matchId, selection, odds, stake: stakeCents, potentialPayout: payoutCents(stakeCents, odds) };
}

function stubRandomSequence(...values: number[]): void {
  let i = 0;
  const call = () => {
    const value = values[Math.min(i, values.length - 1)];
    i++;
    return value;
  };
  const rand = Math.random as unknown as { and?: { callFake(fn: () => number): void } };
  if (rand.and) {
    rand.and.callFake(call);
  } else {
    spyOn(Math, 'random').and.callFake(call);
  }
}

/** Deterministic PRNG so long simulations are reproducible. */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function configureStore(): { store: MatchesStore; events: FakeLiveEventService } {
  const events = new FakeLiveEventService();
  TestBed.configureTestingModule({
    providers: [{ provide: MockLiveEventService, useValue: events }]
  });
  return { store: TestBed.inject(MatchesStore), events };
}

function match(store: MatchesStore, id: string): Match {
  return store.matches().find(m => m.id === id)!;
}

describe('Bug regressions', () => {
  describe('Tennis scoring', () => {
    let store: MatchesStore;
    let events: FakeLiveEventService;

    beforeEach(() => {
      ({ store, events } = configureStore());
    });

    it('a 40-0 point scores one game, not a whole set (1-0 -> 1-0, not 2-0)', () => {
      expect(match(store, 'm5').tennisScore!.setsWon).toEqual({ home: 1, away: 0 });
      expect(match(store, 'm5').score).toBe('1-0');

      events.emit({
        type: 'TENNIS_SCORE_UPDATE',
        matchId: 'm5',
        tennisUpdate: { home: '40', away: '0' }
      });

      const after = match(store, 'm5').tennisScore!;
      expect(after.setsWon).toEqual({ home: 1, away: 0 });
      expect(after.games).toEqual({ home: 1, away: 0 });
      expect(after.sets).toEqual([{ home: 6, away: 4 }]); // no fabricated 6-0 set
      expect(after.currentSet).toEqual({ home: '0', away: '0' });
      expect(match(store, 'm5').score).toBe('1-0');
    });

    it('a realistic point from 30-15 (home to 40) also wins only a game', () => {
      events.emit({
        type: 'TENNIS_SCORE_UPDATE',
        matchId: 'm5',
        tennisUpdate: { home: '40', away: '15' }
      });

      const after = match(store, 'm5').tennisScore!;
      expect(after.setsWon).toEqual({ home: 1, away: 0 });
      expect(after.games).toEqual({ home: 1, away: 0 });
      expect(after.sets.length).toBe(1);
      expect(match(store, 'm5').score).toBe('1-0');
    });

    it('does not push a set until six games have been won', () => {
      const gamesWon = 3;
      for (let i = 0; i < gamesWon; i++) {
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '15', away: '0' } });
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '30', away: '0' } });
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '40', away: '0' } });
      }

      const after = match(store, 'm5').tennisScore!;
      expect(after.games).toEqual({ home: 3, away: 0 });
      expect(after.setsWon).toEqual({ home: 1, away: 0 });
      expect(after.sets.length).toBe(1);
      expect(match(store, 'm5').status).toBe('live');
    });

    it('pushes a set at 6 games and finishes the match at 2 sets (best of three)', () => {
      for (let game = 0; game < 6; game++) {
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '15', away: '0' } });
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '30', away: '0' } });
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '40', away: '0' } });
      }

      const after = match(store, 'm5').tennisScore!;
      expect(after.sets).toEqual([{ home: 6, away: 4 }, { home: 6, away: 0 }]);
      expect(after.setsWon).toEqual({ home: 2, away: 0 });
      expect(after.games).toEqual({ home: 0, away: 0 });
      expect(match(store, 'm5').status).toBe('finished');
      expect(match(store, 'm5').score).toBe('2-0');
    });

    it('lets the away player win games and sets too (generator is not home-only)', () => {
      events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '0', away: '15' } });
      events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '0', away: '30' } });
      events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm5', tennisUpdate: { home: '0', away: '40' } });

      const after = match(store, 'm5').tennisScore!;
      expect(after.games.away).toBe(1);
      expect(after.setsWon.away).toBe(0); // one game is not a set
    });
  });

  describe('Status transitions', () => {
    let store: MatchesStore;
    let events: FakeLiveEventService;

    beforeEach(() => {
      ({ store, events } = configureStore());
    });

    it('rejects cancelled -> live', () => {
      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'live', newStatus: 'cancelled' });
      expect(match(store, 'm1').status).toBe('cancelled');

      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'cancelled', newStatus: 'live' });

      expect(match(store, 'm1').status).toBe('cancelled');
    });

    it('rejects live -> scheduled', () => {
      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'live', newStatus: 'scheduled' });

      expect(match(store, 'm1').status).toBe('live');
    });

    it('accepts scheduled -> live and live -> cancelled', () => {
      events.emit({ type: 'STATUS_CHANGE', matchId: 'm2', oldStatus: 'scheduled', newStatus: 'live' });
      expect(match(store, 'm2').status).toBe('live');

      events.emit({ type: 'STATUS_CHANGE', matchId: 'm2', oldStatus: 'live', newStatus: 'cancelled' });
      expect(match(store, 'm2').status).toBe('cancelled');
    });

    it('treats finished as terminal', () => {
      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'live', newStatus: 'finished' });
      expect(match(store, 'm1').status).toBe('finished');

      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'finished', newStatus: 'live' });
      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'finished', newStatus: 'cancelled' });
      expect(match(store, 'm1').status).toBe('finished');
    });

    it('bootstraps tennisScore when a scheduled tennis match goes live', () => {
      expect(match(store, 'm6').tennisScore).toBeUndefined();

      events.emit({ type: 'STATUS_CHANGE', matchId: 'm6', oldStatus: 'scheduled', newStatus: 'live' });

      expect(match(store, 'm6').tennisScore).toEqual(emptyTennisScore());
      expect(match(store, 'm6').score).toBe('0-0');

      expect(() => {
        events.emit({ type: 'TENNIS_SCORE_UPDATE', matchId: 'm6', tennisUpdate: { home: '15', away: '0' } });
      }).not.toThrow();
    });
  });

  describe('Loading skeleton default delay', () => {
    it('numbers a missing ?loadMs param as 900ms instead of 0ms', () => {
      expect(parseLoadDelay('')).toBe(900);
      expect(parseLoadDelay('?sim=off')).toBe(900);
      expect(parseLoadDelay('?loadMs=')).toBe(900);
      expect(parseLoadDelay('?loadMs=abc')).toBe(900);
    });

    it('clamps explicit values', () => {
      expect(parseLoadDelay('?loadMs=0')).toBe(0);
      expect(parseLoadDelay('?loadMs=3000')).toBe(3000);
      expect(parseLoadDelay('?loadMs=-5')).toBe(0);
      expect(parseLoadDelay('?loadMs=999999')).toBe(10000);
      expect(parseLoadDelay('?sim=off&loadMs=1200')).toBe(1200);
    });

    it('keeps the skeleton visible for the default window in a normal browser session', fakeAsync(() => {
      const { store } = configureStore();
      TestBed.flushEffects();

      expect(store.loading()).toBe(true);
      tick(899);
      expect(store.loading()).toBe(true);
      tick(1);
      expect(store.loading()).toBe(false);
    }));
  });

  describe('Simulator reads live store state', () => {
    let store: MatchesStore;
    let service: MockLiveEventService;

    beforeEach(() => {
      TestBed.configureTestingModule({});
      store = TestBed.inject(MatchesStore);
      service = TestBed.inject(MockLiveEventService);
    });

    afterEach(() => {
      TestBed.resetTestingModule();
    });

    it('picks from the live store, not the frozen seed, each tick', () => {
      // Tick 1: index 0 -> m1, rand 0.99 -> finish m1.
      // Tick 2 (live now m3,m5,m7): index 0 -> m3, rand 0.99 -> finish m3.
      stubRandomSequence(0, 0.99, 0, 0.99);

      service.tick();
      expect(match(store, 'm1').status).toBe('finished');
      expect(match(store, 'm3').status).toBe('live');

      service.tick();
      // With frozen seeds the second pick would be m1 again; live state goes m3.
      expect(match(store, 'm3').status).toBe('finished');
      expect(match(store, 'm5').status).toBe('live');
    });

    it('promotes a scheduled tennis match to live once everything else finishes (and bootstraps its score)', () => {
      stubRandomSequence(0, 0.99, 0, 0.99, 0, 0.99, 0, 0.99, 0.5);

      service.tick(); // m1 finishes
      service.tick(); // m3 finishes
      service.tick(); // m5 finishes
      service.tick(); // m7 finishes
      service.tick(); // live empty -> promote scheduled[floor(0.5*4)] -> m6 (tennis)

      expect(match(store, 'm6').status).toBe('live');
      expect(match(store, 'm6').tennisScore).toEqual(emptyTennisScore());

      // The freshly-promoted match keeps the feed alive.
      stubRandomSequence(0, 0.5);
      service.tick();
      expect(match(store, 'm6').tennisScore!.currentSet).toBeDefined();
    });

    it('lets the generative away player win a full set (generator is not home-only)', () => {
      // Every tick: index 0.5 -> m5 (live[2] of four), rand 0.8 -> tennis point,
      // then 0 -> the away player scores the point. Three away points take a game,
      // so six consecutive away games push a set to the away player.
      const values = [0.5, 0.8, 0];
      let i = 0;
      const rand = Math.random as unknown as { and?: { callFake(fn: () => number): void } };
      if (rand.and) {
        rand.and.callFake(() => values[i++ % values.length]);
      } else {
        spyOn(Math, 'random').and.callFake(() => values[i++ % values.length]);
      }


      for (let t = 0; t < 40; t++) {
        service.tick();
      }

      expect(match(store, 'm5').tennisScore!.setsWon.away).toBeGreaterThan(0);
      expect(match(store, 'm5').tennisScore!.setsWon.home).toBe(1);
    });
  });

  describe('Long seeded simulation', () => {
    it('produces diverse scores, no draw odds, bounded tennis, and a healthy feed', function () {
      TestBed.configureTestingModule({});
      let activeRandom: () => number = () => 0.5;
      spyOn(Math, 'random').and.callFake(() => activeRandom());

      const soccerScores = new Set<string>();
      const basketballScores = new Set<string>();
      let maxLiveCount = 0;
      let scheduledWentLive = false;
      let drawDrift = false;
      let tennisRunaway = false;

      // A single run's random draw is not guaranteed to push every sport far
      // enough, so sample several deterministic seeds and assert on the union.
      const RUNS = 10;
      const TICKS = 2000;

      for (let run = 0; run < RUNS; run++) {
        if (run > 0) {
          TestBed.resetTestingModule();
          TestBed.configureTestingModule({});
        }
        const store = TestBed.inject(MatchesStore);
        const service = TestBed.inject(MockLiveEventService);
        service.pause();
        activeRandom = prng(run * 7919 + 13);

        for (let i = 0; i < TICKS; i++) {
          service.tick();

          const matches = store.matches();
          const liveCount = matches.filter(m => m.status === 'live').length;
          if (liveCount > maxLiveCount) maxLiveCount = liveCount;

          for (const m of matches) {
            if (m.sport === 'soccer' && m.score) soccerScores.add(m.score);
            if (m.sport === 'basketball' && m.score) basketballScores.add(m.score);

            if (m.sport === 'tennis' && m.tennisScore) {
              if (m.tennisScore.setsWon.home > 2 || m.tennisScore.setsWon.away > 2) {
                tennisRunaway = true;
              }
            }

            // Draw odds must stay absent for every non-soccer sport.
            if (m.sport !== 'soccer' && m.odds['X'] !== 0) {
              drawDrift = true;
            }
          }
        }

        for (const m of store.matches()) {
          if (['m2', 'm4', 'm6', 'm8'].includes(m.id) && m.status !== 'scheduled') {
            scheduledWentLive = true;
          }
        }

        TestBed.resetTestingModule();
      }

      // The old simulator only ever produced 2-1/2-2/3-1/3-2 for soccer...
      expect(soccerScores.size).toBeGreaterThan(4);
      // ...and only 88-89 vs 92-93 for basketball.
      expect(basketballScores.size).toBeGreaterThan(2);
      // No runaway 17-set tennis star; a single player cannot rack up sets.
      expect(tennisRunaway).toBe(false);
      expect(drawDrift).toBe(false);
      // The feed survives: scheduled matches go live after the originals finish.
      expect(scheduledWentLive).toBe(true);
      expect(maxLiveCount).toBeGreaterThan(4);
    }, 60000);
  });

  describe('Bet slip rules live at the store level', () => {
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

    it('rejects a bet on a finished match instead of leaving it in the slip', () => {
      store.addSelection(slipItem('m1', '1', 2.0, 1000));
      expect(store.totalStake()).toBe(1000);

      events.emit({ type: 'STATUS_CHANGE', matchId: 'm1', oldStatus: 'live', newStatus: 'finished' });
      TestBed.flushEffects();
      expect(store.hasSelection('m1', '1')).toBe(false);

      store.addSelection(slipItem('m1', '1', 2.0, 1000));
      expect(store.hasSelection('m1', '1')).toBe(false);
    });

    it('invalid stakes cannot poison the store totals', () => {
      store.addSelection(slipItem('m1', '1', 2.0, 1000));

      store.updateStake('m1', '1', NaN);
      store.updateStake('m1', '1', Infinity);

      expect(store.totalStake()).toBe(1000);
      expect(store.totalPayout()).toBe(2000);
      expect(Number.isNaN(store.totalStake())).toBe(false);
      expect(Number.isNaN(store.totalPayout())).toBe(false);
    });

    it('sanitizes negative, fractional and oversized input to integer cents within the cap', () => {
      expect(sanitizeStakeCents(-5)).toBe(0);
      expect(sanitizeStakeCents(12.345)).toBe(12);
      expect(sanitizeStakeCents(MAX_STAKE_CENTS * 10)).toBe(MAX_STAKE_CENTS);
      expect(toCents(0.1)).toBe(10);
      expect(toCents(0.2)).toBe(20);
    });
  });

  describe('Theme service does not persist the OS preference', () => {
    class FakeStorage {
      private readonly data = new Map<string, string>();
      get length(): number { return this.data.size; }
      clear(): void { this.data.clear(); }
      getItem(key: string): string | null { return this.data.get(key) ?? null; }
      key(index: number): string | null { return Array.from(this.data.keys())[index] ?? null; }
      removeItem(key: string): void { this.data.delete(key); }
      setItem(key: string, value: string): void { this.data.set(key, value); }
    }

    function createThemeDocument(initialDark: boolean, storage: FakeStorage) {
      const listeners: Array<(event: { matches: boolean }) => void> = [];
      const mediaQuery: MediaQueryList = {
        matches: initialDark,
        media: '(prefers-color-scheme: dark)',
        addEventListener: (_type: string, cb: unknown) => {
          listeners.push(cb as (event: { matches: boolean }) => void);
        },
        removeEventListener: () => undefined
      } as unknown as MediaQueryList;

      let dataTheme: string | null = null;
      const documentElement = {
        setAttribute: (name: string, value: string) => {
          if (name === 'data-theme') dataTheme = value;
        }
      } as unknown as HTMLElement;

      const document = {
        documentElement,
        defaultView: { matchMedia: () => mediaQuery, localStorage: storage }
      } as unknown as Document;

      return { document, listeners, getDataTheme: () => dataTheme };
    }

    it('constructing the service never writes the OS preference to storage', () => {
      const storage = new FakeStorage();
      const { document, getDataTheme } = createThemeDocument(true, storage);

      TestBed.configureTestingModule({
        providers: [{ provide: DOCUMENT, useValue: document }]
      });
      const theme = TestBed.inject(ThemeService);

      expect(theme.theme()).toBe('dark');
      expect(storage.getItem('oddsfeed-theme')).toBeNull();
      expect(getDataTheme()).toBe('dark');
    });

    it('follows OS theme changes until the user toggles, then the choice wins', () => {
      const storage = new FakeStorage();
      const { document, listeners, getDataTheme } = createThemeDocument(false, storage);

      TestBed.configureTestingModule({
        providers: [{ provide: DOCUMENT, useValue: document }]
      });
      const theme = TestBed.inject(ThemeService);

      expect(theme.theme()).toBe('light');
      expect(storage.getItem('oddsfeed-theme')).toBeNull();

      listeners.forEach(cb => cb({ matches: true }));
      expect(theme.theme()).toBe('dark');
      expect(storage.getItem('oddsfeed-theme')).toBeNull();

      theme.toggle(); // dark -> light, a real user choice
      expect(theme.theme()).toBe('light');
      expect(storage.getItem('oddsfeed-theme')).toBe('light');
      expect(getDataTheme()).toBe('light');

      listeners.forEach(cb => cb({ matches: true }));
      expect(theme.theme()).toBe('light'); // stored choice overrides OS
    });
  });

  describe('Bet slip UI', () => {
    beforeEach(() => {
      const events = new FakeLiveEventService();
      TestBed.configureTestingModule({
        imports: [BetSlipComponent],
        providers: [{ provide: MockLiveEventService, useValue: events }]
      });
    });

    it('renders odds as a plain number, not a currency', () => {
      const store = TestBed.inject(BetSlipStore);
      store.addSelection(slipItem('m1', '1', 2.1, 1000));

      const fixture = TestBed.createComponent(BetSlipComponent);
      fixture.detectChanges();

      const odds = fixture.nativeElement.querySelector('[data-cy="slip-odds"]') as HTMLElement;
      expect(odds.textContent?.trim()).toBe('2.10');
      expect(odds.textContent).not.toContain('€');
    });

    it('writes the clamped stake back into the input so negative text cannot linger', () => {
      const store = TestBed.inject(BetSlipStore);
      store.addSelection(slipItem('m1', '1', 2.0, 1000));

      const fixture = TestBed.createComponent(BetSlipComponent);
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('[data-cy="slip-stake-input"]') as HTMLInputElement;
      expect(input.value).toBe('10');

      // Typing -5 clamps to 0; the one-way binding alone would not refresh the DOM.
      input.value = '-5';
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(store.items()[0].stake).toBe(0);
      expect(input.value).toBe('0');
    });

    it('reflects an over-maximum stake back as the capped amount', () => {
      const store = TestBed.inject(BetSlipStore);
      store.addSelection(slipItem('m1', '1', 2.0, 1000));

      const fixture = TestBed.createComponent(BetSlipComponent);
      fixture.detectChanges();

      const input = fixture.nativeElement.querySelector('[data-cy="slip-stake-input"]') as HTMLInputElement;
      input.value = '999999999';
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(store.items()[0].stake).toBe(MAX_STAKE_CENTS);
      expect(input.value).toBe(String(MAX_STAKE_CENTS / 100));
    });
  });
});