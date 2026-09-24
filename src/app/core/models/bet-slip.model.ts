import { OddsSelection } from './match.model';

export interface BetSlipItem {
  matchId: string;
  selection: OddsSelection;
  odds: number;
  stake: number;
  potentialPayout: number;
}