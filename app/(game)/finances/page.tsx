"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

interface FinanceData {
  budget: number;
  wageBudget: number;
  weeklyWages: number;
  weeklyFinancials: {
    matchDayIncome: number;
    sponsorIncome: number;
    totalIncome: number;
    wages: number;
    maintenance: number;
    totalExpenses: number;
    netIncome: number;
  };
  recentTransactions: Array<{
    id: string;
    type: string;
    credits: number;
    coins: number;
    description: string;
    createdAt: string;
  }>;
}

function FinanceRow({
  label,
  amount,
  isIncome,
}: {
  label: string;
  amount: number;
  isIncome?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          isIncome ? "text-green-400" : "text-red-400"
        )}
      >
        {isIncome ? "+" : "-"}€{Math.abs(amount).toLocaleString()}
      </span>
    </div>
  );
}

export default function FinancesPage() {
  const { data, isLoading } = useQuery<FinanceData>({
    queryKey: ["finances"],
    queryFn: () => fetch("/api/finances").then((r) => r.json()),
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-panel rounded w-32" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-panel rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const f = data.weeklyFinancials;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Finances</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-2">
            <Wallet size={16} />
            Budget
          </div>
          <p className="text-2xl font-bold">€{data.budget.toLocaleString()}</p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-2">
            <TrendingUp size={16} />
            Weekly Income
          </div>
          <p className="text-2xl font-bold text-green-400">
            +€{f.totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 text-muted text-sm mb-2">
            <TrendingDown size={16} />
            Weekly Expenses
          </div>
          <p className="text-2xl font-bold text-red-400">
            -€{f.totalExpenses.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Breakdown */}
        <div className="card">
          <h2 className="text-sm font-medium text-muted mb-3">Weekly Breakdown</h2>

          <p className="text-xs text-subtle uppercase mb-2">Income</p>
          <FinanceRow label="Match Day" amount={f.matchDayIncome} isIncome />
          <FinanceRow label="Sponsors" amount={f.sponsorIncome} isIncome />

          <p className="text-xs text-subtle uppercase mt-4 mb-2">Expenses</p>
          <FinanceRow label="Player Wages" amount={f.wages} />
          <FinanceRow label="Maintenance" amount={f.maintenance} />

          <div className="flex items-center justify-between pt-3 mt-3 border-t border-border">
            <span className="font-medium">Net Weekly</span>
            <span
              className={cn(
                "font-bold text-lg",
                f.netIncome >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {f.netIncome >= 0 ? "+" : ""}€{f.netIncome.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-sm font-medium text-muted mb-3">Recent Transactions</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
                <div>
                  <p className="text-foreground">{t.description}</p>
                  <p className="text-xs text-subtle">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  {t.credits !== 0 && (
                    <span className={t.credits > 0 ? "text-green-400" : "text-red-400"}>
                      {t.credits > 0 ? "+" : ""}{t.credits} credits
                    </span>
                  )}
                  {t.coins !== 0 && (
                    <span className={cn("block", t.coins > 0 ? "text-accent" : "text-red-400")}>
                      {t.coins > 0 ? "+" : ""}{t.coins} coins
                    </span>
                  )}
                </div>
              </div>
            ))}
            {data.recentTransactions.length === 0 && (
              <p className="text-subtle text-sm">No transactions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
