export type SportType = 'soccer' | 'basketball' | 'tennis' | 'hockey' | 'esports';
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
  tennisScore?: {
    sets: { home: number; away: number }[];
    currentSet: { home: string; away: string };
    setsWon: { home: number; away: number };
    games: { home: number; away: number };
  };
  odds: Record<OddsSelection, number>;
}
