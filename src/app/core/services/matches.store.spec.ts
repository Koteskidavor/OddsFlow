import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MatchesStore, MatchTrend } from './matches.store';
import { MockLiveEventService } from './mock-live-event.service';
import { LiveEvent } from '../models/live-event.model';
import { TrendInfo } from '../models/odds-trend.model';

class FakeLiveEventService {
  readonly subject = new Subject<LiveEvent>();
  readonly events$ = this.subject.asObservable();

  emit(event: LiveEvent) {
    this.subject.next(event);
  }
}

describe('MatchesStore', () => {
  let store: MatchesStore;
  let events: FakeLiveEventService;

  beforeEach(() => {
    events = new FakeLiveEventService();
    TestBed.configureTestingModule({
      providers: [{ provide: MockLiveEventService, useValue: events }]
    });
    store = TestBed.inject(MatchesStore);
  });

  function match(id: string): MatchTrend | undefined {
    return store.matches().find(m => m.id === id);
  }

  function trendOf(id: string, selection: string): TrendInfo {
    return match(id)!.trends[selection];
  }

  describe('ODDS_UPDATE', () => {
    it('updates only the targeted match and selection', () => {
      expect(match('m1')!.odds['1']).toBe(2.1);
      expect(match('m1')!.odds['X']).toBe(3.4);
      expect(match('m1')!.odds['2']).toBe(3.1);
      expect(match('m3')!.odds['1']).toBe(1.9);
      expect(match('m5')!.odds['1']).toBe(1.8);

      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '1', newOdds: 3.0 });

      expect(match('m1')!.odds['1']).toBe(3.0);
      expect(match('m1')!.odds['X']).toBe(3.4);
      expect(match('m1')!.odds['2']).toBe(3.1);
      expect(match('m3')!.odds['1']).toBe(1.9);
      expect(match('m5')!.odds['1']).toBe(1.8);
    });

    it('ignores updates for non-live matches', () => {
      expect(match('m2')!.status).toBe('scheduled');

      events.emit({ type: 'ODDS_UPDATE', matchId: 'm2', selection: '1', newOdds: 9.9 });
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm4', selection: '1', newOdds: 9.9 });
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm6', selection: '2', newOdds: 9.9 });
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm8', selection: '2', newOdds: 9.9 });

      expect(match('m2')!.odds['1']).toBe(1.7);
      expect(match('m4')!.odds['1']).toBe(2.2);
      expect(match('m6')!.odds['2']).toBe(2.8);
      expect(match('m8')!.odds['2']).toBe(2.2);
      expect(match('m2')!.trends['1']).toBeUndefined();
    });

    it('ignores updates with zero odds', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '1', newOdds: 0 });

      expect(match('m1')!.odds['1']).toBe(2.1);
      expect(match('m1')!.trends['1']).toBeUndefined();
    });

    it('ignores updates with negative odds', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm7', selection: '2', newOdds: -1.5 });

      expect(match('m7')!.odds['2']).toBe(2.0);
      expect(match('m7')!.trends['2']).toBeUndefined();
    });
  });

  describe('trend calculation', () => {
    it('records an "up" trend when odds increase relative to the previous value', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '2', newOdds: 3.5 });

      expect(match('m1')!.odds['2']).toBe(3.5);
      expect(trendOf('m1', '2').direction).toBe('up');
    });

    it('records a "down" trend when odds decrease relative to the previous value', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '2', newOdds: 2.8 });

      expect(trendOf('m1', '2').direction).toBe('down');
    });

    it('records "neutral" when the odds are unchanged', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '1', newOdds: 2.1 });

      expect(trendOf('m1', '1').direction).toBe('neutral');
    });

    it('compares each update against the latest previous value', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '1', newOdds: 2.6 });
      expect(trendOf('m1', '1').direction).toBe('up');

      events.emit({ type: 'ODDS_UPDATE', matchId: 'm1', selection: '1', newOdds: 2.2 });
      expect(trendOf('m1', '1').direction).toBe('down');
    });
  });

  describe('esports', () => {
    it('applies ODDS_UPDATE to only the targeted esports match and selection', () => {
      expect(match('m7')!.odds['1']).toBe(1.8);
      expect(match('m7')!.odds['2']).toBe(2.0);
      expect(match('m8')!.odds['1']).toBe(1.6);

      events.emit({ type: 'ODDS_UPDATE', matchId: 'm7', selection: '2', newOdds: 2.4 });

      expect(match('m7')!.odds['2']).toBe(2.4);
      expect(match('m7')!.odds['1']).toBe(1.8);
      expect(match('m7')!.trends['2'].direction).toBe('up');
      expect(match('m8')!.odds['1']).toBe(1.6);
      expect(match('m8')!.trends['2']).toBeUndefined();
      expect(match('m1')!.odds['1']).toBe(2.1);
    });

    it('ignores ODDS_UPDATE for scheduled esports matches', () => {
      events.emit({ type: 'ODDS_UPDATE', matchId: 'm8', selection: '1', newOdds: 5.0 });

      expect(match('m8')!.odds['1']).toBe(1.6);
      expect(match('m8')!.trends['1']).toBeUndefined();
    });

    it('updates the esports score only for the targeted match', () => {
      events.emit({ type: 'SCORE_UPDATE', matchId: 'm7', homeScore: 1, awayScore: 1 });

      expect(match('m7')!.score).toBe('1-1');
      expect(match('m1')!.score).toBe('2-1');
      expect(match('m3')!.score).toBe('88-92');
      expect(match('m5')!.score).toBe('2-1');
    });
  });

  describe('SCORE_UPDATE', () => {
    it('updates only the targeted match', () => {
      events.emit({ type: 'SCORE_UPDATE', matchId: 'm1', homeScore: 3, awayScore: 1 });

      expect(match('m1')!.score).toBe('3-1');
      expect(match('m2')!.score).toBeUndefined();
      expect(match('m3')!.score).toBe('88-92');
      expect(match('m5')!.score).toBe('2-1');
    });

    it('ignores plain SCORE_UPDATE for tennis matches', () => {
      events.emit({ type: 'SCORE_UPDATE', matchId: 'm5', homeScore: 9, awayScore: 9 });

      expect(match('m5')!.tennisScore?.currentSet).toEqual({ home: '30', away: '15' });
      expect(match('m5')!.score).toBe('2-1');
    });
  });

  describe('TENNIS_SCORE_UPDATE', () => {
    it('applies tennis updates only to the targeted tennis match', () => {
      events.emit({
        type: 'TENNIS_SCORE_UPDATE',
        matchId: 'm5',
        tennisUpdate: { home: '30', away: '30' }
      });

      expect(match('m5')!.tennisScore?.currentSet).toEqual({ home: '30', away: '30' });
      expect(match('m5')!.tennisScore?.setsWon).toEqual({ home: 1, away: 0 });
      expect(match('m1')!.score).toBe('2-1');
      expect(match('m3')!.score).toBe('88-92');
    });

    it('ignores tennis updates for non-tennis matches', () => {
      events.emit({
        type: 'TENNIS_SCORE_UPDATE',
        matchId: 'm1',
        tennisUpdate: { home: '40', away: '0' }
      });

      expect(match('m1')!.score).toBe('2-1');
    });
  });
});