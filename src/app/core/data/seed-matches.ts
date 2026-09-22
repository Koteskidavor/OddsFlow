import { Match } from '../models/match.model';

export const SEED_MATCHES: Match[] = [
  {
    id: 'm1',
    sport: 'soccer',
    status: 'live',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    startTime: new Date(),
    score: '2-1',
    odds: { '1': 2.1, 'X': 3.4, '2': 3.1, 'over': 1.8, 'under': 1.9, 'home': 2.1, 'away': 3.1 }
  },
  {
    id: 'm2',
    sport: 'soccer',
    status: 'scheduled',
    homeTeam: 'Manchester City',
    awayTeam: 'Arsenal',
    startTime: new Date(Date.now() + 86400000),
    odds: { '1': 1.7, 'X': 3.8, '2': 4.2, 'over': 1.6, 'under': 2.1, 'home': 1.7, 'away': 4.2 }
  },
  {
    id: 'm3',
    sport: 'basketball',
    status: 'live',
    homeTeam: 'LA Lakers',
    awayTeam: 'GS Warriors',
    startTime: new Date(),
    score: '88-92',
    odds: { '1': 1.9, 'X': 0, '2': 1.9, 'over': 210.5, 'under': 210.5, 'home': 1.9, 'away': 1.9 }
  },
  {
    id: 'm4',
    sport: 'basketball',
    status: 'scheduled',
    homeTeam: 'Milwaukee Bucks',
    awayTeam: 'Boston Celtics',
    startTime: new Date(Date.now() + 172800000),
    odds: { '1': 2.2, 'X': 0, '2': 1.6, 'over': 220.0, 'under': 220.0, 'home': 2.2, 'away': 1.6 }
  },
  {
    id: 'm5',
    sport: 'tennis',
    status: 'live',
    homeTeam: 'Carlos Alcaraz',
    awayTeam: 'Novak Djokovic',
    startTime: new Date(),
    score: '6-4, 3-2',
    odds: { '1': 1.8, 'X': 0, '2': 2.0, 'over': 3.5, 'under': 3.5, 'home': 1.8, 'away': 2.0 }
  },
  {
    id: 'm6',
    sport: 'tennis',
    status: 'scheduled',
    homeTeam: 'Iga Swiatek',
    awayTeam: 'Aryna Sabalenka',
    startTime: new Date(Date.now() + 43200000),
    odds: { '1': 1.4, 'X': 0, '2': 2.8, 'over': 2.5, 'under': 2.5, 'home': 1.4, 'away': 2.8 }
  },
  {
    id: 'm7',
    sport: 'esports',
    status: 'live',
    homeTeam: 'T1',
    awayTeam: 'Gen.G',
    startTime: new Date(),
    score: '1-0',
    odds: { '1': 1.8, 'X': 0, '2': 2.0, 'over': 2.5, 'under': 2.5, 'home': 1.8, 'away': 2.0 }
  },
  {
    id: 'm8',
    sport: 'esports',
    status: 'scheduled',
    homeTeam: 'Natus Vincere',
    awayTeam: 'FaZe Clan',
    startTime: new Date(Date.now() + 86400000),
    odds: { '1': 1.6, 'X': 0, '2': 2.2, 'over': 2.5, 'under': 2.5, 'home': 1.6, 'away': 2.2 }
  }
];
console.table(SEED_MATCHES);