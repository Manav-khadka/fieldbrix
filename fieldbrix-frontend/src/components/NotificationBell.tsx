import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt?: string;
  createdAt: string;
}

interface NotificationResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery<NotificationResponse>({
    queryKey: ["notifications"],
    queryFn: () => api.get<NotificationResponse>("/notifications"),
    refetchInterval: 30000,
  });

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const markAllReadMutation = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        id="notification-bell-btn"
        className="fb-btn fb-btn--ghost"
        style={{ position: "relative", padding: "6px 10px" }}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              background: "#ef4444",
              color: "#fff",
              borderRadius: "9999px",
              padding: "2px 6px",
              fontSize: "10px",
              fontWeight: 700,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "8px",
            width: "320px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
            zIndex: 1000,
            padding: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
              borderBottom: "1px solid #f1f5f9",
              paddingBottom: "6px",
            }}
          >
            <strong style={{ fontSize: "14px" }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                className="fb-btn fb-btn--ghost"
                style={{ fontSize: "11px", padding: "2px 6px" }}
                onClick={() => markAllReadMutation.mutate()}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {items.length === 0 && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  padding: "12px 0",
                  textAlign: "center",
                }}
              >
                No new notifications
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #f8fafc",
                  background: n.readAt ? "transparent" : "#f0f9ff",
                  borderRadius: "4px",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "12px" }}>
                  {n.title}
                </div>
                <div style={{ fontSize: "12px", color: "#334155" }}>
                  {n.message}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "#94a3b8",
                    marginTop: "2px",
                  }}
                >
                  {new Date(n.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
