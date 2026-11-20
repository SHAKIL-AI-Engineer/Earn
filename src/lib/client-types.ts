export type RecordRow = {
  id: string;
  date: string;
  dailyProduction?: string;
  totalEarn?: string;
  netSalary?: string;
  netAmount?: string;
  updatedAt: string;
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  updatedAt?: string;
};
export type WorkspaceData = {
  workspace: {
    name: string;
    currency: string;
    timezone: string;
    openingDate: string;
    updatedAt: string;
  };
  user: User;
  period: { label: string; mode: string; start: string; end: string };
  totals: {
    totalEarn: string;
    netSalary: string;
    netAmount: string;
    totalCost: string;
    netBalance: string;
    dailyProduction: string;
    productionDays: number;
    salaryDays: number;
    cashflowDays: number;
  };
  trend: { day: string; revenue: string; costs: string }[];
  rows: RecordRow[];
  count: number;
  page: number;
  pageSize: number;
  audit: {
    id: string;
    actorName: string;
    action: string;
    entity: string;
    createdAt: string;
  }[];
};
