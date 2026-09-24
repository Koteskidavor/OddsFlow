import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Match, SportType, OddsSelection } from '../models/match.model';
import { LiveEvent } from '../models/live-event.model';
import { TrendInfo } from '../models/odds-trend.model';
import { SEED_MATCHES } from '../data/seed-matches';
import { MockLiveEventService } from './mock-live-event.service';

export interface MatchTrend extends Match {
  trends: Record<string, TrendInfo>;
}

@Injectable({
  providedIn: 'root'
})
export class MatchesStore {
  private readonly liveEventService = inject(MockLiveEventService);
  private readonly destroyRef = inject(DestroyRef);

  /** Simulated fetch latency so the UI can exercise its loading state. */
  public readonly loading = signal(true);

  private readonly _matchesMap = signal<Record<string, MatchTrend>>(
    SEED_MATCHES.reduce((acc, m) => ({ 
      ...acc, 
      [m.id]: { ...m, trends: {} } 
    }), {} as Record<string, MatchTrend>)
  );

  /** Last applied odds per `matchId::selection`, used to derive trends. */
  private readonly previousOdds = new Map<string, number>();

  public readonly matches = computed(() => Object.values(this._matchesMap()));

  public readonly liveMatches = computed(() =>
    this.matches().filter(m => m.status === 'live')
  );

  public getMatchesBySport(sport: SportType) {
    return this.matches().filter(m => m.sport === sport);
  }

  constructor() {
    this.liveEventService.events$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.updateFromEvent(event));

    this.beginLoadingDelay();
  }

  private beginLoadingDelay() {
    const delay = this.resolveLoadDelay();
    if (delay === 0) {
      this.loading.set(false);
      return;
    }
    setTimeout(() => this.loading.set(false), delay);
  }

  private resolveLoadDelay(): number {
    if (typeof window === 'undefined') return 900;
    const parsed = Number(new URLSearchParams(window.location.search).get('loadMs'));
    if (!Number.isFinite(parsed)) return 900;
    return Math.min(10000, Math.max(0, parsed));
  }

  private updateFromEvent(event: LiveEvent) {
    this._matchesMap.update(map => {
      const match = map[event.matchId];
      if (!match) return map;

      let updatedMatch: MatchTrend;

      switch (event.type) {
        case 'ODDS_UPDATE':
          if (match.status !== 'live') return map;
          if (!(event.newOdds > 0)) return map;
          updatedMatch = this.applyOddsUpdate(match, event.selection, event.newOdds);
          break;

        case 'SCORE_UPDATE':
          if (match.status !== 'live' || match.sport === 'tennis') return map;
          updatedMatch = { ...match, score: `${event.homeScore}-${event.awayScore}` };
          break;

        case 'TENNIS_SCORE_UPDATE':
          if (match.status !== 'live' || match.sport !== 'tennis') return map;
          updatedMatch = this.applyTennisUpdate(match, event.tennisUpdate);
          break;

        case 'STATUS_CHANGE':
          if (match.status === 'finished' || event.newStatus === match.status) return map;
          updatedMatch = { ...match, status: event.newStatus };
          break;

        default:
          return map;
      }

      return { ...map, [event.matchId]: updatedMatch };
    });
  }

  private applyOddsUpdate(match: MatchTrend, selection: OddsSelection, newOdds: number): MatchTrend {
    const key = `${match.id}::${selection}`;
    const previous = this.previousOdds.get(key) ?? match.odds[selection] ?? 0;
    const direction = newOdds > previous ? 'up' : newOdds < previous ? 'down' : 'neutral';
    this.previousOdds.set(key, newOdds);

    return {
      ...match,
      odds: { ...match.odds, [selection]: newOdds },
      trends: {
        ...match.trends,
        [selection]: { direction, timestamp: Date.now() }
      }
    };
  }

  private applyTennisUpdate(
    match: MatchTrend,
    update: { home: string; away: string }
  ): MatchTrend {
    const { home, away } = update;
    const setsWon = { ...match.tennisScore!.setsWon };
    const sets = [...(match.tennisScore?.sets || [])];
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

    return {
      ...match,
      tennisScore: { sets, currentSet, setsWon },
      score: `${setsWon.home}-${setsWon.away}`
    };
  }
}