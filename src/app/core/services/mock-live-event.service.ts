import { Injectable, inject, DestroyRef } from '@angular/core';
import { interval, Observable, Subject, Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LiveEvent } from '../models/live-event.model';
import { Match, OddsSelection } from '../models/match.model';

/**
 * Simulates a live data feed (odds, scores, status changes) so the app can be
 * exercised without a backend. Pass `?sim=off` in the URL to pause the feed,
 * which gives deterministic conditions for E2E tests.
 *
 * The simulator reads the current live state through {@link setMatchesSource},
 * so it always acts on what the store has already applied rather than on the
 * frozen seed data. Scheduled matches are promoted to live over time so the
 * feed keeps producing even once every initial match has finished.
 */
@Injectable({
  providedIn: 'root'
})
export class MockLiveEventService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _events = new Subject<LiveEvent>();
  public readonly events$: Observable<LiveEvent> = this._events.asObservable();

  private matchesSource: (() => readonly Match[]) | null = null;
  private intervalSub: Subscription | null = null;

  constructor() {
    const simulationPaused =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('sim') === 'off';

    if (simulationPaused) return;

    this.intervalSub = interval(2500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.tick());
  }

  /** Stops the real-time clock so tests can drive tick() without interference. */
  pause(): void {
    this.intervalSub?.unsubscribe();
    this.intervalSub = null;
  }

  /** Lets the store feed the simulator its live state instead of SEED_MATCHES. */
  setMatchesSource(source: () => readonly Match[]): void {
    this.matchesSource = source;
  }

  /** Advance the simulation one step. Public so tests can drive it deterministically. */
  tick(): void {
    const currentMatches = this.matchesSource ? this.matchesSource() : [];
    const live = currentMatches.filter(m => m.status === 'live');
    const scheduled = currentMatches.filter(m => m.status === 'scheduled');

    if (live.length === 0) {
      if (scheduled.length === 0) return;
      const next = scheduled[Math.floor(Math.random() * scheduled.length)];
      this._events.next({
        type: 'STATUS_CHANGE',
        matchId: next.id,
        oldStatus: 'scheduled',
        newStatus: 'live'
      });
      return;
    }

    const match = live[Math.floor(Math.random() * live.length)];
    const rand = Math.random();

    if (rand < 0.7) {
      this.emitOddsUpdate(match);
    } else if (rand < 0.94) {
      this.emitScoreUpdate(match);
    } else if (rand < 0.99) {
      // Keep the feed alive by bringing a scheduled match in, when any remain.
      if (scheduled.length > 0) {
        const next = scheduled[Math.floor(Math.random() * scheduled.length)];
        this._events.next({
          type: 'STATUS_CHANGE',
          matchId: next.id,
          oldStatus: 'scheduled',
          newStatus: 'live'
        });
      } else {
        this.finish(match);
      }
    } else {
      this.finish(match);
    }
  }

  private emitOddsUpdate(match: Match): void {
    // Non-soccer sports have no draw market; only price their real outcomes.
    const selections: OddsSelection[] = match.sport === 'soccer' ? ['1', 'X', '2'] : ['1', '2'];
    const selection = selections[Math.floor(Math.random() * selections.length)];
    const newOdds = parseFloat((Math.random() * 5 + 1).toFixed(2));
    this._events.next({ type: 'ODDS_UPDATE', matchId: match.id, selection, newOdds });
  }

  private emitScoreUpdate(match: Match): void {
    if (match.sport === 'tennis') {
      const current = match.tennisScore?.currentSet ?? { home: '0', away: '0' };
      const tennisPoints = ['0', '15', '30', '40'];
      const homeIdx = Math.max(0, tennisPoints.indexOf(current.home));
      const awayIdx = Math.max(0, tennisPoints.indexOf(current.away));

      const homeWinPoint = Math.random() > 0.5;
      const nextHome = homeWinPoint
        ? tennisPoints[Math.min(homeIdx + 1, 3)]
        : current.home;
      const nextAway = !homeWinPoint
        ? tennisPoints[Math.min(awayIdx + 1, 3)]
        : current.away;

      this._events.next({
        type: 'TENNIS_SCORE_UPDATE',
        matchId: match.id,
        tennisUpdate: { home: nextHome, away: nextAway }
      });
      return;
    }

    const currentScore = parseScore(match.score);
    const homeIncrement = Math.random() > 0.5 ? 1 : 0;
    const awayIncrement = Math.random() > 0.5 ? 1 : 0;

    this._events.next({
      type: 'SCORE_UPDATE',
      matchId: match.id,
      homeScore: currentScore[0] + homeIncrement,
      awayScore: currentScore[1] + awayIncrement
    });
  }

  private finish(match: Match): void {
    this._events.next({
      type: 'STATUS_CHANGE',
      matchId: match.id,
      oldStatus: 'live',
      newStatus: 'finished'
    });
  }
}

function parseScore(score?: string): [number, number] {
  if (typeof score !== 'string') return [0, 0];
  const parts = score.split('-').map(Number);
  const home = Number.isFinite(parts[0]) && parts[0] > 0 ? parts[0] : 0;
  const away = Number.isFinite(parts[1]) && parts[1] > 0 ? parts[1] : 0;
  return [home, away];
}