"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown> | null;
  createdAt: string;
}

interface NotificationPrefs {
  matchResults: boolean;
  transfers: boolean;
  scouting: boolean;
  upgrades: boolean;
  cup: boolean;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    prefs: NotificationPrefs;
  }>({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
  });

  const markReadMut = useMutation({
    mutationFn: (notificationId: string) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllReadMut = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const updatePrefsMut = useMutation({
    mutationFn: (prefs: Partial<NotificationPrefs>) =>
      fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const notifications = data?.notifications ?? [];
  const prefs = data?.prefs;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Notifications
          {(data?.unreadCount ?? 0) > 0 && (
            <span className="ml-2 text-sm font-normal bg-primary/15 text-primary px-2 py-0.5 rounded-full">
              {data?.unreadCount} unread
            </span>
          )}
        </h1>
        {(data?.unreadCount ?? 0) > 0 && (
          <button
            onClick={() => markAllReadMut.mutate()}
            className="text-sm text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-panel rounded-lg border border-gray-800 divide-y divide-gray-800">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No notifications yet.
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              className={`px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-gray-800/30 ${
                !notif.isRead ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                if (!notif.isRead) markReadMut.mutate(notif.id);
              }}
            >
              {!notif.isRead && (
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{notif.title}</div>
                <div className="text-gray-400 text-sm">{notif.body}</div>
                <div className="text-gray-600 text-xs mt-1">
                  {new Date(notif.createdAt).toLocaleDateString()} at{" "}
                  {new Date(notif.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Preferences */}
      {prefs && (
        <div className="bg-panel rounded-lg border border-gray-800 p-6">
          <h3 className="font-semibold mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            {(
              [
                { key: "matchResults", label: "Match Results" },
                { key: "transfers", label: "Transfer Offers" },
                { key: "scouting", label: "Scout Reports" },
                { key: "upgrades", label: "Upgrade Completions" },
                { key: "cup", label: "Cup Draws & Results" },
              ] as const
            ).map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between cursor-pointer"
              >
                <span className="text-sm">{label}</span>
                <button
                  onClick={() =>
                    updatePrefsMut.mutate({ [key]: !prefs[key] })
                  }
                  className={`w-10 h-5 rounded-full transition-colors ${
                    prefs[key] ? "bg-primary" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform mx-0.5 ${
                      prefs[key] ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
