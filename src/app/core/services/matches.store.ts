import { Injectable, signal, computed, inject } from '@angular/core';
import { Match, SportType } from '../models/match.model';
import { LiveEvent } from '../models/live-event.model';
import { SEED_MATCHES } from '../data/seed-matches';
import { LiveEventService } from './live-event.service';

export interface MatchTrend extends Match {
  trends: Record<string, 'up' | 'down' | 'neutral'>;
}

@Injectable({
  providedIn: 'root'
})
export class MatchesStore {
  private readonly liveEventService = inject(LiveEventService);

  private readonly _matchesMap = signal<Record<string, MatchTrend>>(
    SEED_MATCHES.reduce((acc, m) => ({
      ...acc,
      [m.id]: { ...m, trends: {} }
    }), {} as Record<string, MatchTrend>)
  );

  public readonly matches = computed(() => Object.values(this._matchesMap()));

  public readonly liveMatches = computed(() =>
    this.matches().filter(m => m.status === 'live')
  );

  public getMatchesBySport(sport: SportType) {
    return this.matches().filter(m => m.sport === sport);
  }

  constructor() {
    this.liveEventService.events$.subscribe(event => this.updateFromEvent(event));
  }

  private updateFromEvent(event: LiveEvent) {
    this._matchesMap.update(map => {
      const match = map[event.matchId];
      if (!match) return map;

      let updatedMatch: MatchTrend;

      switch (event.type) {
        case 'ODDS_UPDATE':
          const currentOdds = match.odds[event.selection as keyof typeof match.odds] || 0;
          const trend = event.newOdds > currentOdds ? 'up' : event.newOdds < currentOdds ? 'down' : 'neutral';
          updatedMatch = {
            ...match,
            odds: { ...match.odds, [event.selection]: event.newOdds },
            trends: { ...match.trends, [event.selection]: trend }
          };
          break;

        case 'SCORE_UPDATE':
          if (match.sport === 'tennis') {
            const update = (event as any).tennisUpdate;
            if (!update) return map;

            let { home, away } = update;
            let setsWon = { ...match.tennisScore!.setsWon };
            let sets = [...(match.tennisScore?.sets || [])];
            let currentSet = { home, away };

            if (home === '40' && (away === '0' || away === '15' || away === '30')) {
              setsWon.home++;
              sets.push({ home: 6, away: 0 });
              currentSet = { home: '0', away: '0' };
            } else if (away === '40' && (home === '0' || home === '15' || home === '30')) {
              setsWon.away++;
              sets.push({ home: 0, away: 6 });
              currentSet = { home: '0', away: '0' };
            }

            updatedMatch = {
              ...match,
              tennisScore: { sets, currentSet, setsWon },
              score: `${setsWon.home}-${setsWon.away}`
            };
          } else {
            updatedMatch = { ...match, score: `${event.homeScore}-${event.awayScore}` };
          }
          break;
        case 'STATUS_CHANGE':
          updatedMatch = { ...match, status: event.newStatus as any };
          break;
        default:
          return map;
      }

      return { ...map, [event.matchId]: updatedMatch };
    });
  }
}
