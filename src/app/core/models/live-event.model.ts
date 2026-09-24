import { OddsSelection, MatchStatus } from './match.model';

export interface OddsUpdateEvent {
  type: 'ODDS_UPDATE';
  matchId: string;
  selection: OddsSelection;
  newOdds: number;
}

export interface ScoreUpdateEvent {
  type: 'SCORE_UPDATE';
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface TennisScoreUpdateEvent {
  type: 'TENNIS_SCORE_UPDATE';
  matchId: string;
  tennisUpdate: { home: string; away: string };
}

export interface StatusChangeEvent {
  type: 'STATUS_CHANGE';
  matchId: string;
  oldStatus: MatchStatus;
  newStatus: MatchStatus;
}

export type LiveEvent = OddsUpdateEvent | ScoreUpdateEvent | TennisScoreUpdateEvent | StatusChangeEvent;