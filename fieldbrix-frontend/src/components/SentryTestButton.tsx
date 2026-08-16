import * as Sentry from "@sentry/react";

export function SentryTestButton() {
  const handleError = () => {
    throw new Error("This is a test error from Sentry!");
  };

  const handleBackendError = async () => {
    try {
      const response = await fetch("/debug-sentry", { method: "GET" });
      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }
    } catch (error) {
      Sentry.captureException(error);
      console.error("Backend Sentry test error triggered:", error);
    }
  };

  return (
    <div
      style={{ marginTop: "2rem", padding: "1rem", border: "1px solid #ccc" }}
    >
      <h2>Sentry Verification</h2>
      <button
        onClick={handleError}
        style={{
          padding: "0.5rem 1rem",
          marginRight: "1rem",
          backgroundColor: "#ff6b6b",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Break the world (Frontend)
      </button>
      <button
        onClick={handleBackendError}
        style={{
          padding: "0.5rem 1rem",
          backgroundColor: "#ff8c42",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Trigger Backend Error
      </button>
    </div>
  );
}
