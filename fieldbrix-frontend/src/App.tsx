import "./App.css";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

const api = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
type Tenant = { id: string; name: string; status: string; timezone: string; users: number; branches: number };
type Role = { id: string; name: string; permissions: string[]; preset: boolean };

function App() {
  const [token, setToken] = useState(localStorage.getItem("fieldbrix_token") ?? "");
  const [email, setEmail] = useState("admin@fieldbrix.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const request = async (path: string, options: RequestInit = {}) => { const response = await fetch(`${api}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? "Request failed"); return body.data; };
  useEffect(() => { if (token) { Promise.all([request("/platform/tenants"), request("/roles")]).then(([nextTenants, nextRoles]) => { setTenants(nextTenants); setRoles(nextRoles); }).catch((reason: Error) => setError(reason.message)); } }, [token]);
  const login = async (event: FormEvent) => { event.preventDefault(); try { const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ identifier: email, password }) }); localStorage.setItem("fieldbrix_token", result.accessToken); setToken(result.accessToken); } catch (reason) { setError((reason as Error).message); } };
  if (!token) return <main className="login"><form onSubmit={login}><p className="eyebrow">FieldBrix platform</p><h1>Sign in</h1><label>Email or user ID<input value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <p className="error" role="alert">{error}</p>}<button type="submit">Sign in</button><small>Local demo: admin@fieldbrix.local / ChangeMe123!</small></form></main>;

  return (
    <main className="console"><header><div><p className="eyebrow">FieldBrix platform</p><h1>Administration</h1></div><button onClick={() => { localStorage.removeItem("fieldbrix_token"); setToken(""); }}>Sign out</button></header><section className="grid"><article><h2>Tenants</h2><p className="muted">Provisioning and lifecycle status</p>{tenants.map((tenant) => <div className="row" key={tenant.id}><span><strong>{tenant.name}</strong><small>{tenant.timezone} · {tenant.users} users · {tenant.branches} branches</small></span><span className={`pill ${tenant.status.toLowerCase()}`}>{tenant.status}</span></div>)}</article><article><h2>Roles & capabilities</h2><p className="muted">Default-deny, additive grants</p>{roles.map((role) => <div className="row" key={role.id}><span><strong>{role.name}</strong><small>{role.permissions.length} permissions</small></span><span className="pill">{role.preset ? "Preset" : "Custom"}</span></div>)}</article></section>{error && <p className="error">{error}</p>}</main>
  );
}

export default App;
