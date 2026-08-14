import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.tsx";
import { initializeSentry } from "./observability/sentry.ts";

initializeSentry();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main role="alert">FieldBrix could not load. Please refresh.</main>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
