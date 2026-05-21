export type MatchFormat = '2x15' | '2x20' | '3x15' | '3x20';
export type PeriodBreak = 5 | 10;
export type MatchBreak = 5 | 10 | 15;
export type GamesPerTeam = 2 | 3 | 4 | 5 | 6 | 7;
export type CupDays = 1 | 2 | 3;
export type CourtCount = 1 | 2 | 3;
export type MatchPhase = 'group' | 'crossover' | 'quarterfinal' | 'friendly';

export const AVAILABLE_COURTS = ['Høyenhallen', 'Bekkelaget', 'Brynseng'] as const;

export interface Team {
  id: string;
  name: string;
}

export interface CourtHallTime {
  court: string;
  timeFrom: string;
  timeTo: string;
}

export interface CupDaySchedule {
  date: string;
  /** Standard halltid denne dagen (brukes som utgangspunkt for nye baner) */
  timeFrom: string;
  timeTo: string;
  /** Halltid per valgt bane – kan være ulik for hver bane */
  courtTimes?: CourtHallTime[];
}

export interface Group {
  id: string;
  name: string;
  teamIds: string[];
}

export interface ScheduleParams {
  matchFormat: MatchFormat;
  periodBreak: PeriodBreak;
  matchBreak: MatchBreak;
  gamesPerTeam: GamesPerTeam;
  /** Sluttspill Ja = gruppeserie + tabell + sluttspill. Nei = flest mulig unike motstandere. */
  seriesPlay: boolean;
  groups?: Group[];
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
  groupId?: string;
  phase?: MatchPhase;
  homeScore?: number | null;
  awayScore?: number | null;
  label?: string;
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  available: boolean;
}

export type SponsorPlacement = 'forside' | 'meny' | 'kiosk';

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  placement: SponsorPlacement;
  slogan?: string;
}

export interface NavItemConfig {
  path: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
}

export interface AppTheme {
  purple: string;
  purpleDark: string;
  purpleLight: string;
  yellow: string;
  yellowDark: string;
}

export const DEFAULT_THEME: AppTheme = {
  purple: '#503688',
  purpleDark: '#3d2a66',
  purpleLight: '#6d4fa8',
  yellow: '#f9dc00',
  yellowDark: '#e6c800',
};

export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { path: '/', label: 'Forside', icon: '⌂' },
  { path: '/kamper', label: 'Kamper', icon: '⚽' },
  { path: '/tabell', label: 'Tabell', icon: '📊' },
  { path: '/kiosk', label: 'Kiosk', icon: '🛒' },
  { path: '/admin', label: 'Admin', icon: '⚙' },
];

export const DEFAULT_SIDEBAR_LOGO = 'tunet-logo.png';

export interface PageContent {
  heroSubtitle: string;
  participantInfo: string;
  /** Logo øverst i sidemenyen (fil i public/ eller Supabase URL) */
  sidebarLogoUrl: string;
  navItems: NavItemConfig[];
  theme: AppTheme;
}

export interface CupData {
  name: string;
  teamCount: number;
  teams: Team[];
  scheduleParams: ScheduleParams | null;
  pageContent: PageContent;
  matches: Match[];
  shopItems: ShopItem[];
  sponsors: Sponsor[];
}

export const DEFAULT_PAGE_CONTENT: PageContent = {
  heroSubtitle: 'Velg ditt lag under – da vises riktige kamper og tabell i hele appen.',
  participantInfo:
    'Velkommen som deltaker på Tunet Cup!\n\n' +
    '• Møt opp i god tid før kamp\n' +
    '• Husk hvit trøye og lue\n' +
    '• Kamper og resultater finner du under «Kamper» og «Tabell»\n\n' +
    'Lykke til!',
  sidebarLogoUrl: DEFAULT_SIDEBAR_LOGO,
  navItems: DEFAULT_NAV_ITEMS,
  theme: DEFAULT_THEME,
};

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
  pageContent: DEFAULT_PAGE_CONTENT,
  matches: [],
  shopItems: [],
  sponsors: [],
};
