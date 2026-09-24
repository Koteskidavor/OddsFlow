import { Injectable, signal, computed, inject, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Match, SportType, OddsSelection, MatchStatus } from '../models/match.model';
import { LiveEvent } from '../models/live-event.model';
import { TrendInfo } from '../models/odds-trend.model';
import { SEED_MATCHES } from '../data/seed-matches';
import { MockLiveEventService } from './mock-live-event.service';

export interface MatchTrend extends Match {
  trends: Record<string, TrendInfo>;
}

export function emptyTennisScore() {
  return {
    sets: [] as { home: number; away: number }[],
    currentSet: { home: '0', away: '0' },
    setsWon: { home: 0, away: 0 },
    games: { home: 0, away: 0 }
  };
}

/** Resolves the simulated fetch delay (ms). Defaults to 900 when absent/invalid. */
export function parseLoadDelay(search: string): number {
  const params = new URLSearchParams(search.replace(/^\?/, ''));
  const raw = params.get('loadMs');
  if (raw === null || raw.trim() === '') return 900;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 900;
  return Math.min(10000, Math.max(0, parsed));
}

/** Only soccer has a priced draw market; the other sports have no 'X' outcome. */
export function isSelectionValidForSport(sport: SportType, selection: OddsSelection): boolean {
  if (selection === 'X') return sport === 'soccer';
  return true;
}

/** Legal status moves. finished/cancelled are terminal. */
export const STATUS_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  scheduled: ['live', 'cancelled'],
  live: ['finished', 'cancelled'],
  finished: [],
  cancelled: []
};

const SETS_TO_WIN = 2; // best of three
const GAMES_TO_WIN_SET = 6;

function winningSide(points: { home: string; away: string }): 'home' | 'away' | null {
  const at40 = (p: string) => p === '40';
  if (at40(points.home) && !at40(points.away)) return 'home';
  if (at40(points.away) && !at40(points.home)) return 'away';
  return null;
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

    // The simulator must read live store state, not the frozen seed data.
    this.liveEventService.setMatchesSource(() => this.matches());

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
    return parseLoadDelay(window.location.search);
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
          if (!isSelectionValidForSport(match.sport, event.selection)) return map;
          updatedMatch = this.applyOddsUpdate(match, event.selection, event.newOdds);
          break;

        case 'SCORE_UPDATE':
          if (match.status !== 'live' || match.sport === 'tennis') return map;
          if (!Number.isFinite(event.homeScore) || !Number.isFinite(event.awayScore)) return map;
          updatedMatch = {
            ...match,
            score: `${Math.max(0, event.homeScore)}-${Math.max(0, event.awayScore)}`
          };
          break;

        case 'TENNIS_SCORE_UPDATE':
          if (match.status !== 'live' || match.sport !== 'tennis') return map;
          updatedMatch = this.applyTennisUpdate(match, event.tennisUpdate);
          break;

        case 'STATUS_CHANGE':
          if (event.newStatus === match.status) return map;
          if (!STATUS_TRANSITIONS[match.status].includes(event.newStatus)) return map;
          updatedMatch = { ...match, status: event.newStatus };
          if (
            event.newStatus === 'live' &&
            match.sport === 'tennis' &&
            !updatedMatch.tennisScore
          ) {
            updatedMatch = { ...updatedMatch, tennisScore: emptyTennisScore(), score: '0-0' };
          }
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

  /**
   * Tennis scoring:
   * - 0 -> 15 -> 30 -> 40 (points within a game)
   * - a point that leaves one side on 40 against a lower score wins ONE game
   * - 6 games with a 2-game lead wins a SET
   * - first to <SETS_TO_WIN> sets finishes the match
   */
  private applyTennisUpdate(
    match: MatchTrend,
    update: { home: string; away: string }
  ): MatchTrend {
    const base = match.tennisScore ?? emptyTennisScore();
    const setsWon = { ...base.setsWon };
    const sets = [...base.sets];
    const games = { ...base.games };
    let currentSet = { home: update.home, away: update.away };

    const gameWinner = winningSide(update);
    if (gameWinner) {
      games[gameWinner]++;
      currentSet = { home: '0', away: '0' };
    }

    const homeWinsSet = games.home >= GAMES_TO_WIN_SET && games.home - games.away >= 2;
    const awayWinsSet = games.away >= GAMES_TO_WIN_SET && games.away - games.home >= 2;
    if (homeWinsSet || awayWinsSet) {
      const winner = homeWinsSet ? 'home' : 'away';
      setsWon[winner]++;
      sets.push({ home: games.home, away: games.away });
      games.home = 0;
      games.away = 0;
    }

    const finished =
      match.status === 'live' &&
      (setsWon.home >= SETS_TO_WIN || setsWon.away >= SETS_TO_WIN);

    return {
      ...match,
      status: finished ? 'finished' : match.status,
      tennisScore: { sets, currentSet, setsWon, games },
      score: `${setsWon.home}-${setsWon.away}`
    };
  }
}