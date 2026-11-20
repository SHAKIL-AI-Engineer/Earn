export type RecordRow = {
  id: string;
  date?: string;
  description?: string;
  amount?: string;
  paidOn?: string | null;
  quantity?: string;
  unitRate?: string;
  unit?: string;
  notes?: string;
  category?: string;
  daysWorked?: string;
  dailyRate?: string;
  employeeId?: string;
  employee?: { name: string; code: string };
  direction?: string;
  source?: string;
  name?: string;
  position?: string;
  code?: string;
  active?: boolean;
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
    openingCash: string;
    openingDate: string;
    updatedAt: string;
  };
  user: User;
  period: { label: string; mode: string; start: string; end: string };
  totals: Record<string, string> & { activeEmployees: number };
  trend: { day: string; revenue: string; costs: string }[];
  breakdown: { category: string; amount: string }[];
  rows: RecordRow[];
  employees: RecordRow[];
  count: number;
  page: number;
  audit: {
    id: string;
    actorName: string;
    action: string;
    entity: string;
    createdAt: string;
  }[];
};
