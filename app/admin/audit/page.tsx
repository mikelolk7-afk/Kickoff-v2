"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface AuditLog {
  id: string;
  action: string;
  target: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
  admin: { name: string | null; email: string };
}

export default function AuditLogPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session && role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/audit?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs);
        setPages(data.pages);
      })
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Audit Log</h2>

      {loading ? (
        <div className="text-gray-400">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-gray-500 text-sm">No audit logs yet.</div>
      ) : (
        <div className="bg-panel border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="text-left px-4 py-3 text-gray-400">Date</th>
                <th className="text-left px-4 py-3 text-gray-400">Admin</th>
                <th className="text-left px-4 py-3 text-gray-400">Action</th>
                <th className="text-left px-4 py-3 text-gray-400">Target</th>
                <th className="text-left px-4 py-3 text-gray-400">Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-800/50">
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {log.admin.name ?? log.admin.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-800 rounded text-xs">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                    {log.target.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.detail ? JSON.stringify(log.detail) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${
                page === i + 1
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
