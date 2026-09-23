export type TrendDirection = 'up' | 'down' | 'neutral';

export interface TrendInfo {
  direction: TrendDirection;
  timestamp: number;
}