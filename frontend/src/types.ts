export type Page = 'home' | 'invest' | 'network' | 'income' | 'fund' | 'withdraw' | 'deposit' | 'profile' | 'tasks' | 'admin';

export interface BaseProps { userId: string; user: Record<string, unknown>; }
export interface NavigableProps extends BaseProps { onNavigate: (page: Page) => void; }
export interface RefreshableProps extends BaseProps { onRefresh: () => Promise<void>; }
export interface DashboardProps extends BaseProps { onNavigate: (page: Page) => void; onRefresh: () => Promise<void>; }
export interface ProfileProps extends BaseProps { onNavigate: (page: Page) => void; onLogout: () => void; onRefresh: () => Promise<void>; }
export interface AdminProps extends BaseProps { onNavigate: (page: Page) => void; }

export interface QualificationLevel {
  code: string;
  name: string;
  description?: string;
  daily_rate: number;
  network_bonus: number;
  required_direct: number;
  required_total_team: number;
  sort_order: number;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export interface InvestmentPlan {
  id: string;
  slug: string;
  name: string;
  description?: string;
  plan_type: 'solo' | 'network';
  daily_rate: number;
  min_invest: number;
  max_invest: number;
  min_level_code: string;
  duration_days: number;
  sort_order: number;
  icon?: string;
  banner_url?: string;
  is_active?: boolean;
}

export const LEVELS: Record<string, { name: string; rate: number; color: string; members: number; bonus: number }> = {
  PRE: { name: 'Pre-Qualifica', rate: 0.8, color: 'text-base-content/60', members: 0, bonus: 0 },
  BRONZ: { name: 'Bronz', rate: 1.0, color: 'text-warning', members: 6, bonus: 10 },
  SILVER: { name: 'Silver', rate: 2.0, color: 'text-base-content', members: 36, bonus: 15 },
  SILVER_ELITE: { name: 'Silver Elite', rate: 3.0, color: 'text-info', members: 216, bonus: 20 },
  GOLD: { name: 'Gold', rate: 4.0, color: 'text-warning', members: 1296, bonus: 20 },
  ZAFFIRO: { name: 'Zaffiro', rate: 5.0, color: 'text-primary', members: 7776, bonus: 25 },
  DIAMANTE: { name: 'Diamante', rate: 6.0, color: 'text-secondary', members: 46656, bonus: 30 },
};

export function levelLabel(levelCode: string, levels?: QualificationLevel[]) {
  return levels?.find((l) => l.code === levelCode)?.name || LEVELS[levelCode]?.name || levelCode;
}
