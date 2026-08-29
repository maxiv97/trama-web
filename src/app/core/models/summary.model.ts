export interface SummaryKpis {
  profit: number;
  revenue: number;
  soldCount: number;
  avgTicket: number;
  pendingPayout: number;
}

export interface SummaryReport {
  current: SummaryKpis;
  previous: SummaryKpis;
}

export interface WeeklyPoint {
  weekStart: string;
  profit: number;
  soldCount: number;
}
