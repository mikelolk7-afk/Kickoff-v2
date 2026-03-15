"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isBanned: boolean;
  banReason: string | null;
  createdAt: string;
  club: { id: string; name: string } | null;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (session && role !== "admin") {
      router.push("/dashboard");
    }
  }, [session, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users);
        setTotal(data.total);
        setPages(data.pages);
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  const handleAction = async (userId: string, action: string, duration?: number) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, duration }),
    });
    // Refresh
    const res = await fetch(`/api/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setUsers(data.users);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">User Management</h2>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-md bg-surface border border-border rounded-lg px-4 py-2 text-sm"
        />
      </div>

      <div className="text-muted text-sm mb-3">{total} users total</div>

      {loading ? (
        <div className="text-muted">Loading...</div>
      ) : (
        <div className="bg-panel border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-muted">Name</th>
                <th className="text-left px-4 py-3 text-muted">Email</th>
                <th className="text-left px-4 py-3 text-muted">Club</th>
                <th className="text-left px-4 py-3 text-muted">Role</th>
                <th className="text-left px-4 py-3 text-muted">Status</th>
                <th className="text-left px-4 py-3 text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border">
                  <td className="px-4 py-3">{u.name ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">{u.club?.name ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={u.role === "admin" ? "text-red-400" : "text-muted"}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.isBanned ? (
                      <span className="text-red-400">Banned</span>
                    ) : (
                      <span className="text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    {u.isBanned ? (
                      <button
                        onClick={() => handleAction(u.id, "unban")}
                        className="text-xs px-2 py-1 bg-green-600/20 text-green-400 rounded hover:bg-green-600/30"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(u.id, "ban", 7)}
                        className="text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                      >
                        Ban 7d
                      </button>
                    )}
                    {u.role !== "admin" ? (
                      <button
                        onClick={() => handleAction(u.id, "promote")}
                        className="text-xs px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30"
                      >
                        Promote
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(u.id, "demote")}
                        className="text-xs px-2 py-1 bg-gray-600/20 text-muted rounded hover:bg-gray-600/30"
                      >
                        Demote
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded text-sm ${
                page === i + 1
                  ? "bg-primary text-white"
                  : "bg-surface text-muted"
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
