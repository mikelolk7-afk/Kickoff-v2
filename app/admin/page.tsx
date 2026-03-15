"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Stats {
  totalUsers: number;
  totalClubs: number;
  totalMatches: number;
  activeSeasons: number;
  recentLogins: number;
  pendingReports: number;
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonResult, setSeasonResult] = useState<string | null>(null);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session && role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, [session, router]);

  const triggerSeasonEnd = async () => {
    setSeasonLoading(true);
    setSeasonResult(null);
    try {
      const res = await fetch("/api/cron/season-end", { method: "POST" });
      const data = await res.json();
      setSeasonResult(
        res.ok ? `Success: ${JSON.stringify(data.results?.length ?? 0)} divisions processed` : `Error: ${data.error}`
      );
    } catch {
      setSeasonResult("Network error");
    }
    setSeasonLoading(false);
  };

  if (loading) {
    return <div className="text-muted">Loading admin stats...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Admin Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {stats && (
          <>
            <StatCard label="Total Users" value={stats.totalUsers} />
            <StatCard label="Total Clubs" value={stats.totalClubs} />
            <StatCard label="Matches Played" value={stats.totalMatches} />
            <StatCard label="Active Seasons" value={stats.activeSeasons} />
            <StatCard label="Logins (24h)" value={stats.recentLogins} />
            <StatCard
              label="Pending Reports"
              value={stats.pendingReports}
              highlight={stats.pendingReports > 0}
            />
          </>
        )}
      </div>

      <div className="bg-panel border border-border rounded-lg p-6">
        <h3 className="font-semibold mb-3">Season Management</h3>
        <p className="text-muted text-sm mb-4">
          Trigger season end for all divisions. This will calculate standings,
          handle promotions/relegations, and generate new seasons.
        </p>
        <button
          onClick={triggerSeasonEnd}
          disabled={seasonLoading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
        >
          {seasonLoading ? "Processing..." : "Trigger Season End"}
        </button>
        {seasonResult && (
          <p className="mt-3 text-sm text-foreground">{seasonResult}</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="bg-panel border border-border rounded-lg p-4">
      <div className="text-muted text-xs uppercase mb-1">{label}</div>
      <div
        className={`text-2xl font-bold ${highlight ? "text-red-400" : "text-white"}`}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
