export type LiveEventType = 'ODDS_UPDATE' | 'SCORE_UPDATE' | 'STATUS_CHANGE';

export interface OddsUpdateEvent {
  type: 'ODDS_UPDATE';
  matchId: string;
  selection: string;
  newOdds: number;
}

export interface ScoreUpdateEvent {
  type: 'SCORE_UPDATE';
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export interface StatusChangeEvent {
  type: 'STATUS_CHANGE';
  matchId: string;
  oldStatus: string;
  newStatus: string;
}

export type LiveEvent = OddsUpdateEvent | ScoreUpdateEvent | StatusChangeEvent;
