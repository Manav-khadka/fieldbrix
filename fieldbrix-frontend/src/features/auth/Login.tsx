import { useState } from "react";
import type { FormEvent } from "react";
import type { LoginProps } from "./types";

export function Login({
  identifier,
  password,
  setIdentifier,
  setPassword,
  onSubmit,
  error,
  busy,
  onForgot,
}: LoginProps) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState(identifier);
  const [forgotMessage, setForgotMessage] = useState("");

  const submitForgot = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onForgot(forgotIdentifier);
      setForgotMessage(
        "If the account exists, reset instructions have been queued.",
      );
    } catch (reason) {
      setForgotMessage(
        reason instanceof Error ? reason.message : "Unable to request a reset",
      );
    }
  };

  return (
    <main className="login-page">
      <div className="login-visual">
        <span className="eyebrow light">FIELD OPERATIONS / 01</span>
        <h1>
          Make every
          <br />
          <em>move count.</em>
        </h1>
        <p>
          One calm command center for the people, places, and work that keep
          your operation moving.
        </p>
        <div className="quote">
          “The clearest view of our operation we’ve ever had.”
          <small>— Operations team, Muscat</small>
        </div>
      </div>
      <div className="login-panel">
        <div className="brand dark">
          <span className="brand-mark">F</span>
          <span>
            fieldbrix<small>operations cloud</small>
          </span>
        </div>
        <form onSubmit={onSubmit}>
          <p className="eyebrow accent">WELCOME BACK</p>
          <h2>Sign in to your workspace</h2>
          <p className="form-copy">
            Use your workforce email or user ID to continue.
          </p>
          <label>
            Email or user ID
            <input
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button full" disabled={busy}>
            {busy ? "Signing in…" : "Continue to workspace"}
            <span>→</span>
          </button>
          <button
            type="button"
            className="link-button"
            onClick={() => setForgotOpen((open) => !open)}
          >
            Forgot password?
          </button>
          {forgotOpen && (
            <div className="forgot-form">
              <label>
                Account email or user ID
                <input
                  value={forgotIdentifier}
                  onChange={(event) => setForgotIdentifier(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="secondary-button"
                onClick={(e) => void submitForgot(e)}
              >
                Send reset instructions
              </button>
              {forgotMessage && (
                <small className="form-copy">{forgotMessage}</small>
              )}
            </div>
          )}
        </form>
        <small className="login-foot">
          Protected by FieldBrix identity · v0.0.1
        </small>
      </div>
    </main>
  );
}
