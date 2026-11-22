export interface ExpenseDTO {
  id: string; title: string; category: string; amountMinor: number; currency: "BRL" | "USD";
  competenceMonth: string; paidAt: string | null; exchangeRateToBRL: string | null;
  exchangeRateDate: string | null; exchangeRateSource: string | null; convertedAmountMinor: number | null;
  seriesId: string | null; occurrenceMonth: string | null; ownerId: string; version: number;
  createdAt: string; updatedAt: string;
}
export interface ExpenseSeriesDTO {
  id: string; title: string; category: string; amountMinor: number; currency: "BRL" | "USD";
  startMonth: string; endMonth: string | null; active: boolean; ownerId: string; version: number;
  createdAt: string; updatedAt: string;
}
export interface UnavailableMetric { value: number | null; status: "available" | "unavailable" | "partial"; reason?: string }
export interface FinanceOverviewDTO {
  month: string; timezone: string; source: "platform_database"; generatedAt: string;
  paidExpenses: { amountBRLMinor: number; status: "complete" | "partial"; missingExchangeIds: string[]; count: number; unconvertedUSDMinor: number };
  revenue: UnavailableMetric; mrr: UnavailableMetric; cashResult: UnavailableMetric;
}
export interface PageDTO<T> { items: T[]; page: number; pageSize: number; total: number }
