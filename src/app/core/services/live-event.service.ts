import { Injectable, inject, DestroyRef } from '@angular/core';
import { interval, Observable, Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LiveEvent } from '../models/live-event.model';
import { SEED_MATCHES } from '../data/seed-matches';

@Injectable({
  providedIn: 'root'
})
export class LiveEventService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly _events = new Subject<LiveEvent>();
  public readonly events$: Observable<LiveEvent> = this._events.asObservable();

  constructor() {
    const simulationPaused =
      typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).has('sim=off');

    if (simulationPaused) return;

    interval(2500)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.emitRandomEvent());
  }

  private emitRandomEvent() {
    const liveMatches = SEED_MATCHES.filter(m => m.status === 'live');
    if (liveMatches.length === 0) return;

    const match = liveMatches[Math.floor(Math.random() * liveMatches.length)];
    const rand = Math.random();

    let event: LiveEvent;

    if (rand < 0.7) {
      event = {
        type: 'ODDS_UPDATE',
        matchId: match.id,
        selection: ['1', 'X', '2'][Math.floor(Math.random() * 3)],
        newOdds: parseFloat((Math.random() * 5 + 1).toFixed(2))
      };
    } else if (rand < 0.94) {
      if (match.sport === 'tennis') {
        // Specialized Tennis Scoring Logic
        const tennisPoints = ['0', '15', '30', '40'];
        const current = match.tennisScore?.currentSet || { home: '0', away: '0' };

        const homeIdx = tennisPoints.indexOf(current.home);
        const awayIdx = tennisPoints.indexOf(current.away);

        const homeWinPoint = Math.random() > 0.5;
        const nextHome = homeWinPoint ? (tennisPoints[homeIdx + 1] || '40') : current.home;
        const nextAway = !homeWinPoint ? (tennisPoints[awayIdx + 1] || '40') : current.away;

        event = {
          type: 'SCORE_UPDATE',
          matchId: match.id,
          homeScore: 0,
          awayScore: 0
        };
        (event as any).tennisUpdate = { home: nextHome, away: nextAway };
      } else {
        const currentScore = match.score?.split('-').map(Number) || [0, 0];
        const homeIncrement = Math.random() > 0.5 ? 1 : 0;
        const awayIncrement = Math.random() > 0.5 ? 1 : 0;

        event = {
          type: 'SCORE_UPDATE',
          matchId: match.id,
          homeScore: Math.floor(currentScore[0] + homeIncrement),
          awayScore: Math.floor(currentScore[1] + awayIncrement)
        };
      }
    } else {
      event = {
        type: 'STATUS_CHANGE',
        matchId: match.id,
        oldStatus: match.status,
        newStatus: 'finished'
      };
    }

    this._events.next(event);
  }

}

