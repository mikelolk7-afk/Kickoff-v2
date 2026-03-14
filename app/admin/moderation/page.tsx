"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  reason: string;
  messageId: string | null;
  status: string;
  resolution: string | null;
  createdAt: string;
  reportedBy: { name: string | null; email: string };
  targetUser: { name: string | null; email: string; isBanned: boolean };
}

export default function ModerationPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session && role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/moderation?status=${filter}`)
      .then((r) => r.json())
      .then((data) => setReports(data.reports))
      .finally(() => setLoading(false));
  }, [filter]);

  const handleResolve = async (reportId: string, action: string, duration?: number) => {
    await fetch("/api/admin/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, action, duration }),
    });
    // Refresh
    const res = await fetch(`/api/admin/moderation?status=${filter}`);
    const data = await res.json();
    setReports(data.reports);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Moderation</h2>

      <div className="flex gap-2 mb-4">
        {["PENDING", "ACTION_TAKEN", "DISMISSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filter === s
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-400"
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500 text-sm">No reports with status: {filter}</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-panel border border-gray-800 rounded-lg p-4"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-gray-400 text-xs">
                    Reported by: {r.reportedBy.name ?? r.reportedBy.email}
                  </span>
                  <span className="text-gray-600 mx-2">|</span>
                  <span className="text-gray-400 text-xs">
                    Target: {r.targetUser.name ?? r.targetUser.email}
                    {r.targetUser.isBanned && (
                      <span className="text-red-400 ml-1">(banned)</span>
                    )}
                  </span>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm mb-3">{r.reason}</p>
              {r.resolution && (
                <p className="text-xs text-gray-500 mb-3">
                  Resolution: {r.resolution}
                </p>
              )}
              {r.status === "PENDING" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResolve(r.id, "warn")}
                    className="text-xs px-3 py-1.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
                  >
                    Warn
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "mute", 3)}
                    className="text-xs px-3 py-1.5 bg-orange-600/20 text-orange-400 rounded hover:bg-orange-600/30"
                  >
                    Mute 3d
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "ban", 7)}
                    className="text-xs px-3 py-1.5 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                  >
                    Ban 7d
                  </button>
                  <button
                    onClick={() => handleResolve(r.id, "dismiss")}
                    className="text-xs px-3 py-1.5 bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
