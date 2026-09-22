export type SportType = 'soccer' | 'basketball' | 'tennis' | 'esports';
export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled';
export type OddsSelection = '1' | 'X' | '2' | 'over' | 'under' | 'home' | 'away';

export interface Match {
  id: string;
  sport: SportType;
  status: MatchStatus;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  score?: string;
  odds: Record<OddsSelection, number>;
}
