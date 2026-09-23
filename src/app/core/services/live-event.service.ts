import { Injectable } from '@angular/core';
import { interval, Observable, Subject } from 'rxjs';
import { LiveEvent, LiveEventType } from '../models/live-event.model';
import { SEED_MATCHES } from '../data/seed-matches';

@Injectable({
  providedIn: 'root'
})
export class LiveEventService {
  private readonly _events = new Subject<LiveEvent>();
  public readonly events$: Observable<LiveEvent> = this._events.asObservable();

  constructor() {
    interval(2500).subscribe(() => this.emitRandomEvent());
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
        selection: '1',
        newOdds: parseFloat((Math.random() * 5 + 1).toFixed(2))
      };
    } else if (rand < 0.9) {
      event = {
        type: 'SCORE_UPDATE',
        matchId: match.id,
        homeScore: Math.floor(Math.random() * 5),
        awayScore: Math.floor(Math.random() * 5)
      };
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
