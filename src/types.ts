export type MatchFormat = '2x15' | '2x20' | '3x15' | '3x20';
export type PeriodBreak = 5 | 10;
export type MatchBreak = 5 | 10 | 15;
export type GamesPerTeam = 5 | 6 | 7;

export interface Team {
  id: string;
  name: string;
}

export interface ScheduleParams {
  matchFormat: MatchFormat;
  periodBreak: PeriodBreak;
  matchBreak: MatchBreak;
  startDate: string;
  timeFrom: string;
  timeTo: string;
  gamesPerTeam: GamesPerTeam;
  seriesPlay: boolean;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  startTime: string;
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

export const DEFAULT_SCHEDULE_PARAMS: ScheduleParams = {
  matchFormat: '2x15',
  periodBreak: 5,
  matchBreak: 10,
  startDate: new Date().toISOString().slice(0, 10),
  timeFrom: '09:00',
  timeTo: '17:00',
  gamesPerTeam: 5,
  seriesPlay: true,
};

export const DEFAULT_CUP: CupData = {
  name: 'Tunet Cup',
  teamCount: 8,
  teams: [],
  scheduleParams: null,
  matches: [],
  shopItems: [],
  sponsors: [],
};
