export type MatchFormat = '2x15' | '2x20' | '3x15' | '3x20';
export type PeriodBreak = 5 | 10;
export type MatchBreak = 5 | 10 | 15;
export type GamesPerTeam = 2 | 3 | 4 | 5 | 6 | 7;
export type CupDays = 1 | 2 | 3;
export type CourtCount = 1 | 2 | 3;

export const AVAILABLE_COURTS = ['Høyenhallen', 'Bekkelaget', 'Brynseng'] as const;

export interface Team {
  id: string;
  name: string;
}

export interface CupDaySchedule {
  date: string;
  timeFrom: string;
  timeTo: string;
}

export interface ScheduleParams {
  matchFormat: MatchFormat;
  periodBreak: PeriodBreak;
  matchBreak: MatchBreak;
  gamesPerTeam: GamesPerTeam;
  seriesPlay: boolean;
  cupDays: CupDays;
  days: CupDaySchedule[];
  courtCount: CourtCount;
  courts: string[];
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: string;
  court?: string;
  round?: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  available: boolean;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
}

export interface CupData {
  name: string;
  teamCount: number;
  teams: Team[];
  scheduleParams: ScheduleParams | null;
  matches: Match[];
  shopItems: ShopItem[];
  sponsors: Sponsor[];
}

const today = new Date().toISOString().slice(0, 10);

export const DEFAULT_SCHEDULE_PARAMS: ScheduleParams = {
  matchFormat: '2x15',
  periodBreak: 5,
  matchBreak: 10,
  gamesPerTeam: 5,
  seriesPlay: true,
  cupDays: 1,
  days: [{ date: today, timeFrom: '09:00', timeTo: '17:00' }],
  courtCount: 1,
  courts: ['Høyenhallen'],
};

export const DEFAULT_CUP: CupData = {
  name: 'Tunet Cup',
  teamCount: 4,
  teams: [],
  scheduleParams: null,
  matches: [],
  shopItems: [],
  sponsors: [],
};
