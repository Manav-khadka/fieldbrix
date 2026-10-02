import { useState } from "react";
import type React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Login } from "./Login";
import { useAuthStore } from "../../store/auth.store";

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:3000";

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [identifier, setIdentifier] = useState("admin@fieldbrix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? "Login failed");
      }
      const body = (await res.json()) as {
        data?: { accessToken?: string; refreshToken?: string; token?: string };
        accessToken?: string;
        token?: string;
      };
      const token =
        body?.data?.accessToken ??
        body?.data?.token ??
        body?.accessToken ??
        body?.token ??
        "";
      if (!token) {
        throw new Error("No authentication token returned from server");
      }
      
      const refreshToken = body?.data?.refreshToken;
      setAuth(token, refreshToken);

      await navigate({ to: "/" });
    } catch (err) {
      setError((err as Error).message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (forgottenIdentifier: string) => {
    await fetch(`${API_BASE}/auth/password/forgot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "idempotency-key": crypto.randomUUID(),
      },
      body: JSON.stringify({ identifier: forgottenIdentifier }),
    });
  };

  return (
    <Login
      identifier={identifier}
      password={password}
      setIdentifier={setIdentifier}
      setPassword={setPassword}
      onSubmit={(e) => void handleLogin(e)}
      error={error}
      busy={loading}
      onForgot={forgotPassword}
    />
  );
}
